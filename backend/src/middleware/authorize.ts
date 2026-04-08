import { Request, Response, NextFunction, RequestHandler } from 'express';
import { UserRole } from '@prisma/client';

/**
 * Role-based authorization middleware factory.
 * Returns a RequestHandler that checks if the authenticated user's role
 * is in the allowed roles array. Returns 403 if not authorized.
 *
 * Must be used AFTER the authenticate middleware.
 *
 * @param roles - Array of UserRole values that are permitted to access the route
 */
export const authorize = (roles: UserRole[]): RequestHandler => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: 'Authentication required.',
      });
      return;
    }

    if (!roles.includes(req.user.role)) {
      res.status(403).json({
        success: false,
        error: 'You do not have permission to access this resource.',
        required: roles,
        current: req.user.role,
      });
      return;
    }

    next();
  };
};

export default authorize;
