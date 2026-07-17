/**
 * Response parsing and API error message helpers.
 *
 * Public exports:
 * - tryParseJsonResponse(response) — safely parse JSON response bodies and
 *   return an empty object when parsing fails.
 * - resolveApiErrorMessage(payload, fallbackMessage) — extract an API error
 *   message from a response payload with a translated fallback message.
 *
 * Usage:
 *   const payload = await tryParseJsonResponse(response);
 *   const message = resolveApiErrorMessage(payload, i18n.t('ui.reuse.save_failed'));
 *
 * @param {{ json?: () => Promise<any> }} response - Fetch response-like object with a json() method.
 * @returns {Promise<object>} Parsed JSON object or an empty object when parsing fails or the response is invalid/consumed.
 */
export async function tryParseJsonResponse(response) {
    if (!response || typeof response.json !== "function") {
        return {};
    }
    return response.json().catch(() => ({}));
}

/**
 * Resolve a user-facing API error message from a parsed payload.
 *
 * @param {any} payload - Parsed response payload that may include error.message.
 * @param {string} fallbackMessage - Message to return when no API message is available.
 * @returns {string} API error message when present, otherwise fallbackMessage.
 */
export function resolveApiErrorMessage(payload, fallbackMessage) {
    const errorMessage = payload?.error?.message;
    if (typeof errorMessage === "string" && errorMessage.trim()) {
        return errorMessage.trim();
    }
    return fallbackMessage;
}
