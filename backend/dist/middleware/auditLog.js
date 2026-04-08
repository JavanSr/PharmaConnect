"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.auditLog = void 0;
const prisma_1 = __importDefault(require("../lib/prisma"));
const logger_1 = require("../lib/logger");
const WRITE_METHODS = new Set(['POST', 'PUT', 'DELETE', 'PATCH']);
/**
 * Middleware that logs write operations to the AuditLog table.
 * Runs asynchronously and does not block the response.
 * Logs: userId, action (METHOD:path), resource (first segment after /api/v1/),
 * resourceId (second segment), ipAddress.
 */
const auditLog = (req, res, next) => {
    if (!WRITE_METHODS.has(req.method)) {
        next();
        return;
    }
    // Capture original JSON to log request body as newValues
    const originalJson = res.json.bind(res);
    let responseBody = undefined;
    res.json = function (body) {
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
                const ipAddress = req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
                    req.ip ||
                    null;
                await prisma_1.default.auditLog.create({
                    data: {
                        userId,
                        action,
                        resource,
                        resourceId,
                        newValues: req.body && Object.keys(req.body).length > 0
                            ? req.body
                            : undefined,
                        ipAddress,
                    },
                });
            }
            catch (err) {
                // Never block the app due to audit log failures
                logger_1.logger.error('AuditLog middleware: Failed to write audit log', err);
            }
        });
    });
    next();
};
exports.auditLog = auditLog;
exports.default = exports.auditLog;
//# sourceMappingURL=auditLog.js.map