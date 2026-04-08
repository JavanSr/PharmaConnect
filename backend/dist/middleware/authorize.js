"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.authorize = void 0;
/**
 * Role-based authorization middleware factory.
 * Returns a RequestHandler that checks if the authenticated user's role
 * is in the allowed roles array. Returns 403 if not authorized.
 *
 * Must be used AFTER the authenticate middleware.
 *
 * @param roles - Array of UserRole values that are permitted to access the route
 */
const authorize = (roles) => {
    return (req, res, next) => {
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
exports.authorize = authorize;
exports.default = exports.authorize;
//# sourceMappingURL=authorize.js.map