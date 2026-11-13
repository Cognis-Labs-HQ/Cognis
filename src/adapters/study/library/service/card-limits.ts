import type { LibraryEntryInput, LibrarySchema } from "../types.js";
import { findLayer } from "../layers.js";
import { allInputReferences } from "./dependencies.js";

/** User-created cards use the same limits as the composer, including batch imports. */
export function validateCardLimits(
    schema: LibrarySchema,
    input: LibraryEntryInput,
): void {
    if ((input.tags?.length ?? 0) > 8) throw new Error("tag_limit");
    const pronunciation = input.fields?.pronunciation;
    const readings = Array.isArray(pronunciation)
        ? pronunciation
        : typeof pronunciation === "string"
          ? pronunciation.split(/\r?\n/u).filter(Boolean)
          : [];
    if (readings.length > 16) throw new Error("pronunciation_limit");
    const layer = findLayer(schema, input.layer);
    const meanings = new Set(
        layer.relationships
            ?.filter((relationship) =>
                ["definition", "meaning"].includes(
                    findLayer(schema, relationship.targetLayer).semanticRole ??
                        "",
                ),
            )
            .map((relationship) => relationship.id),
    );
    if (
        allInputReferences(input).filter((reference) =>
            meanings.has(reference.relation),
        ).length > 10
    )
        throw new Error("definition_limit");
}
