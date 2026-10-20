import type { IncomingMessage } from "node:http";

export async function readJson(
    req: IncomingMessage,
    options: { maxBytes?: number } = {},
): Promise<Record<string, unknown>> {
    const text = (await readRawBody(req, options)).toString("utf8") || "{}";
    return JSON.parse(text);
}

export async function readRawBody(
    req: IncomingMessage,
    { maxBytes }: { maxBytes?: number } = {},
): Promise<Buffer> {
    const chunks: Buffer[] = [];
    let size = 0;
    for await (const chunk of req) {
        const data = Buffer.from(chunk);
        size += data.length;
        if (maxBytes !== undefined && size > maxBytes)
            throw new Error("request_body_too_large");
        chunks.push(data);
    }
    return Buffer.concat(chunks);
}
