import type { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';

export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  if (err instanceof ZodError) {
    res.status(400).json({
      error: 'Validation error',
      details: err.flatten().fieldErrors,
    });
    return;
  }

  if (err instanceof Error) {
    // Prisma unique constraint
    if ((err as any).code === 'P2002') {
      res.status(409).json({ error: 'A record with this value already exists' });
      return;
    }
    // Prisma not found
    if ((err as any).code === 'P2025') {
      res.status(404).json({ error: 'Record not found' });
      return;
    }

    const status = typeof (err as any).status === 'number' ? (err as any).status : null;
    const errorCode = typeof (err as any).code === 'string' ? (err as any).code : null;
    if (status) {
      console.error('[HandledError]', err.message);
      res.status(status).json({
        error: errorCode || err.message,
        message: err.message,
        ...(process.env.NODE_ENV === 'production' ? {} : Object.fromEntries(
          Object.entries(err as any).filter(([key]) => !['name', 'message', 'stack'].includes(key)),
        )),
      });
      return;
    }

    console.error('[Error]', err.message, err.stack);
    res.status(500).json({
      error: process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message,
    });
    return;
  }

  res.status(500).json({ error: 'Internal server error' });
}

export function notFound(_req: Request, res: Response): void {
  res.status(404).json({ error: 'Route not found' });
}
