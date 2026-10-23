import { createHash } from "node:crypto";
import type {
    LibraryEntry,
    LibraryLayerSchema,
    LibrarySchema,
} from "../types.js";
import type { LibraryAudioCache } from "../audio-cache.js";
import { composeRecording, type AudioRecording } from "./recording.js";
import { generatedTransformationCard } from "../ui/reuse/transformations.js";

export function audioReferences(
    entry: LibraryEntry,
    layer: LibraryLayerSchema,
) {
    const role =
        layer.semanticRole === "orderedLexicalSequence"
            ? "composition"
            : "pronunciation";
    const relationships = (layer.relationships ?? []).filter(
        (item) => item.presentationRole === role,
    );
    const references = relationships.flatMap((relationship) => {
        const groups = entry.referenceGroups?.[relationship.id];
        return groups?.length
            ? groups[0]
            : (entry.references ?? []).filter(
                  (item) => item.relation === relationship.id,
              );
    });
    return references.toSorted(
        (left, right) => (left.position ?? 0) - (right.position ?? 0),
    );
}

export async function resolveCompositeAudio(
    entry: LibraryEntry,
    layer: LibraryLayerSchema,
    dependencies: {
        read: (id: string) => Promise<LibraryEntry | null>;
        schema: (id: string) => LibrarySchema;
        recording: (
            entry: LibraryEntry,
            layer: LibraryLayerSchema,
            fieldId: string,
        ) => Promise<AudioRecording>;
        cache: LibraryAudioCache;
    },
): Promise<AudioRecording> {
    const segments: { recording: AudioRecording; pauseMs: number }[] = [];
    const policy = layer.metadata.audio;
    const wordGap =
        policy &&
        typeof policy === "object" &&
        !Array.isArray(policy) &&
        "wordGapMs" in policy &&
        typeof policy.wordGapMs === "number"
            ? policy.wordGapMs
            : layer.semanticRole === "orderedLexicalSequence"
              ? 80
              : 0;
    let encodedBytes = 0;
    const identities: unknown[] = ["composite-audio-1", wordGap];
    async function visit(
        current: LibraryEntry,
        currentLayer: LibraryLayerSchema,
        visited: Set<string>,
        gapAfterMs = wordGap,
        transformed = false,
    ): Promise<void> {
        if (
            visited.has(current.id) ||
            visited.size > 32 ||
            segments.length >= 256
        )
            throw new Error("invalid_audio_composition");
        visited = new Set(visited).add(current.id);
        identities.push([
            current.id,
            current.updatedAt,
            current.label,
            current.fields?.pronunciation,
        ]);
        if (current.tags?.includes("punctuation")) {
            if (segments.length)
                segments.at(-1)!.pauseMs = /[.!?。！？]/u.test(current.label)
                    ? 450
                    : 240;
            return;
        }
        const field = currentLayer.fields?.find(
            (item) => item.type === "audio",
        );
        if (
            field &&
            (currentLayer.semanticRole !== "orderedLexicalSequence" ||
                String(current.fields?.[field.id] ?? "").startsWith("file:"))
        ) {
            try {
                const recording = await dependencies.recording(
                    current,
                    currentLayer,
                    field.id,
                );
                encodedBytes += recording.data.byteLength;
                if (encodedBytes > 20_000_000)
                    throw new Error("invalid_audio_composition");
                identities.push(
                    createHash("sha256").update(recording.data).digest("hex"),
                );
                segments.push({ recording, pauseMs: gapAfterMs });
                return;
            } catch (error) {
                if (
                    !(error instanceof Error) ||
                    !["audio_not_found", "audio_lookup_unavailable"].includes(
                        error.message,
                    )
                )
                    throw error;
            }
        }
        // A transformed word's references still describe its base pronunciation.
        if (transformed) throw new Error("audio_not_found");
        const references = audioReferences(current, currentLayer);
        if (!references.length) throw new Error("audio_not_found");
        for (const reference of references) {
            const target = await dependencies.read(reference.entryId);
            if (!target) throw new Error("audio_not_found");
            const schema = dependencies.schema(target.schemaId);
            const targetLayer = schema.layers.find(
                (item) => item.id === target.layer,
            );
            if (!targetLayer) throw new Error("audio_not_found");
            await visit(
                generatedTransformationCard(
                    target,
                    schema,
                    reference.transformation,
                ),
                targetLayer,
                visited,
                currentLayer.semanticRole === "orderedLexicalSequence"
                    ? wordGap
                    : 0,
                Boolean(reference.transformation),
            );
        }
        if (segments.length)
            segments.at(-1)!.pauseMs = Math.max(
                segments.at(-1)!.pauseMs,
                gapAfterMs,
            );
    }
    for (const reference of audioReferences(entry, layer)) {
        const target = await dependencies.read(reference.entryId);
        if (!target) throw new Error("audio_not_found");
        const schema = dependencies.schema(target.schemaId);
        const targetLayer = schema.layers.find(
            (item) => item.id === target.layer,
        );
        if (!targetLayer) throw new Error("audio_not_found");
        await visit(
            generatedTransformationCard(
                target,
                schema,
                reference.transformation,
            ),
            targetLayer,
            new Set([entry.id]),
            wordGap,
            Boolean(reference.transformation),
        );
    }
    if (!segments.length) throw new Error("audio_not_found");
    const key = `composites/${createHash("sha256")
        .update(
            JSON.stringify([identities, segments.map((item) => item.pauseMs)]),
        )
        .digest("hex")}.audio`;
    return dependencies.cache.readThrough(key, () =>
        composeRecording(segments),
    );
}
