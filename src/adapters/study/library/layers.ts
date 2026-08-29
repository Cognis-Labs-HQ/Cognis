import {
    LIBRARY_LAYERS,
    type LibraryLayer,
    type LibraryReferenceInput,
} from "./types.js";

const ALLOWED_REFERENCE_LAYERS: Record<LibraryLayer, readonly LibraryLayer[]> =
    {
        alphabet: [],
        alt_characters: ["alphabet"],
        definitions: [],
        words: ["alphabet", "alt_characters", "definitions"],
        sentences: ["words", "definitions"],
        exercises: [
            "alphabet",
            "alt_characters",
            "definitions",
            "words",
            "sentences",
        ],
        workouts: ["exercises"],
        routines: ["exercises", "workouts"],
        collections: LIBRARY_LAYERS.filter((layer) => layer !== "collections"),
    };

export function isLibraryLayer(value: unknown): value is LibraryLayer {
    return LIBRARY_LAYERS.includes(value as LibraryLayer);
}

export function allowedReferenceLayers(
    layer: LibraryLayer,
): readonly LibraryLayer[] {
    return ALLOWED_REFERENCE_LAYERS[layer];
}

export function validateReferenceLayers(
    layer: LibraryLayer,
    references: LibraryReferenceInput[],
    referencedLayers: Map<string, LibraryLayer>,
): void {
    const allowed = new Set(allowedReferenceLayers(layer));
    for (const reference of references) {
        const referencedLayer = referencedLayers.get(reference.entryId);
        if (!referencedLayer) throw new Error("reference_not_found");
        if (!allowed.has(referencedLayer)) {
            throw new Error(`invalid_reference:${layer}:${referencedLayer}`);
        }
    }
}
