import { validateOperationId } from "../../../../../api/reuse/operation-id.js";

/** Validate encrypted message content and its optional stable delivery identity. */
export function readMessageInput(body: Record<string, unknown>): {
    operationId: string | undefined;
    ciphertext: string;
    iv: string;
    authTag: string;
    contentType: string;
} {
    if (typeof body?.ciphertext !== "string" || typeof body?.iv !== "string")
        throw new Error("bad_request");
    return {
        operationId: validateOperationId(body.operationId),
        ciphertext: body.ciphertext,
        iv: body.iv,
        authTag: typeof body.authTag === "string" ? body.authTag : "",
        contentType:
            typeof body.contentType === "string"
                ? body.contentType
                : "text/plain",
    };
}

/** Preserve an explicit receipt time without accepting future or malformed dates. */
export function readReceiptTime(value: unknown): string | undefined {
    if (value === undefined) return undefined;
    const timestamp = Date.parse(String(value));
    if (!Number.isFinite(timestamp) || timestamp > Date.now() + 60_000)
        throw new Error("invalid_read_time");
    return new Date(timestamp).toISOString();
}
