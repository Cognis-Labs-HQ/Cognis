import test from "node:test";
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import { deleteProviderContent } from "../../service/content-cleanup.js";
import { createLibraryFlow } from "../reuse/flows.js";
import type { LibraryStore } from "../../store.js";

const root = fileURLToPath(
    new URL("../fixtures/external-pack", import.meta.url),
);

function fixture() {
    const deleted: string[] = [];
    let forgotten = false;
    const entries = [{ id: "provider" }, { id: "dependent" }];
    const store = {
        async transaction(operation: () => Promise<unknown>) {
            try {
                return await operation();
            } catch (error) {
                deleted.length = 0;
                forgotten = false;
                throw error;
            }
        },
        async contentPackEntries() {
            return entries.slice(0, 1);
        },
        async resolveDeletionCascade(
            ids: string[],
            _db: unknown,
            includeRestricted: boolean,
        ) {
            assert.deepEqual(ids, ["provider"]);
            assert.equal(includeRestricted, true);
            return entries.map(({ id }) => id);
        },
        async get(id: string) {
            return entries.find((entry) => entry.id === id);
        },
        async deleteEntries(ids: string[], _actor: string, blacklist: boolean) {
            assert.equal(blacklist, false);
            deleted.push(...ids);
        },
        async forgetContentPack() {
            forgotten = true;
        },
    };
    return {
        store: store as unknown as LibraryStore,
        deleted,
        forgotten: () => forgotten,
    };
}

test("provider uninstall removes dependents and pack receipts through the deletion flow", async () => {
    const state = fixture();
    const runs: string[] = [];
    const removed = await deleteProviderContent(
        root,
        state.store,
        createLibraryFlow((id) => runs.push(id)),
    );
    assert.deepEqual(state.deleted, ["provider", "dependent"]);
    assert.equal(state.forgotten(), true);
    assert.deepEqual(
        removed.map(({ id }) => id),
        state.deleted,
    );
    assert.deepEqual(runs, ["study:library:delete"]);
});

test("a rejected audit stage rolls back provider deletion and permits reinstall", async () => {
    const state = fixture();
    const flow = createLibraryFlow();
    flow.extend("study:library:delete", "audit", { id: "reject" }, () => {
        throw new Error("audit_rejected");
    });
    await assert.rejects(
        deleteProviderContent(root, state.store, flow),
        /audit_rejected/,
    );
    assert.deepEqual(state.deleted, []);
    assert.equal(state.forgotten(), false);
});
