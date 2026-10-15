import { runOperation } from "../reuse/operation.js";
import { findLayer } from "../layers.js";
import { transformedAudioEntry } from "./audio-input.js";
import { resolveCompositeAudio } from "./composite-audio.js";
import type { FlowApi } from "@cognis/core";
import type { LibraryActor } from "../contracts.js";
import type { LibrarySchema, LibraryReferenceInput } from "../types.js";
import type { StudyAudioCapability, StudyAudioInput } from "@cognis/core";
import type { LibraryEntry, LibraryLayerSchema } from "../types.js";
import type { LibraryAudioCache } from "../audio-cache.js";

export async function readEntryAudio(
    entry: LibraryEntry,
    layer: LibraryLayerSchema,
    fieldId: string,
    cache?: LibraryAudioCache,
    provider?: StudyAudioCapability,
): Promise<{ mediaType: string; data: Buffer }> {
    const field = layer.fields?.find(({ id }) => id === fieldId);
    if (field?.type !== "audio") throw new Error("audio_field_required");
    if (!cache) throw new Error("file_gateway_unavailable");
    const stored = entry.fields?.[fieldId];
    if (typeof stored === "string" && stored.startsWith("file:"))
        return cache.readStored(stored.slice(5));
    if (!provider?.supports(entry.language, layer.semanticRole ?? ""))
        throw new Error("audio_not_found");
    const readings = entry.fields?.pronunciation;
    const input: StudyAudioInput = {
        language: entry.language,
        label: entry.label,
        semanticRole: layer.semanticRole!,
        readings:
            typeof readings === "string"
                ? [readings]
                : Array.isArray(readings)
                  ? readings
                        .slice(0, 1)
                        .filter(
                            (value): value is string =>
                                typeof value === "string",
                        )
                  : [],
    };
    const key = provider.cacheKey(input);
    return cache.readThrough(key, () => provider.fetchAudio(input));
}

export async function readAuthorizedEntryAudio(
    input: {
        actor: LibraryActor;
        entryId: string;
        fieldId: string;
        transformation?: LibraryReferenceInput["transformation"];
    },
    dependencies: {
        read: (
            actor: LibraryActor,
            entryId: string,
        ) => Promise<LibraryEntry | null>;
        schema: (id: string) => LibrarySchema;
        flow?: FlowApi;
        cache?: LibraryAudioCache;
        provider?: StudyAudioCapability;
    },
): Promise<{ mediaType: string; data: Buffer }> {
    let entry: LibraryEntry;
    let layer: LibraryLayerSchema;
    let result: { mediaType: string; data: Buffer };
    await runOperation(dependencies.flow, "study:library:audio", input, {
        authorize: async () => {
            const resolved = await dependencies.read(
                input.actor,
                input.entryId,
            );
            if (!resolved) throw new Error("not_found");
            entry = resolved;
            layer = findLayer(dependencies.schema(entry.schemaId), entry.layer);
        },
        validate: () => {
            entry = transformedAudioEntry(
                entry,
                dependencies.schema(entry.schemaId),
                input.transformation,
                input.fieldId,
            );
        },
        resolve: async () => {
            if (!dependencies.cache)
                throw new Error("file_gateway_unavailable");
            const field = layer.fields?.find(
                (item) => item.id === input.fieldId,
            );
            if (field?.type !== "audio")
                throw new Error("audio_field_required");
            const readRecording = (
                candidate: LibraryEntry,
                candidateLayer: LibraryLayerSchema,
                fieldId: string,
            ) =>
                readEntryAudio(
                    candidate,
                    candidateLayer,
                    fieldId,
                    dependencies.cache,
                    dependencies.provider,
                );
            if (
                layer.semanticRole !== "orderedLexicalSequence" ||
                String(entry.fields?.[input.fieldId] ?? "").startsWith("file:")
            ) {
                try {
                    result = await readRecording(entry, layer, input.fieldId);
                    return;
                } catch (error) {
                    if (
                        !(error instanceof Error) ||
                        ![
                            "audio_not_found",
                            "audio_lookup_unavailable",
                        ].includes(error.message)
                    )
                        throw error;
                }
            }
            const recording = await resolveCompositeAudio(entry, layer, {
                read: (id) => dependencies.read(input.actor, id),
                schema: dependencies.schema,
                recording: readRecording,
                cache: dependencies.cache,
            });
            result = {
                mediaType: recording.mediaType,
                data: Buffer.from(recording.data),
            };
        },
    });
    return result!;
}
