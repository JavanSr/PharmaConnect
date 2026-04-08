import { RequestHandler } from 'express';
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
export declare const authorize: (roles: UserRole[]) => RequestHandler;
export default authorize;
//# sourceMappingURL=authorize.d.ts.map