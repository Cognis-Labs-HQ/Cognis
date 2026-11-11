import type { IncomingMessage } from "node:http";

type JsonReadOptions = { maxBytes?: number };

export function readJson(
    req: IncomingMessage,
    options: JsonReadOptions & { shape: "array" },
): Promise<unknown[]>;
export function readJson(
    req: IncomingMessage,
    options?: JsonReadOptions & { shape?: "object" },
): Promise<Record<string, unknown>>;
export async function readJson(
    req: IncomingMessage,
    options: JsonReadOptions & { shape?: "object" | "array" } = {},
): Promise<Record<string, unknown> | unknown[]> {
    const text = (await readRawBody(req, options)).toString("utf8") || "{}";
    const body: unknown = JSON.parse(text);
    const valid =
        options.shape === "array"
            ? Array.isArray(body)
            : body !== null && typeof body === "object" && !Array.isArray(body);
    if (!valid)
        throw Object.assign(new Error("invalid_request_body"), { status: 400 });
    return body as Record<string, unknown> | unknown[];
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
            throw Object.assign(new Error("request_body_too_large"), {
                status: 413,
            });
        chunks.push(data);
    }
    return Buffer.concat(chunks);
}
