/**
 * Parses structured API error responses into readable message text.
 *
 * Public exports:
 * - getApiErrorMessage(response): returns the API error message text (or code fallback) from a failed fetch response.
 *
 * Usage:
 *   const response = await apiFetch('/api/v1/example');
 *   if (!response.ok) {
 *     const message = await getApiErrorMessage(response);
 *     showToast(message ?? i18n.t('ui.reuse.save_failed'), { variant: 'error' });
 *   }
 *
 * @param {Response} response API response object from fetch/apiFetch with an optional JSON error payload.
 * @returns {Promise<string | null>} Error message text, or null when unavailable.
 */
export async function getApiErrorMessage(response) {
    try {
        const payload = await response.json();
        const apiError = payload?.error;
        if (typeof apiError?.message === "string" && apiError.message.trim()) {
            return apiError.message.trim();
        }
        if (typeof apiError?.code === "string" && apiError.code.trim()) {
            return apiError.code.trim();
        }
    } catch {
        return null;
    }
    return null;
}
