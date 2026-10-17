import type {
    LibraryEntry,
    LibraryEntryInput,
    LibrarySchema,
} from "../../types.js";

export const mockLanguageSchema: LibrarySchema = {
    id: "mock-language",
    version: 1,
    namespace: "mock",
    language: "x-mock",
    metadata: { labels: { en: "Mock Language" } },
    layers: [
        {
            id: "characters",
            semanticRole: "atomicWritingUnit",
            metadata: { labels: { en: "Characters" } },
            fields: [
                {
                    id: "pronunciation",
                    type: "stringList",
                    required: true,
                    metadata: { labels: { en: "Pronunciation" } },
                },
                {
                    id: "audio",
                    type: "audio",
                    metadata: { labels: { en: "Audio" } },
                },
            ],
        },
        {
            id: "symbols",
            semanticRole: "compoundWritingUnit",
            metadata: { labels: { en: "Symbols" } },
            fields: [
                {
                    id: "pronunciation",
                    type: "stringList",
                    required: true,
                    multi_value: true,
                    metadata: { labels: { en: "Pronunciation" } },
                    input: {
                        control: "freeText",
                        linkRelationships: ["readings"],
                    },
                },
                {
                    id: "audio",
                    type: "audio",
                    metadata: { labels: { en: "Audio" } },
                },
            ],
            relationships: [
                {
                    id: "components",
                    targetLayer: "characters",
                    metadata: { labels: { en: "Components" } },
                    minimum: 1,
                    ordered: true,
                    resolverRole: "grapheme",
                    presentationRole: "composition",
                    onDelete: "restrict",
                },
                {
                    id: "readings",
                    targetLayer: "characters",
                    metadata: { labels: { en: "Readings" } },
                    minimum: 1,
                    ordered: true,
                    grouped: true,
                    presentationRole: "pronunciation",
                    onDelete: "restrict",
                },
            ],
            cardConstructor: {
                label: { labels: { en: "Symbol" } },
                relationships: ["components", "readings"],
                input_carousels: ["characters"],
                pronunciation_carousels: ["characters"],
            },
        },
        {
            id: "words",
            semanticRole: "lexicalUnit",
            metadata: { labels: { en: "Words" } },
            fields: [
                {
                    id: "pronunciation",
                    type: "stringList",
                    metadata: { labels: { en: "Pronunciation" } },
                },
            ],
            relationships: [
                {
                    id: "spelling",
                    targetLayer: "characters",
                    metadata: { labels: { en: "Spelling" } },
                    minimum: 1,
                    ordered: true,
                    resolverRole: "grapheme",
                    presentationRole: "composition",
                    onDelete: "restrict",
                },
            ],
        },
        {
            id: "sentences",
            semanticRole: "orderedLexicalSequence",
            metadata: { labels: { en: "Sentences" } },
            fields: [
                {
                    id: "pronunciation",
                    type: "stringList",
                    metadata: { labels: { en: "Pronunciation" } },
                },
            ],
            relationships: [
                {
                    id: "words",
                    targetLayer: "words",
                    metadata: { labels: { en: "Words" } },
                    minimum: 1,
                    ordered: true,
                    resolverRole: "token",
                    presentationRole: "composition",
                    onDelete: "restrict",
                },
            ],
            cardConstructor: {
                label: { labels: { en: "Sentence" } },
                relationships: ["words"],
                input_carousels: ["words"],
                pronunciation_carousels: [],
                tag_carousels: [
                    {
                        id: "sentence-structure",
                        metadata: { labels: { en: "Sentence structure" } },
                        relationship: "words",
                        tag: "sentence-structure",
                    },
                ],
            },
        },
        {
            id: "definitions",
            semanticRole: "definition",
            metadata: { labels: { en: "Definitions" } },
            fields: [
                {
                    id: "string_key",
                    type: "string",
                    required: true,
                    metadata: { labels: { en: "String key" } },
                },
                {
                    id: "translations",
                    type: "localizedText",
                    required: true,
                    metadata: { labels: { en: "Translations" } },
                },
            ],
            definitionLocalization: {
                stringKeyPrefix: "mock:definitions",
                stringKeyField: "string_key",
                translationsField: "translations",
            },
        },
    ],
};

export function mockCharacter(id: string, label: string): LibraryEntry {
    return {
        id,
        schemaId: mockLanguageSchema.id,
        schemaVersion: mockLanguageSchema.version,
        language: mockLanguageSchema.language,
        layer: "characters",
        label,
        fields: { pronunciation: [label] },
        scope: "global",
        scopeId: "global",
        createdBy: "mock-provider",
        createdAt: "2026-01-01T00:00:00.000Z",
        updatedAt: "2026-01-01T00:00:00.000Z",
        protected: true,
    };
}

export function mockSymbolInput(
    first: LibraryEntry,
    second: LibraryEntry,
): LibraryEntryInput {
    return {
        schemaId: mockLanguageSchema.id,
        schemaVersion: mockLanguageSchema.version,
        layer: "symbols",
        label: `${first.label}${second.label}`,
        fields: { pronunciation: [first.label, second.label] },
        references: [
            { entryId: first.id, relation: "components", position: 0 },
            { entryId: second.id, relation: "components", position: 1 },
        ],
        referenceGroups: {
            readings: [
                [{ entryId: first.id, relation: "readings", position: 0 }],
                [{ entryId: second.id, relation: "readings", position: 0 }],
            ],
        },
    };
}
