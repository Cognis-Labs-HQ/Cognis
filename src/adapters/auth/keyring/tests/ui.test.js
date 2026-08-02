import test from "node:test";
import assert from "node:assert/strict";
import { webcrypto } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { uiCtx } from "../../../../ui/reuse/ui-ctx.js";

const values = new Map();
const sessionValues = new Map();
const indexedDbValues = new Map();
Object.defineProperty(globalThis, "crypto", {
    configurable: true,
    value: webcrypto,
});
globalThis.localStorage = {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, String(value)),
    removeItem: (key) => values.delete(key),
};
globalThis.sessionStorage = {
    getItem: (key) => sessionValues.get(key) ?? null,
    setItem: (key, value) => sessionValues.set(key, String(value)),
    removeItem: (key) => sessionValues.delete(key),
};
globalThis.indexedDB = {
    open() {
        const request = {};
        const database = {
            objectStoreNames: {
                contains: () => true,
            },
            createObjectStore() {},
            transaction() {
                const transaction = {
                    objectStore() {
                        return {
                            put(record) {
                                indexedDbValues.set(record.id, record);
                                queueMicrotask(() =>
                                    transaction.oncomplete?.(),
                                );
                            },
                            get(id) {
                                const getRequest = {};
                                queueMicrotask(() => {
                                    getRequest.result = indexedDbValues.get(id);
                                    getRequest.onsuccess?.();
                                });
                                return getRequest;
                            },
                            delete(id) {
                                indexedDbValues.delete(id);
                                queueMicrotask(() =>
                                    transaction.oncomplete?.(),
                                );
                            },
                        };
                    },
                };
                return transaction;
            },
            close() {},
        };
        queueMicrotask(() => {
            request.result = database;
            request.onsuccess?.();
        });
        return request;
    },
};
let confirmationInvalidations = 0;
let unlockPromptCount = 0;
let lastUnlockPrompt = null;
uiCtx.capabilities.contribute(
    "auth:invalidatePasswordConfirmation",
    async () => {
        confirmationInvalidations += 1;
        return true;
    },
);

async function testPasswordPrompt(prompt) {
    unlockPromptCount += 1;
    lastUnlockPrompt = prompt;
    return "account-password";
}

const testI18n = {
    t: (key) =>
        key === "adapter.auth.keyring.unlock_message"
            ? "{{component}} requested {{action}} {{process}}"
            : key,
};
const testUnlockRequest = {
    component: "Test Component",
    action: "read",
    process: "test secret",
};

test("unlock wording names only the keyring password without variable quotes", () => {
    const strings = readFileSync(
        resolve("src/adapters/auth/keyring/ui/languages/en/strings.xml"),
        "utf8",
    );
    const unlockMessage =
        strings.match(
            /name="adapter\.auth\.keyring\.unlock_message">([^<]+)/,
        )?.[1] ?? "";
    const unlockPrompt =
        strings.match(
            /name="adapter\.auth\.keyring\.unlock_prompt">([^<]+)/,
        )?.[1] ?? "";
    assert.match(unlockMessage, /requested access to the keyring/);
    assert.match(unlockPrompt, /keyring password/);
    assert.doesNotMatch(
        `${unlockMessage} ${unlockPrompt}`,
        /account password|[“”]/i,
    );
});

test("cancelled access exposes an attributed manual unlock control", () => {
    const source = readFileSync(
        resolve("src/adapters/auth/keyring/ui/keyring.js"),
        "utf8",
    );
    assert.match(source, /cognis:keyring-access-state/);
    assert.match(source, /keyring-manual-unlock/);
    assert.match(source, /manual:\s*true/);
    assert.match(source, /keyring:isAccessSuppressed/);
});

test("keyring envelope selection preserves offline data unless the account instance changed", async () => {
    const { selectKeyringEnvelope } = await import("../ui/keyring.js");
    const localEnvelope = {
        accountInstanceId: "account-instance-one",
        updatedAt: "2026-01-01T00:00:00.000Z",
    };
    assert.equal(
        selectKeyringEnvelope(localEnvelope, {
            resolved: true,
            envelope: null,
            accountInstanceId: "account-instance-one",
        }),
        localEnvelope,
    );
    assert.equal(
        selectKeyringEnvelope(localEnvelope, {
            resolved: true,
            envelope: null,
            accountInstanceId: "account-instance-two",
        }),
        null,
    );
});

