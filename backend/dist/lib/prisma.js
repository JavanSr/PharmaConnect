"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.prisma = void 0;
const client_1 = require("@prisma/client");
const logger_1 = require("./logger");
const createPrismaClient = () => {
    return new client_1.PrismaClient({
        log: [
            {
                emit: 'event',
                level: 'query',
            },
            {
                emit: 'event',
                level: 'error',
            },
            {
                emit: 'event',
                level: 'warn',
            },
        ],
    });
};
// Singleton pattern to prevent multiple connections in development (hot reload)
const prisma = globalThis.__prisma ?? createPrismaClient();
exports.prisma = prisma;
if (process.env.NODE_ENV !== 'production') {
    globalThis.__prisma = prisma;
}
// Attach event listeners
prisma.$on('query', (e) => {
    if (process.env.NODE_ENV === 'development') {
        logger_1.logger.debug(`Prisma Query: ${e.query} — ${e.duration}ms`);
    }
});
prisma.$on('error', (e) => {
    logger_1.logger.error(`Prisma Error: ${e.message}`);
});
prisma.$on('warn', (e) => {
    logger_1.logger.warn(`Prisma Warning: ${e.message}`);
});
exports.default = prisma;
//# sourceMappingURL=prisma.js.map