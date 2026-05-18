// src/lib/observability.ts

/**
 * Core observability and error tracking layer.
 * For MVP, this handles structured logging and captures errors locally.
 * Can be easily integrated with Sentry or Datadog in production.
 */

type LogLevel = "info" | "warn" | "error" | "debug";

export const logger = {
    log: (level: LogLevel, message: string, meta?: any) => {
        const timestamp = new Date().toISOString();
        const payload = { timestamp, level, message, ...meta };

        if (process.env.NODE_ENV !== "production") {
            switch (level) {
                case "error": console.error(message, meta); break;
                case "warn": console.warn(message, meta); break;
                case "info": console.info(message, meta); break;
                default: console.log(message, meta); break;
            }
        } else {
            // In production, format nicely for external aggregators (like ELK/Datadog)
            console.log(JSON.stringify(payload));
        }
    },

    info: (message: string, meta?: any) => logger.log("info", message, meta),
    warn: (message: string, meta?: any) => logger.log("warn", message, meta),
    error: (error: Error | string, meta?: any) => {
        const message = error instanceof Error ? error.message : error;
        const stack = error instanceof Error ? error.stack : undefined;
        logger.log("error", message, { ...meta, stack });
    },
    debug: (message: string, meta?: any) => logger.log("debug", message, meta),
};
