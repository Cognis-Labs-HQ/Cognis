import assert from "node:assert/strict";
import test from "node:test";
import { LibraryService } from "../../service/index.js";
import { schema } from "../fixtures/service-schema.js";

test("global create notifications follow commit and are suppressed when commit fails", async () => {
    let rejectCommit = true;
    let committed = false;
    let notifications = 0;
    const store = {
        saveSchema: async () => {},
        list: async () => [],
        listPushRequests: async () => [],
        create: async (
            location: object,
            input: object,
            language: string,
            accountId: string,
            id: string,
        ) => ({
            ...location,
            ...input,
            id,
            language,
            scopeId: "global",
            createdBy: accountId,
        }),
        transaction: async (operation: () => Promise<unknown>) => {
            const result = await operation();
            if (rejectCommit) throw new Error("commit_failed");
            committed = true;
            return result;
        },
    };
    const library = new LibraryService(
        store as never,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        async () => {
            assert.equal(committed, true);
            notifications++;
        },
    );
    await library.registerSchema(schema(1));
    const actor = { accountId: "admin", role: "admin" as const };
    const input = {
        schemaId: "test-language",
        layer: "units",
        label: "word",
        fields: {},
    };
    await assert.rejects(
        library.create(actor, { scope: "global" }, input),
        /commit_failed/,
    );
    assert.equal(notifications, 0);
    rejectCommit = false;
    await library.create(actor, { scope: "global" }, input);
    assert.equal(notifications, 1);
});
