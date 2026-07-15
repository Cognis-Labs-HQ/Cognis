/**
 * Small JSON response helpers for API route handlers.
 *
 * Public exports:
 *   sendJson(res, status, payload) — writes a JSON response.
 *   sendError(res, status, code, message) — writes a standard error payload.
 */
export function sendJson(res, status, payload) {
    res.writeHead(status, { "content-type": "application/json" });
    res.end(JSON.stringify(payload));
}

export function sendError(res, status, code, message) {
    sendJson(res, status, { error: { code, message } });
}
