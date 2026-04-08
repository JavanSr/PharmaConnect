"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.redisClient = void 0;
const ioredis_1 = __importDefault(require("ioredis"));
const logger_1 = require("./logger");
const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';
const createRedisClient = () => {
    const client = new ioredis_1.default(REDIS_URL, {
        maxRetriesPerRequest: 3,
        enableReadyCheck: true,
        retryStrategy(times) {
            const delay = Math.min(times * 100, 3000);
            if (times > 10) {
                logger_1.logger.error(`Redis: Unable to connect after ${times} attempts. Giving up.`);
                return null; // stop retrying
            }
            logger_1.logger.warn(`Redis: Reconnecting attempt ${times} in ${delay}ms`);
            return delay;
        },
        reconnectOnError(err) {
            const targetErrors = ['READONLY', 'ECONNRESET', 'ECONNREFUSED'];
            if (targetErrors.some((e) => err.message.includes(e))) {
                return 2; // reconnect and resend the failed command
            }
            return false;
        },
    });
    client.on('connect', () => {
        logger_1.logger.info('Redis: Connected successfully');
    });
    client.on('ready', () => {
        logger_1.logger.info('Redis: Client ready');
    });
    client.on('error', (err) => {
        logger_1.logger.error(`Redis Error: ${err.message}`);
    });
    client.on('close', () => {
        logger_1.logger.warn('Redis: Connection closed');
    });
    client.on('reconnecting', (delay) => {
        logger_1.logger.info(`Redis: Reconnecting in ${delay}ms`);
    });
    client.on('end', () => {
        logger_1.logger.warn('Redis: Connection ended');
    });
    return client;
};
exports.redisClient = globalThis.__redis ?? createRedisClient();
if (process.env.NODE_ENV !== 'production') {
    globalThis.__redis = exports.redisClient;
}
exports.default = exports.redisClient;
//# sourceMappingURL=redis.js.map