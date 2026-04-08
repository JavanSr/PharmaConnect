"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.app = void 0;
const express_1 = __importDefault(require("express"));
const helmet_1 = __importDefault(require("helmet"));
const cors_1 = __importDefault(require("cors"));
const rateLimiter_1 = require("./middleware/rateLimiter");
const auditLog_1 = require("./middleware/auditLog");
const logger_1 = require("./lib/logger");
const auth_routes_1 = __importDefault(require("./modules/auth/auth.routes"));
const inventory_routes_1 = __importDefault(require("./modules/inventory/inventory.routes"));
const compliance_routes_1 = __importDefault(require("./modules/compliance/compliance.routes"));
const patients_routes_1 = __importDefault(require("./modules/patients/patients.routes"));
const nhif_routes_1 = __importDefault(require("./modules/nhif/nhif.routes"));
const cpd_routes_1 = __importDefault(require("./modules/cpd/cpd.routes"));
const knowledge_routes_1 = __importDefault(require("./modules/knowledge/knowledge.routes"));
const analytics_routes_1 = __importDefault(require("./modules/analytics/analytics.routes"));
const jobs_1 = require("./jobs");
const app = (0, express_1.default)();
exports.app = app;
// ─── Trust Proxy ──────────────────────────────────────────────────────────────
// Required for express-rate-limit to work correctly behind a reverse proxy
app.set('trust proxy', 1);
// ─── Security Middleware ──────────────────────────────────────────────────────
app.use((0, helmet_1.default)({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            imgSrc: ["'self'", 'data:', 'https:'],
            connectSrc: ["'self'"],
            fontSrc: ["'self'"],
            objectSrc: ["'none'"],
            mediaSrc: ["'self'"],
            frameSrc: ["'none'"],
        },
    },
    crossOriginEmbedderPolicy: false,
}));
app.use((0, cors_1.default)({
    origin: (origin, callback) => {
        // Allow requests with no origin (e.g., mobile apps, Postman, curl)
        if (!origin)
            return callback(null, true);
        // In development allow any localhost origin regardless of port
        if (process.env.NODE_ENV !== 'production' && origin.startsWith('http://localhost')) {
            return callback(null, true);
        }
        const allowedOrigin = process.env.FRONTEND_URL || 'http://localhost:5173';
        if (origin === allowedOrigin) {
            callback(null, true);
        }
        else {
            callback(new Error(`CORS: Origin ${origin} not allowed`));
        }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    exposedHeaders: ['X-RateLimit-Limit', 'X-RateLimit-Remaining', 'X-RateLimit-Reset'],
}));
// ─── Body Parsing ─────────────────────────────────────────────────────────────
app.use(express_1.default.json({ limit: '10mb' }));
app.use(express_1.default.urlencoded({ extended: true, limit: '10mb' }));
// ─── Static File Serving (uploaded documents) ─────────────────────────────────
app.use('/uploads', express_1.default.static('uploads'));
// ─── Global Rate Limiter ──────────────────────────────────────────────────────
app.use('/api/', rateLimiter_1.apiRateLimiter);
// ─── Audit Logging Middleware ─────────────────────────────────────────────────
app.use('/api/', auditLog_1.auditLog);
// ─── Health Check ─────────────────────────────────────────────────────────────
app.get('/health', (_req, res) => {
    res.status(200).json({
        success: true,
        status: 'healthy',
        service: 'pharmaconnect-backend',
        version: process.env.npm_package_version || '1.0.0',
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || 'development',
    });
});
// ─── API Routes ───────────────────────────────────────────────────────────────
app.use('/api/v1/auth', auth_routes_1.default);
app.use('/api/v1/knowledge', knowledge_routes_1.default);
app.use('/api/v1/inventory', inventory_routes_1.default);
app.use('/api/v1/compliance', compliance_routes_1.default);
app.use('/api/v1/patients', patients_routes_1.default);
app.use('/api/v1/nhif', nhif_routes_1.default);
app.use('/api/v1/cpd', cpd_routes_1.default);
app.use('/api/v1/analytics', analytics_routes_1.default);
// Waitlist signup (public)
app.post('/api/v1/waitlist', async (req, res) => {
    try {
        const { email, module: mod, phase } = req.body;
        if (!email || !mod || !phase) {
            res.status(400).json({ success: false, error: 'email, module, phase required' });
            return;
        }
        const { prisma } = await Promise.resolve().then(() => __importStar(require('./lib/prisma')));
        const signup = await prisma.waitlistSignup.create({ data: { email, module: mod, phase: parseInt(phase) } });
        res.status(201).json({ success: true, data: signup });
    }
    catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});
// ─── 404 Handler ─────────────────────────────────────────────────────────────
app.use((_req, res) => {
    res.status(404).json({
        success: false,
        error: 'The requested endpoint does not exist.',
    });
});
// ─── Global Error Handler ─────────────────────────────────────────────────────
// eslint-disable-next-line @typescript-eslint/no-unused-vars
app.use((err, req, res, _next) => {
    const isDev = process.env.NODE_ENV === 'development';
    logger_1.logger.error(`Unhandled error on ${req.method} ${req.path}: ${err.message}`, {
        stack: err.stack,
        ip: req.ip,
    });
    if (err.message.includes('CORS')) {
        res.status(403).json({
            success: false,
            error: 'CORS policy violation.',
        });
        return;
    }
    res.status(500).json({
        success: false,
        error: 'An unexpected internal server error occurred.',
        ...(isDev && { details: err.message, stack: err.stack }),
    });
});
// ─── Server Startup ───────────────────────────────────────────────────────────
const PORT = parseInt(process.env.PORT || '5174', 10);
const startServer = async () => {
    try {
        const server = app.listen(PORT, () => {
            logger_1.logger.info(`PharmaConnect API server running on port ${PORT} (${process.env.NODE_ENV || 'development'})`);
        });
        // Initialize scheduled jobs
        if (process.env.NODE_ENV !== 'test') {
            (0, jobs_1.initJobs)();
        }
        // Graceful shutdown
        const shutdown = async (signal) => {
            logger_1.logger.info(`${signal} received. Shutting down gracefully...`);
            server.close(async () => {
                logger_1.logger.info('HTTP server closed');
                try {
                    const { prisma } = await Promise.resolve().then(() => __importStar(require('./lib/prisma')));
                    await prisma.$disconnect();
                    logger_1.logger.info('Prisma disconnected');
                }
                catch (err) {
                    logger_1.logger.error('Error disconnecting Prisma:', err);
                }
                try {
                    const { redisClient } = await Promise.resolve().then(() => __importStar(require('./lib/redis')));
                    await redisClient.quit();
                    logger_1.logger.info('Redis disconnected');
                }
                catch (err) {
                    logger_1.logger.error('Error disconnecting Redis:', err);
                }
                logger_1.logger.info('Shutdown complete');
                process.exit(0);
            });
            // Force shutdown after 30s
            setTimeout(() => {
                logger_1.logger.error('Forced shutdown after timeout');
                process.exit(1);
            }, 30000);
        };
        process.on('SIGTERM', () => shutdown('SIGTERM'));
        process.on('SIGINT', () => shutdown('SIGINT'));
        process.on('uncaughtException', (err) => {
            logger_1.logger.error('Uncaught Exception:', err);
            process.exit(1);
        });
        process.on('unhandledRejection', (reason) => {
            logger_1.logger.error('Unhandled Rejection:', reason);
            process.exit(1);
        });
    }
    catch (err) {
        logger_1.logger.error('Failed to start server:', err);
        process.exit(1);
    }
};
// Only start the server when this file is run directly (not when imported for testing)
if (require.main === module) {
    startServer();
}
exports.default = app;
//# sourceMappingURL=server.js.map