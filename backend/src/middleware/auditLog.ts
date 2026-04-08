import { Request, Response, NextFunction } from 'express';
import { Prisma } from '@prisma/client';
import prisma from '../lib/prisma';
import { logger } from '../lib/logger';

const WRITE_METHODS = new Set(['POST', 'PUT', 'DELETE', 'PATCH']);

/**
 * Middleware that logs write operations to the AuditLog table.
 * Runs asynchronously and does not block the response.
 * Logs: userId, action (METHOD:path), resource (first segment after /api/v1/),
 * resourceId (second segment), ipAddress.
 */
export const auditLog = (req: Request, res: Response, next: NextFunction): void => {
  if (!WRITE_METHODS.has(req.method)) {
    next();
    return;
  }

  // Capture original JSON to log request body as newValues
  const originalJson = res.json.bind(res);
  let responseBody: unknown = undefined;

  res.json = function (body: unknown) {
    responseBody = body;
    return originalJson(body);
  };

  // Log after the response is sent
  res.on('finish', () => {
    setImmediate(async () => {
      try {
        const userId = req.user?.id ?? null;
        const method = req.method;
        const urlPath = req.path;
        const action = `${method}:${urlPath}`;

        // Extract resource from path: /api/v1/{resource}/{resourceId}/...
        const pathSegments = urlPath.replace(/^\/api\/v1\//, '').split('/').filter(Boolean);
        const resource = pathSegments[0] ?? 'unknown';
        const resourceId = pathSegments[1] ?? null;

        const ipAddress =
          (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
          req.ip ||
          null;

        await prisma.auditLog.create({
          data: {
            userId,
            action,
            resource,
            resourceId,
            newValues: req.body && Object.keys(req.body).length > 0
              ? (req.body as Prisma.InputJsonValue)
              : undefined,
            ipAddress,
          },
        });
      } catch (err) {
        // Never block the app due to audit log failures
        logger.error('AuditLog middleware: Failed to write audit log', err);
      }
    });
  });

  next();
};

export default auditLog;
