import type { NamespaceFileClient } from "@cognis/core";

const CACHE_ACTOR = { actorId: "study-library-audio-cache", role: "owner" };
const AUDIO_TYPES = new Set([
    "audio/mpeg",
    "audio/ogg",
    "audio/wav",
    "audio/webm",
    "audio/mp4",
]);

function encodeAudio(mediaType: string, data: Uint8Array): Uint8Array {
    const header = Buffer.from(`${JSON.stringify({ mediaType })}\n`, "utf8");
    return Buffer.concat([header, data]);
}

function decodeAudio(value: Uint8Array): { mediaType: string; data: Buffer } {
    const buffer = Buffer.from(value);
    const separator = buffer.indexOf(10);
    if (separator < 1) throw new Error("invalid_cached_audio");
    const metadata = JSON.parse(buffer.subarray(0, separator).toString("utf8"));
    if (!AUDIO_TYPES.has(metadata.mediaType))
        throw new Error("invalid_cached_audio");
    return {
        mediaType: metadata.mediaType,
        data: buffer.subarray(separator + 1),
    };
}

export class LibraryAudioCache {
    constructor(private readonly files: NamespaceFileClient) {}

    async store(
        key: string,
        mediaType: string,
        data: Uint8Array,
    ): Promise<void> {
        if (!AUDIO_TYPES.has(mediaType))
            throw new Error("unsupported_audio_type");
        await this.files.put(CACHE_ACTOR, key, encodeAudio(mediaType, data), {
            publicRead: true,
            contentType: mediaType,
        });
    }

    async readStored(
        key: string,
    ): Promise<{ mediaType: string; data: Buffer }> {
        const cached = await this.files.get(CACHE_ACTOR, key);
        if (!cached) throw new Error("audio_not_found");
        return decodeAudio(cached);
    }
}
