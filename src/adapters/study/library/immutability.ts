import type {
    LibraryEntry,
    LibraryLayerSchema,
    LibrarySchema,
} from "./types.js";

export function isImmutableLayer(layer: LibraryLayerSchema): boolean {
    return ["atomicWritingUnit", "particle"].includes(layer.semanticRole ?? "");
}

export function isImmutableEntry(
    schema: LibrarySchema | undefined,
    entry: LibraryEntry,
): boolean {
    const layer = schema?.layers.find(({ id }) => id === entry.layer);
    return layer ? isImmutableLayer(layer) : false;
}
