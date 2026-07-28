import test from "node:test";
import assert from "node:assert/strict";
import { webcrypto } from "node:crypto";
import { uiCtx } from "../reuse/ui-ctx.js";

const values = new Map();
Object.defineProperty(globalThis, "crypto", {
    configurable: true,
    value: webcrypto,
});
globalThis.localStorage = {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, String(value)),
    removeItem: (key) => values.delete(key),
};
let confirmationInvalidations = 0;
uiCtx.capabilities.contribute(
    "auth:invalidatePasswordConfirmation",
    async () => {
        confirmationInvalidations += 1;
        return true;
    },
);

test("encrypted keyring unlocks, persists share secrets, and relocks", async () => {
    const keyring = await import("../../adapters/auth/keyring/ui/keyring.js");
    assert.equal(await keyring.unlockKeyring("account-password"), true);
    assert.equal(keyring.isKeyringUnlocked(), true);
    await keyring.setKeyringValue("share:token-1", "share-password");
    await keyring.setKeyringRelockMinutes(15);
    assert.equal(keyring.getKeyringValue("share:token-1"), "share-password");
    assert.equal(keyring.getKeyringRelockMinutes(), 15);
    assert.doesNotMatch(values.get("cognis_secure_keyring"), /share-password/);

    await keyring.lockKeyring();
    assert.equal(keyring.isKeyringUnlocked(), false);
    assert.equal(keyring.getKeyringValue("share:token-1"), null);
    assert.equal(await keyring.unlockKeyring("wrong-password"), false);
    assert.equal(await keyring.unlockKeyring("account-password"), true);
    assert.equal(keyring.getKeyringValue("share:token-1"), "share-password");
    await keyring.lockKeyring();
});

test("locked keyring retains new secrets only for the active session", async () => {
    const keyring = await import("../../adapters/auth/keyring/ui/keyring.js");
    await keyring.setKeyringValue("share:session-token", "share-password");
    assert.equal(
        keyring.getKeyringValue("share:session-token"),
        "share-password",
    );
    assert.doesNotMatch(
        values.get("cognis_secure_keyring") ?? "",
        /session-token|share-password/,
    );
    await keyring.lockKeyring();
    assert.equal(keyring.getKeyringValue("share:session-token"), null);
});

test("keyring lists metadata and replaces an invalid stored secret", async () => {
    const keyring = await import("../../adapters/auth/keyring/ui/keyring.js");
    assert.equal(await keyring.unlockKeyring("account-password"), true);
    await keyring.setKeyringValue("meeting:one:password", "stale", {
        label: "Weekly meeting",
        source: "test",
    });
    let invalidReported = false;
    const resolved = await keyring.resolveKeyringValue("meeting:one:password", {
        validate: (value) => value === "current",
        prompt: ({ invalid }) => (invalid ? "current" : null),
        onInvalid: () => {
            invalidReported = true;
        },
        metadata: { label: "Weekly meeting", source: "test" },
    });
    assert.equal(resolved, "current");
    assert.equal(invalidReported, true);
    assert.equal(
        keyring
            .listKeyringEntries()
            .find((entry) => entry.id === "meeting:one:password")?.label,
        "Weekly meeting",
    );
    assert.equal(
        await keyring.deleteKeyringValue("meeting:one:password"),
        true,
    );
    await keyring.lockKeyring();
});

test("component keyring scopes derive the stored source name", async () => {
    const keyring = await import("../../adapters/auth/keyring/ui/keyring.js");
    assert.equal(await keyring.unlockKeyring("account-password"), true);
    const scoped = keyring.createKeyringScope("Calendar Gateway");
    await scoped.set("calendar:secret", "value", { label: "Calendar" });
    assert.equal(
        keyring
            .listKeyringEntries()
            .find((entry) => entry.id === "calendar:secret")?.source,
        "Calendar Gateway",
    );
    await keyring.lockKeyring();
});

test("locked keyring accepts an updated automatic lock timeout", async () => {
    const keyring = await import("../../adapters/auth/keyring/ui/keyring.js");
    await keyring.lockKeyring();
    await keyring.setKeyringRelockMinutes(60);
    assert.equal(keyring.isKeyringUnlocked(), false);
    assert.equal(keyring.getKeyringRelockMinutes(), 60);
});

test("locked keyring exposes no entry metadata or decrypted values", async () => {
    const keyring = await import("../../adapters/auth/keyring/ui/keyring.js");
    await keyring.unlockKeyring("account-password");
    await keyring.setKeyringValue("private:secret", "sensitive-value", {
        label: "Private secret",
        componentName: "Test Component",
    });
    await keyring.lockKeyring();

    assert.deepEqual(keyring.listKeyringEntries(), []);
    assert.equal(keyring.getKeyringValue("private:secret"), null);
});
