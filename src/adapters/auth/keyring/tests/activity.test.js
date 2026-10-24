import assert from "node:assert/strict";
import test from "node:test";
import {
    boundedKeyringActivity,
    MAX_ACTIVITY_BYTES,
    MAX_ACTIVITY_EVENTS,
    createActivityPersistence,
} from "../ui/activity.js";
import { values } from "./ui-environment.js";
import { deriveKey, encodeBytes } from "../ui/crypto.js";

test("background persistence coalesces reads, saves later activity and handles rejection", async () => {
    let finish;
    let writes = 0;
    let version = 1;
    const failures = [];
    const save = createActivityPersistence({
        persist: () => {
            writes += 1;
            return writes === 1
                ? new Promise((resolve) => {
                      finish = resolve;
                  })
                : Promise.resolve();
        },
        getStateVersion: () => version,
        isUnlocked: () => true,
        onError: (error) => failures.push(error),
    });
    const first = save();
    for (let index = 0; index < 100; index += 1) assert.equal(save(), first);
    assert.equal(writes, 1);
    finish();
    await first;
    assert.equal(writes, 2);
    assert.deepEqual(failures, []);
    let attempts = 0;
    const failure = new Error("keyring_sync_rejected");
    const retry = createActivityPersistence({
        persist: async () => {
            attempts += 1;
            if (attempts === 1) throw failure;
        },
        getStateVersion: () => version,
        isUnlocked: () => true,
        onError: (error) => failures.push(error),
    });
    await retry();
    await retry();
    assert.equal(attempts, 2);
    assert.deepEqual(failures, [failure]);
    let staleWrites = 0;
    const cancelled = createActivityPersistence({
        persist: () => {
            staleWrites += 1;
            return new Promise((resolve) => {
                finish = resolve;
            });
        },
        getStateVersion: () => version,
        isUnlocked: () => true,
        onError: (error) => failures.push(error),
    });
    const stale = cancelled();
    cancelled();
    version += 1;
    finish();
    await stale;
    assert.equal(staleWrites, 1);
});

test("activity retains recent events within count and Unicode byte budgets", () => {
    const events = Array.from(
        { length: MAX_ACTIVITY_EVENTS + 2 },
        (_, index) => ({
            type: "read",
            identifier: `secret:${index}`,
        }),
    );
    const retained = boundedKeyringActivity(events);
    assert.equal(retained.length, MAX_ACTIVITY_EVENTS);
    assert.equal(retained.at(-1), events.at(-1));
    assert.equal(retained[0], events[2]);
    const unicode = events.map((event) => ({
        ...event,
        identifier: "猫𠮷".repeat(100),
    }));
    const bounded = boundedKeyringActivity(unicode);
    assert.ok(
        Buffer.byteLength(JSON.stringify(bounded), "utf8") <=
            MAX_ACTIVITY_BYTES,
    );
    assert.equal(bounded.at(-1), unicode.at(-1));
    assert.deepEqual(
        boundedKeyringActivity([
            { identifier: "x".repeat(MAX_ACTIVITY_BYTES) },
            events[0],
        ]),
        [events[0]],
    );
});

test("an oversized activity history recovers and syncs without losing secrets", async () => {
    const keyring = await import("../ui/keyring.js");
    const originalFetch = globalThis.fetch;
    const account = "activity-recovery";
    const password = "test-recovery-password";
    const salt = crypto.getRandomValues(new Uint8Array(16));
    const initializationVector = crypto.getRandomValues(new Uint8Array(12));
    const key = await deriveKey(password, salt, 1000);
    const vault = {
        values: {
            "chatroom:one:key": {
                value: "retained-secret",
                label: "Chat",
                source: "Test",
                updatedAt: "2026-10-21T00:00:00Z",
            },
        },
        events: Array.from({ length: 26000 }, () => ({
            type: "read",
            identifier: "chatroom:one:key",
            timestamp: "2026-10-21",
        })),
        preferences: { relockMinutes: 0 },
    };
    const cipher = await crypto.subtle.encrypt(
        { name: "AES-GCM", iv: initializationVector },
        key,
        new TextEncoder().encode(JSON.stringify(vault)),
    );
    const envelope = {
        version: 1,
        accountInstanceId: account,
        iterations: 1000,
        salt: encodeBytes(salt),
        iv: encodeBytes(initializationVector),
        cipher: encodeBytes(new Uint8Array(cipher)),
        updatedAt: "2026-10-21T00:00:00Z",
    };
    assert.ok(
        Buffer.byteLength(JSON.stringify(envelope), "utf8") > 2 * 1024 * 1024,
    );
    const synced = [];
    localStorage.setItem("cognis_account", account);
    values.set(`cognis_secure_keyring:${account}`, JSON.stringify(envelope));
    globalThis.fetch = async (_url, options) => {
        if (options?.method === "PUT") {
            synced.push(JSON.parse(options.body).vault);
            return new Response(JSON.stringify({ data: { saved: true } }));
        }
        return new Response(
            JSON.stringify({
                data: { vault: envelope, accountInstanceId: account },
            }),
        );
    };
    try {
        assert.equal(await keyring.unlockKeyring(password), true);
        assert.equal(
            keyring.getKeyringValue("chatroom:one:key"),
            "retained-secret",
        );
        await keyring.setKeyringValue("test:second", "second-secret");
        const saved = synced.at(-1);
        assert.ok(
            Buffer.byteLength(JSON.stringify(saved), "utf8") < 2 * 1024 * 1024,
        );
        const recovered = JSON.parse(
            new TextDecoder().decode(
                await crypto.subtle.decrypt(
                    {
                        name: "AES-GCM",
                        iv: Uint8Array.from(atob(saved.iv), (character) =>
                            character.charCodeAt(0),
                        ),
                    },
                    key,
                    Uint8Array.from(atob(saved.cipher), (character) =>
                        character.charCodeAt(0),
                    ),
                ),
            ),
        );
        assert.equal(
            recovered.values["chatroom:one:key"].value,
            "retained-secret",
        );
        assert.equal(recovered.values["test:second"].value, "second-secret");
        assert.ok(
            Buffer.byteLength(JSON.stringify(recovered.events), "utf8") <=
                MAX_ACTIVITY_BYTES,
        );
        assert.ok(recovered.events.length <= MAX_ACTIVITY_EVENTS);
    } finally {
        await keyring.lockKeyring();
        globalThis.fetch = originalFetch;
        localStorage.removeItem("cognis_account");
    }
});
