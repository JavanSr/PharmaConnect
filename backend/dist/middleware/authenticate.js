"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authenticate = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const logger_1 = require("../lib/logger");
function getPublicKey() {
    const publicKey = process.env.JWT_PUBLIC_KEY;
    if (!publicKey) {
        throw new Error('JWT_PUBLIC_KEY environment variable is not set');
    }
    // Handle newlines encoded as literal \n in env vars
    return publicKey.replace(/\\n/g, '\n');
}
const authenticate = (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        res.status(401).json({
            success: false,
            error: 'Authentication required. Please provide a Bearer token.',
        });
        return;
    }
    const token = authHeader.substring(7); // Remove "Bearer " prefix
    try {
        const publicKey = getPublicKey();
        const decoded = jsonwebtoken_1.default.verify(token, publicKey, {
            algorithms: ['RS256'],
        });
        req.user = {
            id: decoded.sub,
            email: decoded.email,
            role: decoded.role,
            pharmacyId: decoded.pharmacyId,
        };
        next();
    }
    catch (err) {
        if (err instanceof jsonwebtoken_1.default.TokenExpiredError) {
            res.status(401).json({
                success: false,
                error: 'Token has expired. Please refresh your session.',
                code: 'TOKEN_EXPIRED',
            });
            return;
        }
        if (err instanceof jsonwebtoken_1.default.JsonWebTokenError) {
            res.status(401).json({
                success: false,
                error: 'Invalid token. Please log in again.',
                code: 'TOKEN_INVALID',
            });
            return;
        }
        logger_1.logger.error('Authentication middleware error:', err);
        res.status(401).json({
            success: false,
            error: 'Authentication failed.',
        });
    }
};
exports.authenticate = authenticate;
exports.default = exports.authenticate;
//# sourceMappingURL=authenticate.js.map