test("encrypted keyring unlocks, persists share secrets, and relocks", async () => {
    const keyring = await import("../ui/keyring.js");
    assert.equal(await keyring.unlockKeyring("account-password"), true);
    assert.equal(keyring.isKeyringUnlocked(), true);
    await keyring.setKeyringValue("share:token-1", "share-password");
    await keyring.setKeyringRelockMinutes(15);
    const expiryKey = [...sessionValues.keys()].find((key) =>
        key.startsWith("cognis_keyring_session_expires_at:"),
    );
    const expiry = sessionValues.get(expiryKey);
    assert.equal(keyring.getKeyringValue("share:token-1"), "share-password");
    assert.equal(sessionValues.get(expiryKey), expiry);
    assert.equal(keyring.getKeyringRelockMinutes(), 15);
    assert.doesNotMatch(values.get("cognis_secure_keyring"), /share-password/);

    await keyring.lockKeyring();
    assert.equal(keyring.isKeyringUnlocked(), false);
    assert.equal(keyring.getKeyringValue("share:token-1"), null);
    assert.equal(await keyring.unlockKeyring("wrong-password"), false);
    assert.equal(await keyring.unlockKeyring("account-password"), true);
    assert.equal(keyring.getKeyringValue("share:token-1"), "share-password");
    await keyring.setKeyringRelockMinutes(0);
    assert.equal(sessionValues.has(expiryKey), false);
    await keyring.lockKeyring();
});

test("all consumers share one unlock state and one pending prompt", async () => {
    const keyring = await import("../ui/keyring.js");
    unlockPromptCount = 0;

    const [firstResult, secondResult] = await Promise.all([
        keyring.requestKeyringUnlock({
            i18n: testI18n,
            passwordPrompt: testPasswordPrompt,
            request: testUnlockRequest,
        }),
        keyring.requestKeyringUnlock({
            i18n: testI18n,
            passwordPrompt: testPasswordPrompt,
            request: testUnlockRequest,
        }),
    ]);

    assert.equal(firstResult, true);
    assert.equal(secondResult, true);
    assert.equal(unlockPromptCount, 1);
    assert.equal(
        lastUnlockPrompt.message,
        "Test Component requested read test secret",
    );
    assert.equal(keyring.isKeyringUnlocked(), true);
    assert.equal(
        await keyring.resolveKeyringValue("share:token-1", {
            request: testUnlockRequest,
        }),
        "share-password",
    );
    assert.equal(unlockPromptCount, 1);
    await keyring.lockKeyring();
});

test("unlock requests require component, action, and process context", async () => {
    const keyring = await import("../ui/keyring.js");
    await assert.rejects(
        keyring.requestKeyringUnlock({
            i18n: testI18n,
            request: { component: "Test Component", action: "read" },
        }),
        /keyring_unlock_request_context_required/,
    );
});

test("component scopes attribute direct unlock requests to their owner", async () => {
    const keyring = await import("../ui/keyring.js");
    const messagesKeyring = keyring.createKeyringScope("Social Messages");
    lastUnlockPrompt = null;

    assert.equal(
        await messagesKeyring.requestUnlock({
            i18n: testI18n,
            passwordPrompt: testPasswordPrompt,
            request: {
                component: "Keyring",
                action: "load",
                process: "chat secrets",
            },
        }),
        true,
    );
    assert.equal(
        lastUnlockPrompt.message,
        "Social Messages requested load chat secrets",
    );
    await keyring.lockKeyring();
});

