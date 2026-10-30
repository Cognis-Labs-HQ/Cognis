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

type AudioRecording = { mediaType: string; data: Uint8Array };

export class LibraryAudioCache {
    private readonly pending = new Map<
        string,
        Promise<{ mediaType: string; data: Buffer }>
    >();

    constructor(
        private readonly files: NamespaceFileClient,
        private readonly log?: (
            level: string,
            message: string,
            metadata: Record<string, unknown>,
        ) => unknown,
    ) {}

    async store(
        key: string,
        mediaType: string,
        data: Uint8Array,
    ): Promise<void> {
        if (!AUDIO_TYPES.has(mediaType))
            throw new Error("unsupported_audio_type");
        await this.files.put(CACHE_ACTOR, key, encodeAudio(mediaType, data), {
            publicRead: false,
            contentType: mediaType,
        });
    }

    async readThrough(
        key: string,
        load: () => Promise<AudioRecording>,
        refresh = false,
    ): Promise<{ mediaType: string; data: Buffer }> {
        const pendingKey = `${refresh ? "refresh:" : "read:"}${key}`;
        const existing = this.pending.get(pendingKey);
        if (existing) return existing;
        const operation = (async () => {
            const cached = refresh ? null : await this.findStored(key);
            if (cached) return cached;
            const recording = await load();
            await this.store(key, recording.mediaType, recording.data);
            this.log?.("info", "study_audio_cached", {
                component: "study-library",
                operation: "persistAudio",
                key,
                mediaType: recording.mediaType,
                bytes: recording.data.byteLength,
            });
            return {
                mediaType: recording.mediaType,
                data: Buffer.from(recording.data),
            };
        })();
        this.pending.set(pendingKey, operation);
        try {
            return await operation;
        } finally {
            if (this.pending.get(pendingKey) === operation)
                this.pending.delete(pendingKey);
        }
    }

    async findStored(
        key: string,
    ): Promise<{ mediaType: string; data: Buffer } | null> {
        const cached = await this.files.get(CACHE_ACTOR, key);
        return cached ? decodeAudio(cached) : null;
    }

    async readStored(
        key: string,
    ): Promise<{ mediaType: string; data: Buffer }> {
        const cached = await this.findStored(key);
        if (!cached) throw new Error("audio_not_found");
        return cached;
    }
}
