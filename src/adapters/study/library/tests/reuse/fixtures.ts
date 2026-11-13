import type {
    LibraryEntry,
    LibraryFieldSchema,
    LibraryLayerSchema,
    LibraryRelationshipSchema,
    LibrarySchema,
    LibraryTransformSet,
} from "../../types.js";

export function createEntry(
    overrides: Partial<LibraryEntry> = {},
): LibraryEntry {
    return {
        id: "entry",
        schemaId: "test",
        schemaVersion: 1,
        language: "en",
        layer: "words",
        label: "Entry",
        scope: "global",
        scopeId: "global",
        createdBy: "author",
        createdAt: "2026-10-18T00:00:00.000Z",
        updatedAt: "2026-10-18T00:00:00.000Z",
        protected: false,
        ...overrides,
    };
}

type FieldFixture = Omit<LibraryFieldSchema, "metadata"> &
    Partial<Pick<LibraryFieldSchema, "metadata">>;

type RelationshipFixture = Omit<
    LibraryRelationshipSchema,
    "metadata" | "onDelete"
> &
    Partial<Pick<LibraryRelationshipSchema, "metadata" | "onDelete">>;

type LayerFixture = Omit<
    LibraryLayerSchema,
    "metadata" | "fields" | "relationships"
> & {
    metadata?: LibraryLayerSchema["metadata"];
    fields?: readonly FieldFixture[];
    relationships?: readonly RelationshipFixture[];
};

type TransformFixture = Omit<LibraryTransformSet, "metadata" | "rules"> & {
    metadata?: LibraryTransformSet["metadata"];
    rules: readonly (Omit<LibraryTransformSet["rules"][number], "metadata"> & {
        metadata?: LibraryTransformSet["metadata"];
    })[];
};

export function createLayer(input: LayerFixture): LibraryLayerSchema {
    return {
        ...input,
        metadata: input.metadata ?? { labels: { en: input.id } },
        fields: input.fields?.map((field) => ({
            ...field,
            metadata: field.metadata ?? { labels: { en: field.id } },
        })),
        relationships: input.relationships?.map((relationship) => ({
            ...relationship,
            metadata: relationship.metadata ?? {
                labels: { en: relationship.id },
            },
            onDelete: relationship.onDelete ?? "restrict",
        })),
    };
}

export function createSchema(
    input: Omit<Partial<LibrarySchema>, "layers" | "transformSets"> & {
        layers?: readonly LayerFixture[];
        transformSets?: readonly TransformFixture[];
    } = {},
): LibrarySchema {
    return {
        id: "test",
        version: 1,
        namespace: "test",
        language: "en",
        metadata: { labels: { en: "Test" } },
        ...input,
        layers: (input.layers ?? []).map(createLayer),
        transformSets: input.transformSets?.map((transform) => ({
            ...transform,
            metadata: transform.metadata ?? { labels: { en: transform.id } },
            rules: transform.rules.map((rule) => ({
                ...rule,
                metadata: rule.metadata ?? { labels: { en: rule.id } },
            })),
        })),
    };
}
