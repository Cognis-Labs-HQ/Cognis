import assert from "node:assert/strict";
import test from "node:test";
import { createCtx } from "@cognis/core";
import { LibraryService } from "../../service/index.js";
import type {
    LibraryEntry,
    LibraryEntryInput,
    LibrarySchema,
} from "../../types.js";

const metadata = { labels: { en: "Fixture" } };
const schema: LibrarySchema = {
    id: "fixture",
    namespace: "fixture",
    language: "en",
    version: 1,
    metadata,
    layers: [
        {
            id: "words",
            metadata,
            semanticRole: "lexicalUnit",
            fields: [{ id: "pronunciation", type: "stringList", metadata }],
        },
    ],
    transformSets: [
        {
            id: "verb",
            flag: "transform:verb",
            matchTags: ["verb"],
            baseState: "base",
            metadata,
            rules: [
                {
                    id: "past",
                    fromState: "base",
                    toState: "past",
                    removeSuffix: "",
                    append: "ed",
                    metadata,
                    forms: {
                        run: {
                            removeSuffix: "run",
                            append: "ran",
                            pronunciation: {
                                removeSuffix: "run",
                                append: "ran",
                            },
                        },
                    },
                },
            ],
        },
    ],
};

async function fixture() {
    const root = {
        id: "run",
        schemaId: "fixture",
        layer: "words",
        label: "run",
        class: "lexical:verb",
        fields: { pronunciation: ["run"] },
        tags: ["verb", "transform:verb"],
        language: "en",
        schemaVersion: 1,
        scope: "global",
        scopeId: "global",
        createdBy: "admin",
        createdAt: "",
        updatedAt: "",
        protected: false,
    } as LibraryEntry;
    const records = new Map([[root.id, root]]);
    const ctx = createCtx();
    ctx.registerFlow({
        id: "study:library:create",
        stages: ["normalize", "validate", "persist"],
    });
    ctx.registerFlow({
        id: "study:library:update",
        stages: ["validate", "persist"],
    });
    const stages: string[] = [];
    ctx.flow.extend(
        "study:library:create",
        "validate",
        { id: "observe" },
        () => {
            stages.push("validate");
        },
    );
    const store = {
        saveSchema: async () => {},
        list: async () => [...records.values()],
        get: async (id: string) => records.get(id) ?? null,
        create: async (_location: unknown, input: LibraryEntryInput) => {
            const entry = { ...root, ...input, id: input.label };
            records.set(entry.id, entry);
            return entry;
        },
        update: async (id: string, input: LibraryEntryInput) => {
            const entry = { ...records.get(id)!, ...input };
            records.set(id, entry);
            return entry;
        },
        listPushRequests: async () => [],
    };
    const service = new LibraryService(store as never, undefined, ctx.flow);
    await service.registerSchema(schema);
    return { service, root, records, stages };
}

const actor = { accountId: "admin", role: "admin" } as const;
const location = { scope: "global" } as const;
const input = (label: string): LibraryEntryInput => ({
    schemaId: "fixture",
    layer: "words",
    label,
    class: "lexical:verb",
    tags: ["verb", "transform:verb"],
    fields: { pronunciation: [label] },
});

test("registered authoring flows accept new flagged bases and reject materialized variants on create and update", async () => {
    const { service, records, stages } = await fixture();
    const created = await service.create(actor, location, input("jump"));
    assert.equal(created.label, "jump");
    assert.deepEqual(stages, ["validate"]);
    for (const label of ["ran", " Ran ", "ＲＡＮ"])
        await assert.rejects(
            service.create(actor, location, {
                ...input(label),
                fields: { pronunciation: ["ran"] },
            }),
            /generated_transformation_readonly/,
        );
    await assert.rejects(
        service.update(actor, created.id, input("ran")),
        /generated_transformation_readonly/,
    );
    await assert.rejects(
        service.create(actor, location, {
            ...input("ran"),
            referenceTransformation: { setId: "verb", path: ["past"] },
        } as LibraryEntryInput),
        /generated_transformation_readonly/,
    );
    assert.equal(records.size, 2);
    assert.equal(records.get(created.id)?.label, "jump");
    const noun = await service.create(actor, location, {
        ...input("ran"),
        class: "lexical:noun",
        tags: ["noun"],
    });
    assert.equal(noun.class, "lexical:noun");
});
