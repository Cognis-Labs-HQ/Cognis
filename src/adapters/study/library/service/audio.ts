import { resolveCompositeAudio } from "./composite-audio.js";
import { runOperation } from "../reuse/operation.js";
import { findLayer } from "../layers.js";
import { generatedTransformationCard } from "../ui/reuse/transformations.js";
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
    refresh = false,
    allowGeneration = true,
): Promise<{ mediaType: string; data: Buffer }> {
    const field = layer.fields?.find(({ id }) => id === fieldId);
    if (field?.type !== "audio") throw new Error("audio_field_required");
    if (!cache) throw new Error("file_gateway_unavailable");
    const stored = entry.fields?.[fieldId];
    if (!refresh && typeof stored === "string" && stored.startsWith("file:"))
        return cache.readStored(stored.slice(5));
    if (entry.scope !== "global") throw new Error("audio_not_found");
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
    const policy = layer.metadata?.audio;
    if (
        policy &&
        typeof policy === "object" &&
        !Array.isArray(policy) &&
        "requiresReading" in policy &&
        policy.requiresReading === true &&
        !input.readings?.length
    )
        throw new Error("audio_not_found");
    const key = provider.cacheKey(input);
    if (!allowGeneration) return cache.readStored(key);
    return cache.readThrough(key, () => provider.fetchAudio(input), refresh);
}

export async function readAuthorizedEntryAudio(
    input: {
        actor: LibraryActor;
        entryId: string;
        fieldId: string;
        transformation?: LibraryReferenceInput["transformation"];
        refresh?: boolean;
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
        store?: import("../store.js").LibraryStore;
        log?: (
            level: string,
            message: string,
            metadata: Record<string, unknown>,
        ) => unknown;
    },
): Promise<{ mediaType: string; data: Buffer }> {
    let entry: LibraryEntry;
    let layer: LibraryLayerSchema;
    let result: { mediaType: string; data: Buffer };
    await runOperation(
        dependencies.flow,
        input.refresh ? "study:library:regenerateAudio" : "study:library:audio",
        input,
        {
            authorize: async () => {
                const resolved = await dependencies.read(
                    input.actor,
                    input.entryId,
                );
                if (!resolved) throw new Error("not_found");
                if (
                    input.refresh &&
                    (!["admin", "owner"].includes(input.actor.role) ||
                        resolved.scope !== "global")
                )
                    throw new Error("forbidden");
                entry = resolved;
                layer = findLayer(
                    dependencies.schema(entry.schemaId),
                    entry.layer,
                );
            },
            validate: () => {
                entry = generatedTransformationCard(
                    entry,
                    dependencies.schema(entry.schemaId),
                    input.transformation,
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
                try {
                    result = await readEntryAudio(
                        entry,
                        layer,
                        input.fieldId,
                        dependencies.cache,
                        dependencies.provider,
                        input.refresh === true,
                    );
                } catch (error) {
                    if (
                        input.transformation !== undefined ||
                        input.refresh ||
                        !(error instanceof Error) ||
                        ![
                            "audio_not_found",
                            "audio_lookup_unavailable",
                        ].includes(error.message)
                    )
                        throw error;
                    result = await resolveCompositeAudio(entry, layer, {
                        read: (id) => dependencies.read(input.actor, id),
                        schema: dependencies.schema,
                        cache: dependencies.cache,
                        recording: (target, targetLayer, fieldId) =>
                            readEntryAudio(
                                target,
                                targetLayer,
                                fieldId,
                                dependencies.cache,
                                dependencies.provider,
                                false,
                                entry.scope === "global",
                            ),
                    }).then((recording) => ({
                        ...recording,
                        data: Buffer.from(recording.data),
                    }));
                }
            },
            ...(input.refresh && input.transformation === undefined
                ? {
                      persist: async () => {
                          if (!dependencies.store)
                              throw new Error("audio_refresh_unavailable");
                          const current = await dependencies.read(
                              input.actor,
                              input.entryId,
                          );
                          if (
                              !current ||
                              current.scope !== "global" ||
                              current.updatedAt !== entry.updatedAt
                          )
                              throw new Error("audio_entry_changed");
                          const saved = await dependencies.store.updateField(
                              input.entryId,
                              input.fieldId,
                              "",
                              current.updatedAt,
                          );
                          if (!saved) throw new Error("audio_entry_changed");
                          dependencies.log?.(
                              "info",
                              "Study audio regenerated.",
                              {
                                  component: "study-library",
                                  operation: "refreshAudio",
                                  entryId: input.entryId,
                                  fieldId: input.fieldId,
                                  accountId: input.actor.accountId,
                              },
                          );
                      },
                  }
                : {}),
        },
    );
    return result!;
}
