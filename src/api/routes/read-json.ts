import type { IncomingMessage } from "node:http";

export async function readJson(
    req: IncomingMessage,
): Promise<Record<string, unknown>> {
    const chunks: Buffer[] = [];
    for await (const chunk of req) chunks.push(Buffer.from(chunk));
    const text = Buffer.concat(chunks).toString("utf8") || "{}";
    return JSON.parse(text);
}

export async function readRawBody(req: IncomingMessage): Promise<Buffer> {
    const chunks: Buffer[] = [];
    for await (const chunk of req) chunks.push(Buffer.from(chunk));
    return Buffer.concat(chunks);
}
