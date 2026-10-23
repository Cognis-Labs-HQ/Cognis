import {
    transformationPathways,
    referencedTransformation,
} from "../ui/reuse/transformations.js";
import type {
    LibraryContentRecord,
    LibraryEntryInput,
    LibrarySchema,
} from "../types.js";

type Source = Pick<
    LibraryEntryInput,
    "label" | "fields" | "tags" | "class" | "references"
>;

type LayerSource = Source & { layer: string };

type GeneratedIndex = Map<
    string,
    { sourceLabel: string; class?: string; reading: string }[]
>;

function normalizedLabel(value: string): string {
    return value.trim().normalize("NFKC").toLocaleLowerCase();
}

function indexGenerated(
    schema: LibrarySchema,
    sources: readonly LayerSource[],
): GeneratedIndex {
    const index: GeneratedIndex = new Map();
    for (const source of sources) {
        for (const { nodes } of transformationPathways(source, schema)) {
            for (const node of nodes.slice(1)) {
                const key = JSON.stringify([
                    source.layer,
                    normalizedLabel(node.value),
                ]);
                const values = index.get(key) ?? [];
                values.push({
                    sourceLabel: normalizedLabel(source.label),
                    class: node.class,
                    reading: node.pronunciation,
                });
                index.set(key, values);
            }
        }
    }
    return index;
}

export function validateGeneratedCopy(
    schema: LibrarySchema,
    input: LayerSource,
    sources: readonly LayerSource[],
    index = indexGenerated(schema, sources),
): void {
    const primary = Array.isArray(input.fields?.pronunciation)
        ? input.fields.pronunciation[0]
        : input.fields?.pronunciation;
    const reading =
        typeof primary === "string"
            ? primary.trim().normalize("NFC")
            : undefined;
    const label = normalizedLabel(input.label);
    if (
        (index.get(JSON.stringify([input.layer, label])) ?? []).some(
            (source) =>
                source.sourceLabel !== label &&
                (input.class === undefined || source.class === input.class) &&
                (!reading ||
                    source.reading.trim().normalize("NFC") === reading),
        )
    )
        throw new Error("generated_transformation_readonly");
}

/** Generated views can be referenced, but cannot become independently authored records. */
export function validateAuthoredTransformation(source: Source): void {
    if (
        "referenceTransformation" in source ||
        "generatedTransformation" in source ||
        (Array.isArray(source.tags) && source.tags.includes("inflected")) ||
        source.class === "lexical:transformation" ||
        (Array.isArray(source.references) &&
            source.references.some(
                (reference) => reference?.relation === "inflected-from",
            ))
    )
        throw new Error("generated_transformation_readonly");
}

export function validateTransformationSource(
    schema: LibrarySchema,
    source: Source,
): void {
    validateAuthoredTransformation(source);
    const flags =
        source.tags?.filter((tag) => tag.startsWith("transform:")) ?? [];
    const pathways = transformationPathways(source, schema);
    for (const flag of flags) {
        const applicable = pathways.filter(({ set }) => set.flag === flag);
        if (
            !applicable.length ||
            applicable.some(({ nodes }) => nodes.length < 2)
        )
            throw new Error(`unresolved_transform_flag:${flag}`);
    }
    for (const { set, nodes } of pathways) {
        for (const rule of set.rules) {
            if (
                !nodes.some(
                    (node) =>
                        node.state === rule.fromState &&
                        referencedTransformation(source, schema, {
                            setId: set.id,
                            path: [...node.path, rule.id],
                        }),
                )
            )
                throw new Error(
                    `unresolved_transform_flag:${set.flag}:${set.id}:${rule.id}`,
                );
        }
    }
}

/** Validate the generated closure, rather than requiring stored copies of its nodes. */
export function validateGeneratedTransformations(
    schema: LibrarySchema,
    records: readonly (LibraryContentRecord & { layer: string })[],
): void {
    const index = indexGenerated(schema, records);
    for (const record of records) {
        validateTransformationSource(schema, record);
        validateGeneratedCopy(schema, record, records, index);
    }
}
