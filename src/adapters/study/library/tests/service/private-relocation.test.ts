import assert from "node:assert/strict";
import test from "node:test";
import { LibraryService } from "../../service/index.js";
import type { LibraryEntry, LibraryPushRequest } from "../../types.js";
import { schema } from "../fixtures/service-schema.js";
import { createLibraryFlow } from "../reuse/flows.js";

async function relocationSession(protectedDependent = false) {
    const card = (
        id: string,
        scope: "global" | "user",
        owner: string,
        target?: string,
    ): LibraryEntry => ({
        id,
        schemaId: "test-language",
        schemaVersion: 1,
        language: "x-test",
        layer: "units",
        label: id,
        scope,
        scopeId: scope === "global" ? "global" : owner,
        createdBy: owner,
        createdAt: "2026-10-10T00:00:00Z",
        updatedAt: "2026-10-10T00:00:00Z",
        protected: false,
        fields: {},
        references: target
            ? [{ entryId: target, relation: "parts", position: 0 }]
            : [],
    });
    let entries = new Map([
        ["source", card("source", "global", "alice")],
        [
            "bob",
            {
                ...card("bob", "user", "bob", "source"),
                protected: protectedDependent,
            },
        ],
        ["bob-sentence", card("bob-sentence", "user", "bob", "bob")],
        ["alice", card("alice", "user", "alice", "source")],
    ]);
    let requests: LibraryPushRequest[] = [];
    const notifications: string[][] = [];
    const flows: string[] = [];
    const cascade = (ids: readonly string[]) => {
        const found = new Set(ids);
        let changed = true;
        while (changed) {
            changed = false;
            for (const entry of entries.values())
                if (
                    !found.has(entry.id) &&
                    entry.references?.some(({ entryId }) => found.has(entryId))
                ) {
                    found.add(entry.id);
                    changed = true;
                }
        }
        return [...found];
    };
    const store = {
        saveSchema: async () => {},
        get: async (id: string) => entries.get(id) ?? null,
        referencesFor: async (id: string) =>
            [...entries.values()].filter((entry) =>
                entry.references?.some(({ entryId }) => entryId === id),
            ),
        resolveDeletionCascade: async (ids: readonly string[]) => cascade(ids),
        listPushRequests: async (status?: string) =>
            requests.filter((request) => !status || request.status === status),
        getPush: async (id: string) =>
            requests.find((request) => request.id === id),
        createPush: async (
            sourceEntryId: string,
            destination: LibraryPushRequest["destination"],
            requestedBy: string,
        ) => {
            const request: LibraryPushRequest = {
                id: "request",
                sourceEntryId,
                destination,
                requestedBy,
                status: "pending",
                sourceSnapshot: structuredClone(entries.get(sourceEntryId)),
            };
            requests.push(request);
            return request;
        },
        reviewPush: async (
            id: string,
            status: LibraryPushRequest["status"],
        ) => {
            requests.find((request) => request.id === id)!.status = status;
        },
        move: async (
            id: string,
            destination: LibraryPushRequest["destination"],
        ) => {
            const entry = {
                ...entries.get(id)!,
                ...destination,
            } as LibraryEntry;
            entries.set(id, entry);
            return entry;
        },
        deleteEntries: async (
            ids: readonly string[],
            _actor: string,
            _blacklist: boolean,
            authorize: (entries: LibraryEntry[]) => Promise<void>,
            perform: (
                entries: LibraryEntry[],
                remove: () => Promise<void>,
            ) => Promise<void>,
        ) => {
            const deleted = cascade(ids).map((id) => entries.get(id)!);
            await authorize(deleted);
            await perform(deleted, async () => {
                deleted.forEach(({ id }) => entries.delete(id));
            });
            return deleted.map(({ id }) => id);
        },
        transaction: async <T>(operation: () => Promise<T>): Promise<T> => {
            const snapshot = structuredClone({ entries, requests });
            try {
                return await operation();
            } catch (error) {
                entries = snapshot.entries;
                requests = snapshot.requests;
                throw error;
            }
        },
    };
    const library = new LibraryService(
        store as never,
        undefined,
        createLibraryFlow((id) => flows.push(id)),
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        async (deleted) => {
            assert.equal(requests[0].status, "approved");
            assert.equal(entries.get("source")?.scope, "user");
            notifications.push(deleted.map(({ id }) => id));
        },
    );
    const contract = schema(1);
    contract.layers[0].relationships = [
        {
            id: "parts",
            metadata: { labels: { en: "Parts" } },
            targetLayer: "units",
            ordered: true,
            onDelete: "cascade",
        },
    ];
    await library.registerSchema(contract);
    return {
        library,
        entries: () => entries,
        requests: () => requests,
        notifications,
        flows,
    };
}

test("global-to-private relocation remains pending until admin review and deletes only incompatible downstream cards", async () => {
    const session = await relocationSession();
    const result = await session.library.relocate(
        { accountId: "alice", role: "user" },
        "source",
        { scope: "user" },
    );
    assert.ok("request" in result);
    assert.equal(session.entries().get("source")?.scope, "global");
    assert.equal(session.entries().size, 4);
    assert.deepEqual(session.notifications, []);
    const mine = await session.library.listPushRequests({
        accountId: "alice",
        role: "user",
    });
    assert.equal(mine[0].canReview, false);
    await assert.rejects(
        session.library.reviewPush(
            { accountId: "alice", role: "user" },
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
    assert.deepEqual([...session.entries().keys()].sort(), ["alice", "source"]);
    assert.equal(session.entries().get("source")?.scopeId, "alice");
    assert.deepEqual(session.notifications, [["bob", "bob-sentence"]]);
    assert.deepEqual(session.flows, [
        "study:library:delete",
        "study:library:move",
    ]);
});

test("administrator relocation requests also require review, and protected dependents roll back approval", async () => {
    const session = await relocationSession(true);
    const request = await session.library.moveToPersonal(
        { accountId: "admin", role: "admin" },
        "source",
    );
    assert.equal(request.status, "pending");
    await assert.rejects(
        session.library.reviewPush(
            { accountId: "admin", role: "admin" },
            "request",
            "approved",
        ),
        /protected_content/,
    );
    assert.equal(session.requests()[0].status, "pending");
    assert.equal(session.entries().get("source")?.scope, "global");
    assert.equal(session.entries().size, 4);
    assert.deepEqual(session.notifications, []);
});

test("a pending publication depending on the shared source blocks private relocation approval", async () => {
    const session = await relocationSession();
    await session.library.moveToPersonal(
        { accountId: "admin", role: "admin" },
        "source",
    );
    session.requests().push({
        id: "other-request",
        sourceEntryId: "alice",
        destination: { scope: "global", scopeId: "global" },
        status: "pending",
        requestedBy: "alice",
    });
    await assert.rejects(
        session.library.reviewPush(
            { accountId: "admin", role: "admin" },
            "request",
            "approved",
        ),
        /request_pending/,
    );
    assert.equal(session.requests()[0].status, "pending");
    assert.equal(session.entries().size, 4);
    assert.deepEqual(session.notifications, []);
});

test("unrelated users cannot request a shared card's private relocation", async () => {
    const session = await relocationSession();
    await assert.rejects(
        session.library.moveToPersonal(
            { accountId: "bob", role: "user" },
            "source",
        ),
        /forbidden/,
    );
    assert.equal(session.requests().length, 0);
    assert.equal(session.entries().size, 4);
});
