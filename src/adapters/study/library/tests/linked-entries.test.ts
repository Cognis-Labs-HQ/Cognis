import assert from "node:assert/strict";
import test from "node:test";
import { LibraryService } from "../service/index.js";
import type {
    LibraryEntry,
    LibraryEntryInput,
    LibraryLocation,
    LibrarySchema,
} from "../types.js";

const actor = { accountId: "author", role: "admin" as const };
const schema: LibrarySchema = {
    id: "reading-test",
    version: 1,
    namespace: "reading-test",
    language: "ja",
    metadata: { labels: { en: "Reading Test" } },
    layers: [
        {
            id: "characters",
            semanticRole: "atomicWritingUnit",
            metadata: { labels: { en: "Kana" } },
        },
        {
            id: "kanji",
            semanticRole: "compoundWritingUnit",
            metadata: { labels: { en: "Kanji" } },
            relationships: [
                {
                    id: "readings",
                    targetLayer: "words",
                    grouped: true,
                    ordered: true,
                    metadata: { labels: { en: "Readings" } },
                    presentationRole: "pronunciation",
                },
            ],
        },
        {
            id: "words",
            semanticRole: "lexicalUnit",
            metadata: { labels: { en: "Words" } },
            relationships: [
                {
                    id: "spelling",
                    targetLayer: "kanji",
                    metadata: { labels: { en: "Spelling" } },
                    presentationRole: "composition",
                },
                {
                    id: "kana",
                    targetLayer: "characters",
                    grouped: true,
                    ordered: true,
                    metadata: { labels: { en: "Kana" } },
                    presentationRole: "pronunciation",
                },
            ],
        },
    ],
};
for (const layer of schema.layers.filter(({ semanticRole }) =>
    semanticRole?.includes("WritingUnit"),
)) {
    layer.fields = [
        {
            id: "pronunciation",
            type: "stringList",
            required: true,
            metadata: { labels: { en: "Pronunciation" } },
        },
        { id: "audio", type: "audio", metadata: { labels: { en: "Audio" } } },
    ];
}
for (const layer of schema.layers) {
    for (const relationship of layer.relationships ?? [])
        relationship.onDelete = "restrict";
}
const input = (): LibraryEntryInput => ({
    schemaId: schema.id,
    layer: "kanji",
    label: "教",
    fields: { pronunciation: ["きょう"] },
    referenceGroups: {
        readings: [[{ entryId: "reading", relation: "readings", position: 0 }]],
    },
    linkedEntries: [
        {
            key: "reading",
            entry: {
                schemaId: schema.id,
                layer: "words",
                label: "きょう",
                hidden: true,
                class: "reading:kanji",
                references: [{ entryId: "$root", relation: "spelling" }],
                referenceGroups: {
                    kana: [
                        [{ entryId: "kana", relation: "kana", position: 0 }],
                    ],
                },
            },
        },
    ],
});
async function harness() {
    const records = new Map<string, LibraryEntry>();
    records.set("kana", {
        id: "kana",
        schemaId: schema.id,
        schemaVersion: 1,
        layer: "characters",
        label: "きょう",
        fields: { pronunciation: ["きょう"] },
        language: "ja",
        scope: "global",
        scopeId: "global",
        protected: true,
        createdBy: "provider",
        createdAt: "2026-01-01",
        updatedAt: "2026-01-01",
    });
    const store = {
        saveSchema: async () => {},
        listPushRequests: async () => [],
        list: async (location: LibraryLocation, filter: { layer: string }) =>
            [...records.values()].filter(
                (entry) =>
                    entry.scope === location.scope &&
                    entry.scopeId === location.scopeId &&
                    entry.layer === filter.layer,
            ),
        get: async (id: string) => records.get(id) ?? null,
        transaction: async <T>(operation: () => Promise<T>) => {
            const before = structuredClone(records);
            try {
                return await operation();
            } catch (error) {
                records.clear();
                for (const [id, entry] of before) records.set(id, entry);
                throw error;
            }
        },
        update: async (id: string, value: LibraryEntryInput) => {
            const entry = { ...records.get(id)!, ...value };
            records.set(id, entry);
            return entry;
        },
        create: async (
            location: LibraryLocation,
            value: LibraryEntryInput,
            language: string,
            accountId: string,
            id: string,
        ) => {
            const entry = {
                ...value,
                ...location,
                id,
                language,
                fields: value.fields ?? {},
                protected: false,
                createdBy: accountId,
                createdAt: "2026-01-01",
                updatedAt: "2026-01-01",
            } as LibraryEntry;
            records.set(id, entry);
            return entry;
        },
    };
    const library = new LibraryService(store as never);
    await library.registerSchema(schema);
    return { library, records };
}

test("reading imports save a complete graph with scoped hidden intermediates and resolved root backlinks", async () => {
    const { library, records } = await harness();
    const root = await library.create(actor, { scope: "global" }, input());
    const readingId = root.referenceGroups!.readings[0][0].entryId;
    const reading = records.get(readingId)!;
    assert.equal(reading.hidden, true);
    assert.equal(reading.scope, "global");
    assert.equal(reading.references![0].entryId, root.id);
    assert.equal(reading.referenceGroups!.kana[0][0].entryId, "kana");
    assert.equal(records.size, 3);
});

test("invalid hidden child creation rolls back the complete import", async () => {
    const { library, records } = await harness();
    const value = input();
    value.linkedEntries![0].entry.label = "";
    await assert.rejects(
        library.create(actor, { scope: "global" }, value),
        /invalid_label/,
    );
    assert.equal(records.size, 1);
});

test("global reading imports reject a private dependency without persisting any node", async () => {
    const { library, records } = await harness();
    records.set("kana", {
        ...records.get("kana")!,
        scope: "user",
        scopeId: "author",
    });
    await assert.rejects(
        library.create(actor, { scope: "global" }, input()),
        /reference_visibility_too_low/,
    );
    assert.equal(records.size, 1);
});

test("editing imported readings accepts their structural backlinks and preserves the root identity", async () => {
    const { library, records } = await harness();
    const root = await library.create(actor, { scope: "global" }, input());
    const edited = await library.update(actor, root.id, {
        schemaId: root.schemaId,
        layer: root.layer,
        label: root.label,
        fields: root.fields,
        references: root.references,
        referenceGroups: root.referenceGroups,
    });
    assert.equal(edited.id, root.id);
    assert.equal(records.size, 3);
});
