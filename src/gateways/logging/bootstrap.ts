import { Logger } from "../../api/logger.js";
import type { GatewayBootstrapContext } from "../shared.js";

/**
 * Standard gateway bootstrap entry point for structured application logging.
 * Creates a Logger instance from environment variables, contributes:
 *
 *   logging:logger  — the full Logger instance
 *   logging:log     — a plain function compatible with BootstrapLog, used by
 *                     the gateway bootstrapper to attach ctx.log after this
 *                     gateway initializes
 *
 * This gateway is marked required: true in its manifest so core refuses to
 * start if it fails to initialize.
 */
export async function bootstrap(ctx: GatewayBootstrapContext): Promise<void> {
    const level =
        (process.env.LOG_LEVEL as
            | "debug"
            | "info"
            | "warn"
            | "error"
            | undefined) ?? "info";
    const filePath = process.env.LOG_FILE ?? "/app/logs/app.log";

    const logger = new Logger(level, filePath);

    ctx.capabilities.contribute("logging:logger", logger);
    ctx.capabilities.contribute(
        "logging:log",
        (
            logLevel: "debug" | "info" | "warn" | "error",
            message: string,
            meta?: Record<string, unknown>,
        ) => {
            void logger.log(logLevel, message, meta);
        },
    );

    ctx.gatewayRegistry.register({
        id: "logging",
        name: "Logging Gateway",
        version: "1.0.0",
        required: true,
        description:
            "Structured application logging to stdout/stderr and file.",
        publisher: "Cognis Labs",
    });
}
