import assert from "node:assert/strict";
import test from "node:test";
import { structuredStore } from "../../../../gateways/reuse/tests/structured-store.js";
import { DbKeyringVaultStore } from "../store.js";
import {
    boundedVaultBytes,
    DEFAULT_MAX_VAULT_BYTES,
    MAX_VAULT_BYTES,
} from "../limits.js";
import { createKeyringRoutes } from "../api/routes/index.js";

test("vault storage uses bounded Unicode rows and atomic replacement without losing existing envelopes", async () => {
    const fixture = structuredStore();
    const store = new DbKeyringVaultStore(fixture.db);
    await store.ensureSchema();
    const original = JSON.stringify({ cipher: "猫𠮷".repeat(20000) });
    await store.set("alice", original);
    const restarted = new DbKeyringVaultStore(fixture.db);
    assert.equal(await restarted.get("alice"), original);
    assert.ok(fixture.rows("auth_keyring_vault_parts").length > 1);
    fixture.fail(
        (command) =>
            command.option === "INSERT" &&
            command.table === "auth_keyring_vault_parts",
    );
    await assert.rejects(
        store.set("alice", original + "different"),
        /storage_failed/,
    );
    fixture.fail(() => false);
    assert.equal(await restarted.get("alice"), original);
    await store.set("bob", "other-account");
    await store.set("alice", "shorter");
    assert.equal(await store.get("alice"), "shorter");
    assert.equal(fixture.rows("auth_keyring_vault_parts").length, 0);
    await store.delete("alice");
    assert.equal(await store.get("alice"), null);
    assert.equal(await store.get("bob"), "other-account");
});

test("keyring request limits reject an oversized stream before buffering the rest or writing storage", async () => {
    let consumedRest = false;
    let wrote = false;
    let status = 0;
    const route = createKeyringRoutes({
        routeContext: { requireAuth: () => ({ sub: "alice", role: "user" }) },
        getAccountInstanceId: async () => "instance",
        getPolicy: () => ({ maxVaultBytes: 64, derivationIterations: 310000 }),
        store: {
            ensureSchema: async () => {},
            get: async () => null,
            set: async () => {
                wrote = true;
            },
            delete: async () => {},
        },
    });
    const request = {
        method: "PUT",
        async *[Symbol.asyncIterator]() {
            yield Buffer.alloc(1100);
            consumedRest = true;
            yield Buffer.alloc(1100);
        },
    };
    await route(
        request as never,
        {
            writeHead: (code: number) => {
                status = code;
            },
            end() {},
        } as never,
        new URL("http://localhost/api/v1/auth/keyring"),
    );
    assert.equal(status, 413);
    assert.equal(consumedRest, false);
    assert.equal(wrote, false);
    assert.equal(boundedVaultBytes(), DEFAULT_MAX_VAULT_BYTES);
    assert.equal(boundedVaultBytes(2_000 * 1024 * 1024), MAX_VAULT_BYTES);
});
