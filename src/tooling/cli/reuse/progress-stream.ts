import { ApiRequestError } from "./api-error.ts";

/** Reads authenticated component progress without buffering the final response. */
export async function readProgressResponse(
    response: Response,
    report: (event: Record<string, unknown>) => void,
): Promise<unknown> {
    if (
        !response.headers.get("content-type")?.includes("application/x-ndjson")
    ) {
        const payload = response.headers
            .get("content-type")
            ?.includes("application/json")
            ? await response.json()
            : await response.text();
        if (!response.ok)
            throw new ApiRequestError(
                response.status,
                response.statusText,
                payload,
            );
        return payload;
    }
    if (!response.ok)
        throw new ApiRequestError(
            response.status,
            response.statusText,
            await response.text(),
        );
    if (!response.body)
        throw new Error("Upgrade progress stream is unavailable.");
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let pending = "";
    let result: unknown;
    let finished = false;
    const consume = (line: string) => {
        if (!line.trim()) return;
        const event = JSON.parse(line) as Record<string, unknown>;
        if (finished)
            throw new Error("Unexpected data after the command result.");
        if (event.type === "progress") report(event);
        else if (event.type === "result") {
            result = event.payload;
            finished = true;
        } else if (event.type === "error")
            throw new ApiRequestError(
                Number(event.status) || 500,
                "Component operation failed",
                { error: event.error },
            );
        else throw new Error("Invalid command progress event.");
    };
    try {
        while (true) {
            const chunk = await reader.read();
            pending += decoder.decode(chunk.value, { stream: !chunk.done });
            let newline: number;
            while ((newline = pending.indexOf("\n")) >= 0) {
                consume(pending.slice(0, newline));
                pending = pending.slice(newline + 1);
            }
            if (pending.length > 16 * 1024 * 1024)
                throw new Error("Command response exceeds the supported size.");
            if (chunk.done) break;
        }
        consume(pending);
        if (!finished)
            throw new Error(
                "Connection closed before the command result. Check component:info before retrying.",
            );
        return result;
    } finally {
        await reader.cancel();
        reader.releaseLock();
    }
}