test("a page reload restores the non-extractable session unlock without prompting", async () => {
    const keyring = await import("../ui/keyring.js");
    values.clear();
    sessionValues.clear();
    indexedDbValues.clear();
    localStorage.setItem("cognis_account", "session-restore-user");
    assert.equal(await keyring.unlockKeyring("keyring-password"), true);
    await keyring.setKeyringRelockMinutes(5);
    await keyring.setKeyringValue("chatroom:session:key", "room-key");
    const expiryKey = [...sessionValues.keys()].find((key) =>
        key.startsWith("cognis_keyring_session_expires_at:"),
    );
    const expiry = sessionValues.get(expiryKey);

    const reloadedKeyring = await import("../ui/keyring.js?session-restore");
    let prompted = false;
    assert.equal(
        await reloadedKeyring.requestKeyringUnlock({
            i18n: testI18n,
            passwordPrompt: async () => {
                prompted = true;
                return "keyring-password";
            },
            request: testUnlockRequest,
        }),
        true,
    );
    assert.equal(prompted, false);
    assert.equal(sessionValues.get(expiryKey), expiry);
    assert.equal(
        reloadedKeyring.getKeyringValue("chatroom:session:key"),
        "room-key",
    );
    await reloadedKeyring.lockKeyring();
    await keyring.lockKeyring();
    localStorage.removeItem("cognis_account");
});

test("a finite keyring deadline cannot be extended by reloading", async () => {
    const keyring = await import("../ui/keyring.js");
    localStorage.setItem("cognis_account", "expired-session-user");
    assert.equal(await keyring.unlockKeyring("account-password"), true);
    await keyring.setKeyringRelockMinutes(5);
    const expiryKey = [...sessionValues.keys()].find((key) =>
        key.includes(encodeURIComponent("expired-session-user")),
    );
    sessionValues.set(expiryKey, String(Date.now() - 1));

    const reloadedKeyring = await import("../ui/keyring.js?expired-session");
    let prompted = false;
    assert.equal(
        await reloadedKeyring.requestKeyringUnlock({
            i18n: testI18n,
            passwordPrompt: async () => {
                prompted = true;
                return "account-password";
            },
            request: testUnlockRequest,
        }),
        true,
    );
    assert.equal(prompted, true);

    await reloadedKeyring.lockKeyring();
    await keyring.lockKeyring();
    localStorage.removeItem("cognis_account");
});

