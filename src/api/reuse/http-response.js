/**
 * Small JSON response helpers for API route handlers.
 *
 * Public exports:
 *   sendJson(res, status, payload) — writes a JSON response.
 *   sendError(res, status, code, message, details) — writes a standard error payload.
 */
export function sendJson(res, status, payload) {
    res.writeHead(status, { "content-type": "application/json" });
    res.end(JSON.stringify(payload));
}

export function sendError(res, status, code, message, details = {}) {
    sendJson(res, status, { error: { code, message, ...details } });
}
