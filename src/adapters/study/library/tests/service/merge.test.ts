import assert from "node:assert/strict";
import test from "node:test";
import { LibraryService } from "../../service/index.js";
import { mockLanguageSchema } from "../fixtures/mock-language.js";
import { createLibraryFlow } from "../reuse/flows.js";
import type {
    LibraryEntry,
    LibraryEntryInput,
    LibraryPushRequest,
} from "../../types.js";

async function mergeSession() {
    const schema = structuredClone(mockLanguageSchema);
    schema.layers
        .find(({ id }) => id === "words")!
        .relationships!.push({
            id: "related",
            targetLayer: "words",
            onDelete: "cascade",
            metadata: { labels: { en: "Related" } },
        });
    const character: LibraryEntry = {
        id: "character",
        schemaId: schema.id,
        schemaVersion: 1,
        language: schema.language,
        layer: "characters",
        label: "a",
        fields: { pronunciation: ["a"] },
        references: [],
        scope: "global",
        scopeId: "global",
        createdBy: "provider",
        protected: true,
        createdAt: "2026-10-11T00:00:00Z",
        updatedAt: "2026-10-11T00:00:00Z",
    };
    const word = (
        id: string,
        scope: "global" | "user" = "global",
    ): LibraryEntry => ({
        ...character,
        id,
        layer: "words",
        label: id === "source" ? "a" : id,
        fields: { pronunciation: ["a"] },
        references: [
            { entryId: character.id, relation: "spelling", position: 0 },
        ],
        scope,
        scopeId: scope === "user" ? "alice" : "global",
        createdBy: "alice",
        protected: false,
    });
    let records = new Map(
        [
            character,
            word("source"),
            word("related"),
            word("private", "user"),
        ].map((entry) => [entry.id, entry]),
    );
    records.get("source")!.references!.push({
        entryId: "related",
        relation: "related",
        position: 0,
    });
    let requests: LibraryPushRequest[] = [];
    const flows: string[] = [];
    const store = {
        saveSchema: async () => {},
        get: async (id: string) => records.get(id) ?? null,
        list: async () => [],
        update: async (id: string, input: LibraryEntryInput) => {
            const updated = {
                ...records.get(id)!,
                ...input,
                updatedAt: "2026-10-11T01:00:00Z",
            };
            records.set(id, updated);
            return updated;
        },
        create: async (
            _location: unknown,
            input: LibraryEntryInput,
            _language: unknown,
            _actor: unknown,
            id: string,
        ) => {
            const created = { ...word(id), ...input };
            records.set(id, created);
            return created;
        },
        createPush: async (
            sourceEntryId: string,
            destination: LibraryPushRequest["destination"],
            requestedBy: string,
            kind: LibraryPushRequest["kind"],
            proposedEntry: LibraryEntryInput,
        ) => {
            const request: LibraryPushRequest = {
                id: "request",
                sourceEntryId,
                destination,
                requestedBy,
                kind,
                proposedEntry,
                status: "pending",
                sourceSnapshot: structuredClone(records.get(sourceEntryId)),
            };
            requests.push(request);
            return request;
        },
        listPushRequests: async (status?: string) =>
            requests.filter((request) => !status || request.status === status),
        getPush: async (id: string) =>
            requests.find((request) => request.id === id) ?? null,
        reviewPush: async (
            id: string,
            status: LibraryPushRequest["status"],
        ) => {
            requests.find((request) => request.id === id)!.status = status;
        },
        transaction: async <T>(operation: () => Promise<T>) => {
            const before = structuredClone({ records, requests });
            try {
                return await operation();
            } catch (error) {
                records = before.records;
                requests = before.requests;
                throw error;
            }
        },
    };
    const library = new LibraryService(
        store as never,
        undefined,
        createLibraryFlow((id) => flows.push(id)),
    );
    await library.registerSchema(schema);
    const input: LibraryEntryInput = {
        schemaId: schema.id,
        layer: "words",
        label: "a",
        fields: { pronunciation: ["alpha", "a"] },
        references: [
            { entryId: "character", relation: "spelling", position: 0 },
            { entryId: "related", relation: "related" },
        ],
        tags: ["new-tag"],
    };
    return {
        library,
        input,
        flows,
        records: () => records,
        requests: () => requests,
    };
}

