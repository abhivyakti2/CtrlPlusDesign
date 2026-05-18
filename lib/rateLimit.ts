// src/lib/rateLimit.ts

import { redis } from "./redis";

/**
 * A basic rate limiter backing onto our Redis layer.
 * Enforces API rate limits.
 */
export async function checkRateLimit(
    identifier: string,
    limit: number,
    windowInSecs: number
): Promise<{ success: boolean; limit: number; remaining: number }> {
    try {
        const currentCount = ((await redis.get(`rate_limit:${identifier}`)) as number) || 0;

        if (currentCount >= limit) {
            return { success: false, limit, remaining: 0 };
        }

        await redis.set(`rate_limit:${identifier}`, currentCount + 1, { ex: windowInSecs });

        return {
            success: true,
            limit,
            remaining: limit - currentCount - 1,
        };
    } catch (error) {
        // If Redis fails, we should arguably let the request pass instead of failing the app for MVP.
        console.error("Rate limiting error:", error);
        return { success: true, limit, remaining: 99 };
    }
}
