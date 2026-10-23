import { runOperation } from "../reuse/operation.js";
import type { FlowApi } from "@cognis/core";
import type { LibraryLocation } from "../types.js";
import { randomUUID } from "node:crypto";
import type { LibraryActor } from "../contracts.js";
import type { LibrarySchema } from "../types.js";
import type { LibraryAudioCache } from "../audio-cache.js";

export const MAX_AUDIO_UPLOAD_BYTES = 5 * 1024 * 1024;

export function validateAudioUpload(mediaType: string, data: Uint8Array): void {
    if (!data.byteLength || data.byteLength > MAX_AUDIO_UPLOAD_BYTES)
        throw new Error("audio_upload_too_large");
    const buffer = Buffer.from(data);
    const matches =
        mediaType === "audio/mpeg"
            ? buffer.subarray(0, 3).toString() === "ID3" ||
              (buffer[0] === 0xff && (buffer[1] & 0xe0) === 0xe0)
            : mediaType === "audio/wav"
              ? buffer.subarray(0, 4).toString() === "RIFF" &&
                buffer.subarray(8, 12).toString() === "WAVE"
              : mediaType === "audio/ogg"
                ? buffer.subarray(0, 4).toString() === "OggS"
                : mediaType === "audio/webm"
                  ? buffer.subarray(0, 4).toString("hex") === "1a45dfa3"
                  : mediaType === "audio/mp4" &&
                    buffer.subarray(4, 8).toString() === "ftyp";
    if (!matches) throw new Error("unsupported_audio_type");
}

export function audioUploadKey(actor: LibraryActor): string {
    return `uploads/${encodeURIComponent(actor.accountId)}/${randomUUID()}.audio`;
}

export async function validateUploadedAudioFields(
    actor: LibraryActor,
    schema: LibrarySchema,
    layerId: string,
    fields: Record<string, unknown>,
    previous: Record<string, unknown> = {},
    cache?: LibraryAudioCache,
): Promise<void> {
    const layer = schema.layers.find(({ id }) => id === layerId);
    for (const field of layer?.fields ?? []) {
        if (field.type !== "audio" && field.type !== "audioList") continue;
        const values = [fields[field.id]].flat();
        const prior = [previous[field.id]].flat();
        for (const value of values) {
            if (!value || prior.includes(value)) continue;
            if (
                typeof value !== "string" ||
                !/^file:uploads\/[^/]+\/[a-f0-9-]+\.audio$/.test(value)
            )
                throw new Error("invalid_audio_upload");
            if (
                !["admin", "owner"].includes(actor.role) &&
                !value.startsWith(
                    `file:uploads/${encodeURIComponent(actor.accountId)}/`,
                )
            )
                throw new Error("forbidden");
            if (!cache) throw new Error("file_gateway_unavailable");
            const recording = await cache.readStored(value.slice(5));
            validateAudioUpload(recording.mediaType, recording.data);
        }
    }
}

export async function storeUploadedAudio(
    actor: LibraryActor,
    mediaType: string,
    data: Uint8Array,
    dependencies: {
        cache?: LibraryAudioCache;
        flow?: FlowApi;
        authorize(
            actor: LibraryActor,
            location: LibraryLocation,
            write: boolean,
        ): Promise<LibraryLocation>;
        log?: (
            level: string,
            message: string,
            metadata: Record<string, unknown>,
        ) => unknown;
    },
): Promise<{ value: string }> {
    const key = audioUploadKey(actor);
    await runOperation(
        dependencies.flow,
        "study:library:uploadAudio",
        { actor, mediaType },
        {
            authorize: () =>
                dependencies.authorize(
                    actor,
                    { scope: "user", scopeId: actor.accountId },
                    true,
                ),
            validate: () => validateAudioUpload(mediaType, data),
            persist: async () => {
                if (!dependencies.cache)
                    throw new Error("file_gateway_unavailable");
                await dependencies.cache.store(key, mediaType, data);
                dependencies.log?.("info", "Study audio uploaded.", {
                    component: "study-library",
                    operation: "uploadAudio",
                    accountId: actor.accountId,
                    bytes: data.byteLength,
                });
            },
        },
    );
    return { value: `file:${key}` };
}
