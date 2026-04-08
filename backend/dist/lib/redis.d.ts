import Redis from 'ioredis';
declare global {
    var __redis: Redis | undefined;
}
export declare const redisClient: Redis;
export default redisClient;
//# sourceMappingURL=redis.d.ts.map