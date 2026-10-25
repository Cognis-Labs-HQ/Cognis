import assert from "node:assert/strict";
import test from "node:test";
import {
    authenticate,
    cachedVaultKey,
    indexedDbValues,
    keyringApiFetch,
    remoteVaults,
    resetBrowserStorage,
    values,
} from "./ui-environment.js";

const request = {
    component: "Isolation test",
    action: "read",
    process: "private secret",
};
const create = (keyring, password) =>
    keyring.createKeyring({ requestSetupPassword: async () => password });

test("unlock never creates a missing vault or shows a password prompt", async () => {
    resetBrowserStorage();
    const keyring = await import("../ui/keyring.js?missing-vault");
    let prompts = 0;
    assert.equal(await keyring.unlockKeyring("arbitrary-password"), false);
    assert.equal(
        await keyring.requestKeyringUnlock({
            request,
            passwordPrompt: async () => {
                prompts++;
                return "password";
            },
        }),
        false,
    );
    assert.equal(prompts, 0);
    assert.equal(remoteVaults.size, 0);
    assert.equal(await create(keyring, "real-password"), true);
    await keyring.lockKeyring();
    assert.equal(await keyring.unlockKeyring("wrong-password"), false);
    assert.equal(await keyring.unlockKeyring("real-password"), true);
    assert.equal(indexedDbValues.size, 0);
    await keyring.lockKeyring();
});

test("two accounts retain separate ciphertext and cannot read or write through a retired component scope", async () => {
    resetBrowserStorage();
    authenticate("alice");
    const keyring = await import("../ui/keyring.js?two-accounts");
    assert.equal(await create(keyring, "alice-password"), true);
    const alice = keyring.createKeyringScope("Alice component");
    await alice.set("token", "alice-secret");
    const aliceCache = values.get(cachedVaultKey());
    authenticate("bob");
    assert.equal(keyring.getKeyringValue("token"), null);
    assert.throws(() => alice.get("token"), { name: "AbortError" });
    assert.throws(() => alice.set("token", "stale-write"), {
        name: "AbortError",
    });
    assert.equal(await create(keyring, "bob-password"), true);
    assert.equal(keyring.getKeyringValue("token"), null);
    await keyring.setKeyringValue("token", "bob-secret");
    assert.equal(values.get(cachedVaultKey("alice")), aliceCache);
    authenticate("alice");
    assert.equal(await keyring.unlockKeyring("bob-password"), false);
    assert.equal(await keyring.unlockKeyring("alice-password"), true);
    assert.equal(keyring.getKeyringValue("token"), "alice-secret");
    assert.ok(values.has(cachedVaultKey("bob")));
    assert.doesNotMatch(
        aliceCache,
        /alice-secret|alice-password|session:alice/,
    );
    await keyring.lockKeyring();
});

test("the same account on different origins retains separate password-protected vaults", async () => {
    resetBrowserStorage();
    authenticate("alice", "https://one.test");
    const keyring = await import("../ui/keyring.js?two-origins");
    assert.equal(await create(keyring, "one-password"), true);
    await keyring.setKeyringValue("token", "instance-one");
    const firstKey = cachedVaultKey();
    const firstCache = values.get(firstKey);
    authenticate("alice", "https://two.test");
    assert.equal(keyring.getKeyringValue("token"), null);
    assert.equal(await keyring.unlockKeyring("one-password"), false);
    assert.equal(await create(keyring, "two-password"), true);
    await keyring.setKeyringValue("token", "instance-two");
    assert.notEqual(firstKey, cachedVaultKey());
    assert.equal(values.get(firstKey), firstCache);
    authenticate("alice", "https://one.test");
    assert.equal(await keyring.unlockKeyring("two-password"), false);
    assert.equal(await keyring.unlockKeyring("one-password"), true);
    assert.equal(keyring.getKeyringValue("token"), "instance-one");
    await keyring.lockKeyring();
});

