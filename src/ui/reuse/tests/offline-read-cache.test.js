import test from "node:test";
import assert from "node:assert/strict";
import { loadTestModule } from "../../../tooling/reuse/test-module.ts";

function fixture(options = {}) {
    let offline = false;
    let enabled = true;
    let generation = 0;
    const values = new Map([
        ["cognis_account", "first"],
        ["cognis_access_token", "session"],
    ]);
    const module = loadTestModule(
        new URL("../offline-read-cache.js", import.meta.url),
        {
            "./offline-state.js": {
                isOffline: () => offline && enabled,
                offlineEnabled: () => enabled,
                offlineCacheGeneration: () => generation,
            },
        },
        {
            localStorage: { getItem: (key) => values.get(key) ?? null },
            console,
        },
    );
    return {
        read: module.createOfflineReadCache(options),
        values,
        disconnect: () => {
            offline = true;
        },
        connect: () => {
            offline = false;
        },
        disable: () => {
            enabled = false;
            generation++;
        },
        enable: () => {
            enabled = true;
            generation++;
        },
        invalidate: () => {
            generation++;
        },
    };
}

test("lightweight reads restore clones on the first failure and never call transport offline", async () => {
    const state = fixture();
    const original = { characters: ["a"] };
    await state.read("characters", async () => original);
    original.characters.push("b");
    const restored = await state.read("characters", async () => {
        state.disconnect();
        throw new TypeError("Failed to fetch");
    });
    assert.deepEqual(JSON.parse(JSON.stringify(restored)), {
        characters: ["a"],
    });
    restored.characters.push("c");
    const again = await state.read("characters", () =>
        assert.fail("offline transport"),
    );
    assert.equal(again.characters.length, 1);
    await assert.rejects(
        state.read("unvisited", () => assert.fail("offline transport")),
        /offline_read_unavailable/,
    );
});

test("account changes, expiry, lifecycle invalidation and disabling clear snapshots", async () => {
    for (const invalidate of [
        (state) => state.values.set("cognis_account", "second"),
        (state) => state.values.set("cognis_access_token", "new-session"),
        (state) =>
            state.values.set(
                "cognis_session_expires_at",
                "2000-01-01T00:00:00Z",
            ),
        (state) => state.invalidate(),
        (state) => {
            state.disable();
            state.enable();
        },
    ]) {
        const state = fixture();
        await state.read("key", async () => ({ value: 1 }));
        invalidate(state);
        state.disconnect();
        await assert.rejects(
            state.read("key", () => assert.fail("transport")),
            /offline_read_unavailable/,
        );
    }
});

test("bounded caches evict old reads, reject oversized snapshots and respect provider opt-in", async () => {
    const state = fixture({ maxBytes: 100, maxEntries: 1 });
    await state.read("first", async () => [1]);
    await state.read("last", async () => [2]);
    await state.read("large", async () => "x".repeat(100));
    await state.read(
        "private",
        async () => [3],
        () => false,
    );
    state.disconnect();
    assert.equal((await state.read("last", () => assert.fail()))[0], 2);
    for (const key of ["first", "large", "private"])
        await assert.rejects(
            state.read(key, () => assert.fail()),
            /offline_read_unavailable/,
        );
});

test("concurrent loads coalesce, failed loads retry and aborted owners release snapshots", async () => {
    const controller = new AbortController();
    const state = fixture({ signal: controller.signal });
    let calls = 0;
    const load = async () => {
        calls++;
        return ["character"];
    };
    await Promise.all([state.read("same", load), state.read("same", load)]);
    assert.equal(calls, 1);
    await assert.rejects(
        state.read("failure", async () => {
            throw new Error("denied");
        }),
        /denied/,
    );
    await state.read("failure", load);
    assert.equal(calls, 2);
    controller.abort();
    state.disconnect();
    await assert.rejects(state.read("same", load), { name: "AbortError" });
});

test("a response that finishes after an account switch cannot populate the next account cache", async () => {
    const state = fixture();
    let finish;
    const pending = state.read(
        "key",
        () =>
            new Promise((resolve) => {
                finish = resolve;
            }),
    );
    await Promise.resolve();
    state.values.set("cognis_account", "second");
    finish({ value: "first account" });
    await pending;
    state.disconnect();
    await assert.rejects(
        state.read("key", () => assert.fail()),
        /offline_read_unavailable/,
    );
});
