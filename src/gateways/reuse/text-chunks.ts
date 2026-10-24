/** Split persisted text at Unicode boundaries without exceeding a UTF-8 row budget. */
export function* textChunks(text: string, maxBytes: number): Generator<string> {
    if (!Number.isSafeInteger(maxBytes) || maxBytes < 4)
        throw new Error("invalid_text_chunk_size");
    let chunk = "";
    let bytes = 0;
    for (const character of text) {
        const size = Buffer.byteLength(character, "utf8");
        if (bytes + size > maxBytes) {
            yield chunk;
            chunk = "";
            bytes = 0;
        }
        chunk += character;
        bytes += size;
    }
    if (chunk || !text) yield chunk;
}