test("administrators immediately merge into the canonical card through registered merge and update flows", async () => {
    const session = await mergeSession();
    const result = await session.library.merge(
        { accountId: "admin", role: "admin" },
        "source",
        session.input,
    );
    assert.equal(result.entry.id, "source");
    assert.deepEqual(result.entry.fields.pronunciation, ["a", "alpha"]);
    assert.deepEqual(result.entry.tags, ["new-tag"]);
    assert.equal(
        result.entry.references?.filter(
            ({ relation }) => relation === "related",
        ).length,
        1,
    );
    assert.equal(session.requests().length, 0);
    assert.deepEqual(session.flows, [
        "study:library:merge",
        "study:library:update",
    ]);
});

test("users submit a shared merge for admin review without changing the original card", async () => {
    const session = await mergeSession();
    const result = await session.library.merge(
        { accountId: "bob", role: "user" },
        "source",
        session.input,
    );
    assert.equal(result.request?.kind, "merge");
    assert.deepEqual(session.records().get("source")!.fields.pronunciation, [
        "a",
    ]);
    await assert.rejects(
        session.library.reviewPush(
            { accountId: "bob", role: "user" },
            "request",
            "approved",
        ),
        /forbidden/,
    );
    await session.library.reviewPush(
        { accountId: "admin", role: "admin" },
        "request",
        "approved",
    );
    assert.deepEqual(session.records().get("source")!.fields.pronunciation, [
        "a",
        "alpha",
    ]);
    assert.equal(session.requests()[0].status, "approved");
});

test("private dependencies cannot enter a shared merge, and failed validation keeps both graph and requests unchanged", async () => {
    const session = await mergeSession();
    session.input.references!.push({ entryId: "private", relation: "related" });
    await assert.rejects(
        session.library.merge(
            { accountId: "alice", role: "user" },
            "source",
            session.input,
        ),
        /reference_visibility_too_low/,
    );
    assert.equal(session.requests().length, 0);
    assert.deepEqual(session.records().get("source")!.fields.pronunciation, [
        "a",
    ]);
});

test("requester can withdraw their merge and deleted sources cannot be withdrawn", async () => {
    const session = await mergeSession();
    await session.library.merge(
        { accountId: "bob", role: "user" },
        "source",
        session.input,
    );
    await session.library.withdrawPush(
        { accountId: "bob", role: "user" },
        "request",
    );
    assert.equal(session.requests()[0].status, "withdrawn");
    session.requests()[0].status = "pending";
    session.records().delete("source");
    await assert.rejects(
        session.library.withdrawPush(
            { accountId: "bob", role: "user" },
            "request",
        ),
        /request_source_moved/,
    );
});

test("merge review persists proposed hidden cards only after approval", async () => {
    const session = await mergeSession();
    session.input.references!.push({
        entryId: "new-reading",
        relation: "related",
    });
    session.input.linkedEntries = [
        {
            key: "new-reading",
            entry: {
                schemaId: session.input.schemaId,
                layer: "words",
                label: "alpha",
                hidden: true,
                fields: { pronunciation: ["a"] },
                references: [
                    { entryId: "character", relation: "spelling", position: 0 },
                ],
            },
        },
    ];
    await session.library.merge(
        { accountId: "bob", role: "user" },
        "source",
        session.input,
    );
    assert.equal(session.records().size, 4);
    await session.library.reviewPush(
        { accountId: "admin", role: "admin" },
        "request",
        "approved",
    );
    const hidden = [...session.records().values()].find(({ hidden }) => hidden);
    assert.ok(hidden);
    assert.equal(
        session
            .records()
            .get("source")!
            .references!.some(({ entryId }) => entryId === hidden.id),
        true,
    );
    assert.equal(hidden.scope, "global");
});
