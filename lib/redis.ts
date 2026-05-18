// src/lib/redis.ts

/**
 * Redis Connection Module
 * 
 * In MVP, if REDIS_URL is not provided, this safely falls back to an in-memory cache mock
 * to prevent the app from crashing in environments without Redis deployments.
 */

class MockRedis {
    private cache = new Map<string, { value: any; expiry: number | null }>();

    async get(key: string) {
        const item = this.cache.get(key);
        if (!item) return null;
        if (item.expiry && Date.now() > item.expiry) {
            this.cache.delete(key);
            return null;
        }
        return item.value;
    }

    async set(key: string, value: any, options?: { ex?: number }) {
        const expiry = options?.ex ? Date.now() + options.ex * 1000 : null;
        this.cache.set(key, { value, expiry });
        return "OK";
    }

    async del(key: string) {
        this.cache.delete(key);
    }
}

export const redis = process.env.REDIS_URL
    ? new MockRedis() // TODO: Swap with actual Redis client (e.g. ioredis or upstash) when REDIS_URL is deployed
    : new MockRedis();
