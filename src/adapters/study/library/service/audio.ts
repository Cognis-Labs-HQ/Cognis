import { runOperation } from "../reuse/operation.js";
import { findLayer } from "../layers.js";
import { referencedTransformation } from "../ui/app/transformations.js";
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
                  ? readings.filter(
                        (value): value is string => typeof value === "string",
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
            const transformation = input.transformation;
            if (transformation === undefined) return;
            if (
                !transformation ||
                typeof transformation.setId !== "string" ||
                !Array.isArray(transformation.path) ||
                transformation.path.length > 8 ||
                transformation.path.some((value) => typeof value !== "string")
            )
                throw new Error("invalid_reference_transformation");
            const resolved = referencedTransformation(
                entry,
                dependencies.schema(entry.schemaId),
                transformation,
            );
            if (!resolved) throw new Error("invalid_reference_transformation");
            entry = {
                ...entry,
                label: resolved.node.value,
                fields: {
                    ...entry.fields,
                    [input.fieldId]: undefined,
                    pronunciation: [resolved.node.pronunciation],
                },
            };
        },
        resolve: async () => {
            result = await readEntryAudio(
                entry,
                layer,
                input.fieldId,
                dependencies.cache,
                dependencies.provider,
            );
        },
    });
    return result!;
}
