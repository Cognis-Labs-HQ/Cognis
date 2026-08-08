/**
 * Sends browser performance samples to the Observability gateway.
 *
 * Public exports:
 *   submitClientMetrics() — submits one authenticated browser metric batch.
 *
 * Usage:
 *   await submitClientMetrics({ navigation: "spa", metrics: [] });
 *
 * @param {{ navigation: string, metrics: Array<{ name: string, value: number }> }} payload
 * @returns {Promise<Response|null>} The final response, or null when signed out.
 */

import { apiFetch } from "../../../ui/reuse/api-client.js";

export async function submitClientMetrics(payload) {
    const requestToken = localStorage.getItem("cognis_access_token");
    if (!requestToken) return null;

    const requestOptions = {
        method: "POST",
        body: JSON.stringify(payload),
        headers: { "content-type": "application/json" },
        credentials: "same-origin",
        keepalive: true,
        suppressConnectionRecoveryToast: true,
    };
    const response = await apiFetch(
        "/api/v1/observability/client",
        requestOptions,
    );
    const currentToken = localStorage.getItem("cognis_access_token");
    if (
        response.status !== 401 ||
        !currentToken ||
        currentToken === requestToken
    ) {
        return response;
    }

    return apiFetch("/api/v1/observability/client", requestOptions);
}
