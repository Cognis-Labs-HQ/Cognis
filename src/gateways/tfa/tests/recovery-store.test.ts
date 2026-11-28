import test from "node:test";
import assert from "node:assert/strict";
import { DatabaseTfaStore } from "../reuse/tfa-store.js";
import { InMemoryTestExecutor } from "../../db/tests/in-memory-test-executor.js";

test("DatabaseTfaStore.consumeRecoveryCode consumes a code only once", async () => {
    const db = new InMemoryTestExecutor();
    const store = new DatabaseTfaStore(db);
    await store.ensureSchema();
    await store.replaceRecoveryCodes("alice", ["ABCD-1234"]);

    assert.equal(await store.consumeRecoveryCode("alice", "ABCD-1234"), true);
    assert.equal(await store.consumeRecoveryCode("alice", "ABCD-1234"), false);
    assert.equal(await store.countUnusedRecoveryCodes("alice"), 0);
});