test("a server account-instance change cannot adopt the previous instance's encrypted cache", async () => {
    resetBrowserStorage();
    authenticate("alice");
    const keyring = await import("../ui/keyring.js?instance-replaced");
    assert.equal(await create(keyring, "old-password"), true);
    await keyring.setKeyringValue("token", "old-secret");
    const oldCache = values.get(cachedVaultKey());
    const originalFetch = globalThis.fetch;
    globalThis.fetch = async () =>
        new Response(
            JSON.stringify({
                data: {
                    accountId: "alice",
                    accountInstanceId: "new-server-instance",
                    vault: null,
                },
            }),
        );
    try {
        assert.equal(await keyring.unlockKeyring("old-password"), false);
        assert.equal(keyring.getKeyringValue("token"), null);
        assert.equal(values.get(cachedVaultKey()), oldCache);
    } finally {
        globalThis.fetch = originalFetch;
    }
});

test("a cached vault cannot be read when the authenticated server account mismatches browser state", async () => {
    resetBrowserStorage();
    authenticate("alice");
    const keyring = await import("../ui/keyring.js?server-mismatch");
    assert.equal(await create(keyring, "alice-password"), true);
    await keyring.setKeyringValue("token", "alice-secret");
    const originalFetch = globalThis.fetch;
    globalThis.fetch = async () =>
        new Response(
            JSON.stringify({
                data: {
                    accountId: "bob",
                    accountInstanceId: "instance:alice",
                    vault: null,
                },
            }),
        );
    try {
        assert.equal(await keyring.unlockKeyring("alice-password"), false);
        assert.equal(keyring.getKeyringValue("token"), null);
    } finally {
        globalThis.fetch = originalFetch;
    }
});

test("changing accounts while a password prompt is pending cancels the old unlock", async () => {
    resetBrowserStorage();
    authenticate("alice");
    const keyring = await import("../ui/keyring.js?prompt-switch");
    await create(keyring, "alice-password");
    await keyring.lockKeyring();
    let finishPrompt;
    let opened;
    const promptOpened = new Promise((resolve) => {
        opened = resolve;
    });
    const pending = keyring.requestKeyringUnlock({
        request,
        i18n: { t: (key) => key },
        passwordPrompt: ({ signal }) => {
            opened(signal);
            return new Promise((resolve) => {
                finishPrompt = resolve;
            });
        },
    });
    const signal = await promptOpened;
    authenticate("bob");
    assert.equal(keyring.isKeyringUnlocked(), false);
    assert.equal(signal.aborted, true);
    finishPrompt("alice-password");
    await assert.rejects(pending, { name: "AbortError" });
    assert.equal(remoteVaults.size, 1);
    assert.equal(keyring.getKeyringValue("token"), null);
});

test("a delayed encrypted write cannot be committed into another account's cache", async () => {
    resetBrowserStorage();
    authenticate("alice");
    const keyring = await import("../ui/keyring.js?write-switch");
    await create(keyring, "alice-password");
    const oldCache = values.get(cachedVaultKey());
    const encrypt = crypto.subtle.encrypt.bind(crypto.subtle);
    let release;
    let started;
    const entered = new Promise((resolve) => {
        started = resolve;
    });
    crypto.subtle.encrypt = async (...args) => {
        started();
        await new Promise((resolve) => {
            release = resolve;
        });
        return encrypt(...args);
    };
    try {
        const pending = keyring.setKeyringValue("token", "stale-alice-secret");
        await entered;
        authenticate("bob");
        assert.equal(keyring.isKeyringUnlocked(), false);
        release();
        await assert.rejects(pending, { name: "AbortError" });
        assert.equal(values.get(cachedVaultKey("alice")), oldCache);
        assert.equal(values.has(cachedVaultKey("bob")), false);
    } finally {
        crypto.subtle.encrypt = encrypt;
        globalThis.fetch = keyringApiFetch;
    }
});
