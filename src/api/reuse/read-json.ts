import type { IncomingMessage } from "node:http";

export async function readJson(
    req: IncomingMessage,
): Promise<Record<string, unknown>> {
    const chunks: Buffer[] = [];
    for await (const chunk of req) chunks.push(Buffer.from(chunk));
    const text = Buffer.concat(chunks).toString("utf8") || "{}";
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
            throw new Error("audio_upload_too_large");
        chunks.push(data);
    }
    return Buffer.concat(chunks);
}
