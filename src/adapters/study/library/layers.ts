import {
    LIBRARY_LAYERS,
    type LibraryLayer,
    type LibraryLayerLink,
    type LibraryLayerTemplate,
    type LibraryReferenceInput,
    type LibraryTemplate,
} from "./types.js";

const LAYER_LINKS: Readonly<Record<LibraryLayer, readonly LibraryLayerLink[]>> =
    {
        alphabet: [],
        alt_characters: [{ layer: "alphabet", relation: "composed-of" }],
        definitions: [],
        words: [
            { layer: "alphabet", relation: "contains" },
            { layer: "alt_characters", relation: "contains" },
            { layer: "definitions", relation: "means" },
        ],
        sentences: [
            { layer: "words", relation: "contains", required: true },
            { layer: "definitions", relation: "means" },
        ],
        exercises: [
            { layer: "alphabet", relation: "practises" },
            { layer: "alt_characters", relation: "practises" },
            { layer: "definitions", relation: "practises" },
            { layer: "words", relation: "practises" },
            { layer: "sentences", relation: "practises" },
        ],
        workouts: [
            { layer: "exercises", relation: "contains", required: true },
        ],
        routines: [
            { layer: "exercises", relation: "contains" },
            { layer: "workouts", relation: "contains" },
        ],
        collections: LIBRARY_LAYERS.filter(
            (layer) => layer !== "collections",
        ).map((layer) => ({ layer, relation: "contains" })),
    };

export const LIBRARY_TEMPLATE: LibraryTemplate = Object.freeze({
    id: "study-library",
    layers: LIBRARY_LAYERS.map((id) =>
        Object.freeze({ id, links: Object.freeze([...LAYER_LINKS[id]]) }),
    ),
});

export function isLibraryLayer(value: unknown): value is LibraryLayer {
    return LIBRARY_LAYERS.includes(value as LibraryLayer);
}

export function cloneLibraryTemplate(
    includedLayers: readonly LibraryLayer[],
): LibraryTemplate {
    if (includedLayers.length === 0) throw new Error("layers_required");
    const included = new Set(includedLayers);
    if (included.size !== includedLayers.length)
        throw new Error("duplicate_layer");
    const layers: LibraryLayerTemplate[] = LIBRARY_TEMPLATE.layers
        .filter(({ id }) => included.has(id))
        .map(({ id, links }) => ({
            id,
            links: links
                .filter(({ layer }) => included.has(layer))
                .map((link) => ({ ...link })),
        }));
    if (layers.length !== included.size) throw new Error("invalid_layer");
    return { id: LIBRARY_TEMPLATE.id, layers };
}

export function allowedReferenceLayers(
    layer: LibraryLayer,
    template: LibraryTemplate = LIBRARY_TEMPLATE,
): readonly LibraryLayer[] {
    return (
        template.layers
            .find(({ id }) => id === layer)
            ?.links.map(({ layer: linkedLayer }) => linkedLayer) ?? []
    );
}

export function inferReferenceLinks(
    layer: LibraryLayer,
    label: string,
    candidates: ReadonlyMap<
        LibraryLayer,
        readonly { id: string; label: string }[]
    >,
    template: LibraryTemplate = LIBRARY_TEMPLATE,
): LibraryReferenceInput[] {
    const links = template.layers.find(({ id }) => id === layer)?.links ?? [];
    const normalizedLabel = label.normalize("NFC");
    const tokens = new Set(normalizedLabel.split(/\s+/u).filter(Boolean));
    const symbols = new Set(Array.from(normalizedLabel));
    const references: LibraryReferenceInput[] = [];
    for (const link of links) {
        const entries = candidates.get(link.layer) ?? [];
        for (const entry of entries) {
            const candidateLabel = entry.label.normalize("NFC");
            const matches =
                (layer === "words" && symbols.has(candidateLabel)) ||
                (layer === "sentences" && tokens.has(candidateLabel));
            if (matches) {
                references.push({ entryId: entry.id, relation: link.relation });
            }
        }
    }
    return references;
}

export function validateReferenceLayers(
    layer: LibraryLayer,
    references: LibraryReferenceInput[],
    referencedLayers: Map<string, LibraryLayer>,
    template: LibraryTemplate = LIBRARY_TEMPLATE,
): void {
    const allowed = new Set(allowedReferenceLayers(layer, template));
    for (const reference of references) {
        const referencedLayer = referencedLayers.get(reference.entryId);
        if (!referencedLayer) throw new Error("reference_not_found");
        if (!allowed.has(referencedLayer)) {
            throw new Error(`invalid_reference:${layer}:${referencedLayer}`);
        }
    }
    const configuredLayer = template.layers.find(({ id }) => id === layer);
    if (!configuredLayer) throw new Error("layer_not_in_template");
    for (const requiredLink of configuredLayer.links.filter(
        ({ required }) => required,
    )) {
        if (![...referencedLayers.values()].includes(requiredLink.layer)) {
            throw new Error(
                `reference_required:${layer}:${requiredLink.layer}`,
            );
        }
    }
}
