import test from "node:test";
import assert from "node:assert/strict";
import { InMemoryTestExecutor } from "../../db/tests/in-memory-test-executor.js";
import { DbKeyringVaultStore } from "../../../adapters/auth/keyring/store.js";

test("keyring vaults persist opaque envelopes in their own database table", async () => {
    const db = new InMemoryTestExecutor();
    const store = new DbKeyringVaultStore(db);
    await store.ensureSchema();

    const envelope = JSON.stringify({
        version: 1,
        salt: "salt",
        iv: "iv",
        cipher: "opaque-ciphertext",
        updatedAt: "2026-07-28T00:00:00.000Z",
    });
    await store.set("account-a", envelope);
    const restartedStore = new DbKeyringVaultStore(db);
    await restartedStore.ensureSchema();
    assert.equal(await restartedStore.get("account-a"), envelope);

    const replacement = envelope.replace("opaque-ciphertext", "new-cipher");
    await restartedStore.set("account-a", replacement);
    assert.equal(await store.get("account-a"), replacement);

    await store.delete("account-a");
    assert.equal(await store.get("account-a"), null);
});
