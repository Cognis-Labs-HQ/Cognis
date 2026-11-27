/**
 * Small JSON response helpers for API route handlers.
 *
 * Public exports:
 *   sendJson(res, status, payload) — writes a JSON response.
 *   sendError(res, status, code, message, details) — writes a standard error payload.
 */
export function sendJson(response, status, payload) {
    response.writeHead(status, { "content-type": "application/json" });
    response.end(JSON.stringify(payload));
}

export function sendError(response, status, code, message, details = {}) {
    sendJson(response, status, { error: { code, message, ...details } });
}
