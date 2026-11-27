import type { ServerResponse } from "node:http";

export function jsonOk(response: ServerResponse, data: unknown): void {
    response.writeHead(200, { "content-type": "application/json" });
    response.end(JSON.stringify({ data }));
}

export function jsonError(
    response: ServerResponse,
    status: number,
    code: string,
    message: string,
): void {
    response.writeHead(status, { "content-type": "application/json" });
    response.end(JSON.stringify({ error: { code, message } }));
}
