import type { ServerResponse } from "node:http";

export function jsonOk(res: ServerResponse, data: unknown): void {
    res.writeHead(200, { "content-type": "application/json" });
    res.end(JSON.stringify({ data }));
}

export function jsonError(
    res: ServerResponse,
    status: number,
    code: string,
    message: string,
): void {
    res.writeHead(status, { "content-type": "application/json" });
    res.end(JSON.stringify({ error: { code, message } }));
}
