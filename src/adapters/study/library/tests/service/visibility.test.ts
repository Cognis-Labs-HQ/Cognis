import assert from "node:assert/strict";
import test from "node:test";
import { LibraryService } from "../../service/index.js";
import { schema } from "../fixtures/service-schema.js";
test("promotion approval moves personal content into the requested scope", async () => {
    const source = {
        id: "personal-card",
        scope: "user",
        scopeId: "alice",
        createdBy: "alice",
        protected: false,
    };
    const moves: unknown[] = [];
    const store = {
        transaction: async <T>(operation: () => Promise<T>) => operation(),
        getPush: async () => ({
            id: "request",
            sourceEntryId: source.id,
            destination: { scope: "global", scopeId: "global" },
            requestedBy: "alice",
            status: "pending",
        }),
        get: async () => source,
        move: async (_id: string, destination: unknown) => {
            moves.push(destination);
            return { ...source, ...(destination as object) };
        },
        reviewPush: async () => {},
    };
    const library = new LibraryService(store as never);
    await library.reviewPush(
        { accountId: "admin", role: "admin" },
        "request",
        "approved",
    );
    assert.deepEqual(moves, [{ scope: "global", scopeId: "global" }]);
});

test("authors submit global card edits as update requests", async () => {
    const source = {
        id: "global-card",
        label: "Original",
        schemaId: "test-language",
        layer: "units",
        scope: "global",
        scopeId: "global",
        createdBy: "alice",
        protected: false,
    };
    let captured: unknown;
    const store = {
        transaction: async <T>(operation: () => Promise<T>) => operation(),
        saveSchema: async () => {},
        get: async () => source,
        listPushRequests: async () => [],
        createPush: async (...args: unknown[]) => {
            captured = args;
            return { id: "update-request", status: "pending" };
        },
    };
    const library = new LibraryService(store as never);
    await library.registerSchema(schema(1));
    const proposed = {
        schemaId: "test-language",
        layer: "units",
        label: "Updated",
        fields: {},
    };
    await library.requestUpdate(
        { accountId: "alice", role: "user" },
        source.id,
        proposed,
    );
    assert.deepEqual(captured, [
        source.id,
        { scope: "global", scopeId: "global" },
        "alice",
        "update",
        proposed,
    ]);
});

test("authorized reviewers receive the source card with each request", async () => {
    const source = {
        id: "personal-card",
        label: "Learner contribution",
        scope: "user",
        scopeId: "alice",
        createdBy: "alice",
    };
    const store = {
        transaction: async <T>(operation: () => Promise<T>) => operation(),
        listPushRequests: async () => [
            {
                id: "request",
                sourceEntryId: source.id,
                destination: { scope: "class", scopeId: "class-a" },
                requestedBy: "alice",
                status: "pending",
            },
        ],
        get: async () => source,
    };
    const library = new LibraryService(store as never, {
        canRead: async () => true,
        canWrite: async () => true,
    });

    const requests = await library.listPushRequests({
        accountId: "teacher",
        role: "teacher",
    });
    assert.equal(requests[0].source?.label, "Learner contribution");
    assert.equal(requests[0].canReview, true);
});

test("submitters can withdraw pending visibility requests", async () => {
    const statuses: string[] = [];
    const store = {
        transaction: async <T>(operation: () => Promise<T>) => operation(),
        getPush: async () => ({
            id: "request",
            sourceEntryId: "personal-card",
            destination: { scope: "global", scopeId: "global" },
            requestedBy: "alice",
            status: "pending",
        }),
        get: async () => ({
            id: "personal-card",
            scope: "user",
            scopeId: "alice",
        }),
        reviewPush: async (_id: string, status: string) => {
            statuses.push(status);
        },
    };
    const library = new LibraryService(store as never);

    const request = await library.withdrawPush(
        { accountId: "alice", role: "user" },
        "request",
    );
    assert.equal(request.status, "withdrawn");
    assert.deepEqual(statuses, ["withdrawn"]);
});

test("provider cards cannot be sent to a personal namespace", async () => {
    const entry = {
        id: "provider-card",
        scope: "global",
        scopeId: "global",
        createdBy: "content-pack:mock-language-core",
        protected: false,
    };
    const store = {
        transaction: async <T>(operation: () => Promise<T>) => operation(),
        get: async () => entry,
    };
    const library = new LibraryService(store as never);

    await assert.rejects(
        library.moveToPersonal({ accountId: "admin", role: "admin" }, entry.id),
        /provider_content/,
    );
});

test("global downgrades return content to its original submitter", async () => {
    const entry = {
        id: "global-card",
        scope: "global",
        scopeId: "global",
        createdBy: "alice",
        protected: false,
    };
    let destination: unknown;
    const store = {
        transaction: async <T>(operation: () => Promise<T>) => operation(),
        listPushRequests: async () => [],
        referencesFor: async () => [],
        get: async () => entry,
        move: async (_id: string, value: unknown) => {
            destination = value;
            return { ...entry, ...(value as object) };
        },
    };
    const library = new LibraryService(store as never);
    await library.moveToPersonal(
        { accountId: "admin", role: "admin" },
        entry.id,
    );
    assert.deepEqual(destination, { scope: "user", scopeId: "alice" });
});

test("administrators relocate personal cards immediately while learners request review", async () => {
    for (const role of ["admin", "owner", "user"] as const) {
        const source = {
            id: "personal",
            schemaId: "test-language",
            layer: "units",
            scope: "user",
            scopeId: "alice",
            createdBy: "alice",
            label: "Card",
            fields: {},
        };
        const calls: string[] = [];
        const store = {
            saveSchema: async () => {},
            get: async () => source,
            listPushRequests: async () => [],
            transaction: async <T>(operation: () => Promise<T>) => operation(),
            move: async (_id: string, destination: object) => {
                calls.push("move");
                return { ...source, ...destination };
            },
            createPush: async () => {
                calls.push("request");
                return { id: "request", status: "pending" };
            },
        };
        const library = new LibraryService(store as never);
        await library.registerSchema(schema(1));
        const result = await library.relocate(
            { accountId: "alice", role },
            source.id,
            { scope: "global", scopeId: "global" },
        );
        assert.deepEqual(calls, [role === "user" ? "request" : "move"]);
        if ("entry" in result) {
            assert.equal(result.entry.scope, "global");
            assert.equal(result.entry.canDelete, true);
        } else assert.equal(result.request.status, "pending");
    }
});

test("administrators can review their own pending requests and retain decision history", async () => {
    const source = {
        id: "personal",
        scope: "user",
        scopeId: "admin",
        createdBy: "admin",
    };
    const library = new LibraryService({
        get: async () => source,
        listPushRequests: async () => [
            {
                id: "pending",
                sourceEntryId: source.id,
                requestedBy: "admin",
                status: "pending",
                destination: { scope: "global", scopeId: "global" },
            },
            {
                id: "complete",
                sourceEntryId: source.id,
                requestedBy: "learner",
                status: "approved",
                destination: { scope: "global", scopeId: "global" },
            },
        ],
    } as never);
    const requests = await library.listPushRequests({
        accountId: "admin",
        role: "admin",
    });
    assert.equal(requests.length, 2);
    assert.equal(requests[0].canReview, true);
    assert.equal(requests[0].canWithdraw, true);
    assert.equal(requests[1].canReview, false);
    assert.equal(requests[1].status, "approved");
});
