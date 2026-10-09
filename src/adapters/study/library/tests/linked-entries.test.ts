import { createLibraryFlow } from "./reuse/flows.js";
import type { FlowApi } from "@cognis/core";
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
async function harness(flow?: FlowApi, registeredSchema = schema) {
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
    const library = new LibraryService(store as never, undefined, flow);
    await library.registerSchema(registeredSchema);
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

test("repeating dictionary import during editing reuses the hidden readings", async () => {
    const { library, records } = await harness(createLibraryFlow());
    const root = await library.create(actor, { scope: "global" }, input());
    const before = structuredClone(root.referenceGroups);
    const updated = await library.update(actor, root.id, input());
    assert.deepEqual(updated.referenceGroups, before);
    assert.equal(records.size, 3);
});

test("owner validation blocks persistence hooks and writes for invalid fields", async () => {
    const flow = createLibraryFlow();
    const { library, records } = await harness(flow);
    let persisted = false;
    flow.extend("study:library:create", "persist", { id: "observe" }, () => {
        persisted = true;
    });
    const value = input();
    value.fields = {};
    await assert.rejects(
        library.create(actor, { scope: "global" }, value),
        /field_required/,
    );
    assert.equal(persisted, false);
    assert.equal(records.size, 1);
});

test("editing executes validation and persistence stages with rollback on hook rejection", async () => {
    const flow = createLibraryFlow();
    const { library, records } = await harness(flow);
    const root = await library.create(actor, { scope: "global" }, input());
    const before = structuredClone(records);
    let persisted = false;
    flow.extend("study:library:update", "persist", { id: "reject" }, () => {
        persisted = true;
        assert.equal(records.get(root.id)!.label, "新");
        throw new Error("edit_hook_rejected");
    });
    await assert.rejects(
        library.update(actor, root.id, {
            schemaId: root.schemaId,
            layer: root.layer,
            label: "新",
            fields: root.fields,
            referenceGroups: root.referenceGroups,
        }),
        /edit_hook_rejected/,
    );
    assert.equal(persisted, true);
    assert.deepEqual(records, before);
});

test("repeat imports ignore SQL positions on unordered links while preserving ordered spelling", async () => {
    const registeredSchema = structuredClone(schema);
    const words = registeredSchema.layers.find(
        (layer) => layer.id === "words",
    )!;
    words.relationships![0].ordered = true;
    words.relationships!.push({
        id: "meaning",
        targetLayer: "characters",
        metadata: { labels: { en: "Meaning" } },
        onDelete: "restrict",
    });
    const { library, records } = await harness(
        createLibraryFlow(),
        registeredSchema,
    );
    const value = input();
    value.linkedEntries![0].entry.references![0].position = 0;
    value.linkedEntries![0].entry.references!.push({
        entryId: "kana",
        relation: "meaning",
    });
    const root = await library.create(actor, { scope: "global" }, value);
    const readingId = root.referenceGroups!.readings[0][0].entryId;
    const reading = records.get(readingId)!;
    reading.references = reading
        .references!.map((reference, position) => ({ ...reference, position }))
        .reverse();
    const updated = await library.update(actor, root.id, value);
    assert.equal(updated.referenceGroups!.readings[0][0].entryId, readingId);
    assert.equal(records.size, 3);
});
