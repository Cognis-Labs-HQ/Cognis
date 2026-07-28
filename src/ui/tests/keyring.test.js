import test from "node:test";
import assert from "node:assert/strict";
import { webcrypto } from "node:crypto";

const values = new Map();
globalThis.crypto = webcrypto;
globalThis.localStorage = {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, String(value)),
    removeItem: (key) => values.delete(key),
};

test("encrypted keyring unlocks, persists share secrets, and relocks", async () => {
    const keyring = await import("../reuse/keyring.js");
    assert.equal(await keyring.unlockKeyring("account-password"), true);
    await keyring.setKeyringValue("share:token-1", "share-password");
    await keyring.setKeyringRelockMinutes(15);
    assert.equal(keyring.getKeyringValue("share:token-1"), "share-password");
    assert.equal(keyring.getKeyringRelockMinutes(), 15);
    assert.doesNotMatch(values.get("cognis_secure_keyring"), /share-password/);

    keyring.lockKeyring();
    assert.equal(keyring.getKeyringValue("share:token-1"), null);
    assert.equal(await keyring.unlockKeyring("wrong-password"), false);
    assert.equal(await keyring.unlockKeyring("account-password"), true);
    assert.equal(keyring.getKeyringValue("share:token-1"), "share-password");
    keyring.lockKeyring();
});

test("locked keyring retains new secrets only for the active session", async () => {
    const keyring = await import("../reuse/keyring.js");
    await keyring.setKeyringValue("share:session-token", "share-password");
    assert.equal(
        keyring.getKeyringValue("share:session-token"),
        "share-password",
    );
    assert.doesNotMatch(
        values.get("cognis_secure_keyring") ?? "",
        /session-token|share-password/,
    );
    keyring.lockKeyring();
    assert.equal(keyring.getKeyringValue("share:session-token"), null);
});