test("locked keyring retains new secrets only for the active session", async () => {
    const keyring = await import("../ui/keyring.js");
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
    const keyring = await import("../ui/keyring.js");
    assert.equal(await keyring.unlockKeyring("account-password"), true);
    await keyring.setKeyringValue("meeting:one:password", "stale", {
        label: "Weekly meeting",
        source: "test",
    });
    let invalidReported = false;
    const resolved = await keyring.resolveKeyringValue("meeting:one:password", {
        request: testUnlockRequest,
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
    const keyring = await import("../ui/keyring.js");
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

test("keyring logs access, clears values, and changes its encryption password", async () => {
    const keyring = await import("../ui/keyring.js");
    assert.equal(await keyring.unlockKeyring("account-password"), true);
    await keyring.setKeyringValue("test:logged-secret", "secret");
    assert.equal(keyring.getKeyringValue("test:logged-secret"), "secret");

    const eventTypes = keyring
        .listKeyringEvents()
        .map((event) => `${event.type}:${event.identifier}`);
    assert.ok(eventTypes.includes("write:test:logged-secret"));
    assert.ok(eventTypes.includes("read:test:logged-secret"));

    assert.equal(await keyring.clearKeyringValues(), true);
    assert.equal(keyring.getKeyringValue("test:logged-secret"), null);
    assert.ok(
        keyring.listKeyringEvents().some((event) => event.type === "clear"),
    );

    for (let index = 0; index < 125; index += 1) {
        keyring.getKeyringValue("test:event-retention");
    }
    assert.ok(keyring.listKeyringEvents().length > 100);

    assert.equal(
        await keyring.changeKeyringPassword("changed-keyring-password"),
        true,
    );
    await keyring.lockKeyring();
    assert.equal(await keyring.unlockKeyring("account-password"), false);
    assert.equal(await keyring.unlockKeyring("changed-keyring-password"), true);
    await keyring.changeKeyringPassword("account-password");
    await keyring.lockKeyring();
});

test("locked keyring accepts an updated automatic lock timeout", async () => {
    const keyring = await import("../ui/keyring.js");
    await keyring.lockKeyring();
    await keyring.setKeyringRelockMinutes(60);
    assert.equal(keyring.isKeyringUnlocked(), false);
    assert.equal(keyring.getKeyringRelockMinutes(), 60);
});

test("locked keyring exposes no entry metadata or decrypted values", async () => {
    const keyring = await import("../ui/keyring.js");
    await keyring.unlockKeyring("account-password");
    await keyring.setKeyringValue("private:secret", "sensitive-value", {
        label: "Private secret",
        componentName: "Test Component",
    });
    await keyring.lockKeyring();

    assert.deepEqual(keyring.listKeyringEntries(), []);
    assert.equal(keyring.getKeyringValue("private:secret"), null);
});

test("temporary guest keyrings stay unlocked and use session storage", async () => {
    const keyring = await import("../ui/keyring.js");
    localStorage.setItem("cognis_account", "share:share-1:guest-1");

    assert.equal(
        await keyring.activateTemporaryKeyring(
            "share:share-1:guest-1",
            "derived-guest-passphrase",
        ),
        true,
    );
    await keyring.setKeyringValue("chatroom:room-1:key", "room-key");
    await keyring.lockKeyring();

    assert.equal(keyring.isKeyringUnlocked(), true);
    assert.equal(keyring.getKeyringValue("chatroom:room-1:key"), "room-key");
    assert.ok(
        sessionValues.has("cognis_secure_keyring:share%3Ashare-1%3Aguest-1"),
    );
    keyring.endTemporaryKeyring();
    assert.equal(keyring.isKeyringUnlocked(), false);
    assert.equal(sessionValues.size, 0);
    localStorage.removeItem("cognis_account");
});

test("first login sets up a new keyring with the selected encryption password", async () => {
    const keyring = await import("../ui/keyring.js");
    values.clear();
    sessionValues.clear();
    localStorage.setItem("cognis_account", "new-user");

    const result = await keyring.setupKeyringAfterLogin("account-password", {
        requestSetupPassword: async (accountPassword) => {
            assert.equal(accountPassword, "account-password");
            return "custom-keyring-password";
        },
    });

    assert.deepEqual(result, { setup: true, unlocked: true });
    assert.equal(keyring.isKeyringUnlocked(), true);
    assert.ok(values.has("cognis_secure_keyring:new-user"));
    await keyring.lockKeyring();
    assert.equal(await keyring.unlockKeyring("account-password"), false);
    assert.equal(await keyring.unlockKeyring("custom-keyring-password"), true);
    await keyring.lockKeyring();
    localStorage.removeItem("cognis_account");
});

test("login silently leaves the keyring locked when its password differs", async () => {
    const keyring = await import("../ui/keyring.js");
    values.clear();
    sessionValues.clear();
    localStorage.setItem("cognis_account", "separate-keyring-password-user");
    assert.equal(await keyring.unlockKeyring("keyring-password"), true);
    await keyring.setKeyringValue("chatroom:one:key", "room-key");
    await keyring.lockKeyring();

    const result = await keyring.setupKeyringAfterLogin("account-password");

    assert.deepEqual(result, { setup: false, unlocked: false });
    assert.equal(keyring.isKeyringUnlocked(), false);
    assert.equal(await keyring.unlockKeyring("keyring-password"), true);
    assert.equal(keyring.getKeyringValue("chatroom:one:key"), "room-key");
    await keyring.lockKeyring();
    localStorage.removeItem("cognis_account");
});

test("new keyring setup can be deferred until the dashboard is visible", async () => {
    const keyring = await import("../ui/keyring.js");
    values.clear();
    sessionValues.clear();
    localStorage.setItem("cognis_account", "deferred-user");

    assert.deepEqual(
        await keyring.setupKeyringAfterLogin("account-password", {
            deferNewSetup: true,
        }),
        { setup: false, unlocked: false, deferred: true },
    );
    assert.equal(uiCtx.capabilities.get("keyring:hasDeferredSetup")?.(), true);

    assert.deepEqual(
        await keyring.setupKeyringAfterLogin("", {
            requestSetupPassword: async () => "dashboard-password",
        }),
        { setup: true, unlocked: true },
    );
    assert.equal(uiCtx.capabilities.get("keyring:hasDeferredSetup")?.(), false);
    await keyring.lockKeyring();
    localStorage.removeItem("cognis_account");
});

test("server-side deletion invalidates the browser keyring copy on login", async () => {
    const keyring = await import("../ui/keyring.js");
    values.clear();
    localStorage.setItem("cognis_account", "deleted-ldap-user");
    assert.equal(await keyring.unlockKeyring("old-password"), true);
    await keyring.setKeyringValue("test:deleted-secret", "old-secret");
    await keyring.lockKeyring();
    const browserEnvelope = JSON.parse(
        values.get("cognis_secure_keyring:deleted-ldap-user"),
    );
    browserEnvelope.accountInstanceId = "original-instance";
    values.set(
        "cognis_secure_keyring:deleted-ldap-user",
        JSON.stringify(browserEnvelope),
    );

    const originalFetch = globalThis.fetch;
    globalThis.fetch = async (requestPath, options = {}) =>
        new Response(
            options.method === "PUT"
                ? JSON.stringify({ data: { saved: true } })
                : JSON.stringify({
                      data: {
                          vault: null,
                          accountInstanceId: "replacement-instance",
                      },
                  }),
            {
                status: 200,
                headers: { "content-type": "application/json" },
            },
        );
    try {
        const result = await keyring.setupKeyringAfterLogin(
            "account-password",
            {
                requestSetupPassword: async () => "replacement-password",
            },
        );

        assert.deepEqual(result, { setup: true, unlocked: true });
        assert.equal(keyring.getKeyringValue("test:deleted-secret"), null);
        assert.equal(
            values.has("cognis_secure_keyring:deleted-ldap-user"),
            true,
        );
        assert.equal(
            JSON.parse(values.get("cognis_secure_keyring:deleted-ldap-user"))
                .accountInstanceId,
            "replacement-instance",
        );
    } finally {
        globalThis.fetch = originalFetch;
        await keyring.lockKeyring();
        localStorage.removeItem("cognis_account");
    }
});

test("empty keyring setup password falls back to the account password", async () => {
    const keyring = await import("../ui/keyring.js");
    assert.equal(
        keyring.resolveKeyringSetupPassword("", "account-password"),
        "account-password",
    );
    assert.equal(
        keyring.resolveKeyringSetupPassword(
            "custom-keyring-password",
            "account-password",
        ),
        "custom-keyring-password",
    );
});

test("destroying a locked keyring recreates an empty vault", async () => {
    const keyring = await import("../ui/keyring.js");
    assert.equal(await keyring.unlockKeyring("account-password"), true);
    await keyring.setKeyringValue("chatroom:destroy:key", "old-room-key");
    await keyring.lockKeyring();
    const originalFetch = globalThis.fetch;
    globalThis.fetch = async (_requestPath, options = {}) =>
        options.method === "DELETE"
            ? new Response(null, { status: 204 })
            : new Response(
                  JSON.stringify({
                      data: {
                          vault: null,
                          accountInstanceId: "replacement-instance",
                      },
                  }),
                  {
                      status: 200,
                      headers: { "content-type": "application/json" },
                  },
              );
    try {
        assert.equal(
            await keyring.destroyKeyring({
                requestSetupPassword: async () => "replacement-password",
            }),
            true,
        );
        assert.equal(keyring.getKeyringValue("chatroom:destroy:key"), null);
    } finally {
        globalThis.fetch = originalFetch;
        await keyring.lockKeyring();
    }
});

test("login requires the recreated custom keyring password after session invalidation", async () => {
    const keyring = await import("../ui/keyring.js");
    const originalFetch = globalThis.fetch;
    values.clear();
    sessionValues.clear();
    indexedDbValues.clear();
    localStorage.setItem("cognis_account", "recreated-ldap-keyring-user");
    let remoteEnvelope = null;
    const accountInstanceId = "recreated-ldap-account-instance";
    globalThis.fetch = async (_requestPath, options = {}) => {
        if (options.method === "PUT") {
            const submittedEnvelope = JSON.parse(options.body).vault;
            if (submittedEnvelope.accountInstanceId !== accountInstanceId) {
                return new Response(null, { status: 409 });
            }
            remoteEnvelope = submittedEnvelope;
            return new Response(JSON.stringify({ data: { saved: true } }), {
                status: 200,
                headers: { "content-type": "application/json" },
            });
        }
        return new Response(
            JSON.stringify({
                data: {
                    vault: remoteEnvelope,
                    accountInstanceId,
                },
            }),
            {
                status: 200,
                headers: { "content-type": "application/json" },
            },
        );
    };
    try {
        assert.equal(
            await keyring.unlockKeyring("custom-keyring-password"),
            true,
        );
        const reloadedKeyring =
            await import("../ui/keyring.js?recreated-ldap-keyring");

        assert.deepEqual(
            await reloadedKeyring.setupKeyringAfterLogin("ldap-password"),
            {
                setup: false,
                unlocked: false,
            },
        );
        let prompted = false;
        assert.equal(
            await reloadedKeyring.requestKeyringUnlock({
                i18n: testI18n,
                passwordPrompt: async () => {
                    prompted = true;
                    return "custom-keyring-password";
                },
                request: testUnlockRequest,
            }),
            true,
        );
        assert.equal(prompted, true);
        assert.equal(remoteEnvelope.accountInstanceId, accountInstanceId);
        await reloadedKeyring.lockKeyring();
    } finally {
        globalThis.fetch = originalFetch;
        await keyring.lockKeyring();
        localStorage.removeItem("cognis_account");
    }
});

test("cancelling one unlock flushes concurrent and future requests until manual unlock", async () => {
    const keyring = await import("../ui/keyring.js");
    await keyring.lockKeyring();
    let promptCount = 0;
    const cancelPrompt = async () => {
        promptCount += 1;
        return "";
    };
    const request = {
        i18n: testI18n,
        passwordPrompt: cancelPrompt,
        request: testUnlockRequest,
    };
    assert.deepEqual(
        await Promise.all([
            keyring.requestKeyringUnlock(request),
            keyring.requestKeyringUnlock(request),
        ]),
        [false, false],
    );
    assert.equal(promptCount, 1);
    assert.equal(await keyring.requestKeyringUnlock(request), false);
    assert.equal(promptCount, 1);
    assert.equal(
        await keyring.requestKeyringUnlock({
            ...request,
            manual: true,
            passwordPrompt: async () => "replacement-password",
        }),
        true,
    );
    await keyring.lockKeyring();
});

test("keyring persistence serializes concurrent vault synchronization", async () => {
    const keyring = await import("../ui/keyring.js");
    const originalFetch = globalThis.fetch;
    localStorage.setItem("cognis_account", "serialization-test-account");
    localStorage.removeItem("cognis_secure_keyring:serialization-test-account");
    localStorage.removeItem("cognis_secure_keyring");
    let activeRequests = 0;
    let maximumActiveRequests = 0;
    try {
        assert.equal(
            await keyring.unlockKeyring("serialization-password"),
            true,
        );
        globalThis.fetch = async () => {
            activeRequests += 1;
            maximumActiveRequests = Math.max(
                maximumActiveRequests,
                activeRequests,
            );
            await new Promise((resolve) => setTimeout(resolve, 5));
            activeRequests -= 1;
            return new Response(JSON.stringify({ data: { saved: true } }), {
                status: 200,
                headers: { "content-type": "application/json" },
            });
        };
        await Promise.all([
            keyring.setKeyringValue("test:serialized:first", "first"),
            keyring.setKeyringValue("test:serialized:second", "second"),
        ]);
        assert.equal(maximumActiveRequests, 1);
        assert.equal(keyring.getKeyringValue("test:serialized:first"), "first");
        assert.equal(
            keyring.getKeyringValue("test:serialized:second"),
            "second",
        );
    } finally {
        globalThis.fetch = originalFetch;
        await keyring.lockKeyring();
        localStorage.removeItem("cognis_account");
    }
});

test("keyring persistence surfaces definitive server rejection", async () => {
    const keyring = await import("../ui/keyring.js");
    const originalFetch = globalThis.fetch;
    localStorage.setItem("cognis_account", "rejection-test-account");
    localStorage.removeItem("cognis_secure_keyring:rejection-test-account");
    localStorage.removeItem("cognis_secure_keyring");
    try {
        assert.equal(await keyring.unlockKeyring("rejection-password"), true);
        globalThis.fetch = async () => new Response(null, { status: 413 });
        await assert.rejects(
            keyring.setKeyringValue("test:rejected", "secret"),
            (error) =>
                error?.message === "keyring_sync_rejected" &&
                error?.status === 413,
        );
    } finally {
        globalThis.fetch = originalFetch;
        await keyring.lockKeyring();
        localStorage.removeItem("cognis_account");
    }
});
