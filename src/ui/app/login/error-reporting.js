import { uiCtx } from "../../reuse/ui-ctx.js";

/**
 * Reports a login-page failure without allowing server-log failures to escape.
 *
 * Login pages are available before authentication, while the browser logging
 * endpoint requires an authenticated session. The original failure must remain
 * visible even when that best-effort logging request is rejected.
 *
 * @param {string} message - Stable operational log message.
 * @param {Record<string, unknown>} meta - Structured failure metadata.
 * @param {Function | undefined} log - Optional logging process override.
 * @returns {Promise<void>} Resolves after logging succeeds or is safely rejected.
 */
export async function reportLoginError(
    message,
    meta,
    log = uiCtx.capabilities.get("ui:log"),
) {
    if (typeof log !== "function") {
        console.error(message, meta);
        return;
    }
    try {
        await log("error", message, meta);
    } catch (loggingError) {
        console.error(message, meta, loggingError);
    }
}
