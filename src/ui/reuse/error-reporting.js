/**
 * Normalizes browser failures and publishes them to the logging gateway.
 * Public exports:
 * - reportClientError(error) — report structured context or an Error safely.
 * @example reportClientError({ component: 'public-page', operation: 'load' });
 * @param {Record<string, unknown> | Error} error Failure or safe diagnostic context.
 * @returns {Promise<boolean>} Whether the gateway accepted the event.
 */
import { bindCapability } from "./capabilities.js";

const log = bindCapability("ui:log");

export function reportClientError(error) {
    const context = error instanceof Error ? { errorName: error.name } : error;
    return log("error", "client_error", {
        component: "ui",
        operation: "runtime",
        ...context,
    });
}
