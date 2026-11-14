import test from "node:test";
import assert from "node:assert/strict";
import { loadTestModule } from "../../../tooling/reuse/test-module.ts";

function fixture(options = {}) {
    let offline = false;
    let enabled = true;
    let generation = 0;
    let clock = Date.now();
    const values = new Map([
        ["cognis_account", "first"],
        ["cognis_access_token", "session"],
    ]);
    const module = loadTestModule(
        new URL("../offline-read-cache.js", import.meta.url),
        {
            "./offline-policy.js": { offlinePolicy: { allows: () => true } },
            "./offline-state.js": {
                isOffline: () => offline && enabled,
                offlineEnabled: () => enabled,
                offlineCacheGeneration: () => generation,
            },
        },
        {
            localStorage: { getItem: (key) => values.get(key) ?? null },
            console,
            Date: { now: () => clock, parse: Date.parse },
        },
    );
    return {
        read: module.createOfflineReadCache(options),
        values,
        advance: (ms) => {
            clock += ms;
        },
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

test("an authoritative denial invalidates prior reads even if connectivity changes during the response", async () => {
    const state = fixture();
    await state.read("profile", async () => ({ name: "Private" }));
    await assert.rejects(
        state.read("profile", async () => {
            state.disconnect();
            throw Object.assign(new Error("forbidden"), { status: 403 });
        }),
        /forbidden/,
    );
    await assert.rejects(
        state.read("profile", () => assert.fail("offline transport")),
        /offline_read_unavailable/,
    );
});

test("snapshot readiness rejects uncached, expired and cross-account reads", async () => {
    const state = fixture();
    assert.equal(state.read.has("page"), false);
    await state.read("page", async () => ({ ready: true }));
    assert.equal(state.read.has("page"), true);
    state.values.set("cognis_account", "another");
    assert.equal(state.read.has("page"), false);
    await state.read("page", async () => ({ ready: true }));
    state.values.set("cognis_session_expires_at", "2000-01-01T00:00:00Z");
    assert.equal(state.read.has("page"), false);
});

test("opted-in cached reads finish while one fresh validation is pending and adopt its completed result", async () => {
    const state = fixture({ preferCached: true, refreshIntervalMs: 0 });
    await state.read("catalog", async () => ({ version: 1 }));
    let release;
    const pending = new Promise((resolve) => {
        release = resolve;
    });
    let requests = 0;
    const load = () => {
        requests++;
        return pending;
    };
    assert.equal((await state.read("catalog", load)).version, 1);
    assert.equal((await state.read("catalog", load)).version, 1);
    assert.equal(requests, 1);
    release({ version: 2 });
    await new Promise((resolve) => setImmediate(resolve));
    state.disconnect();
    assert.equal((await state.read("catalog", load)).version, 2);
    state.connect();
    state.read.invalidate();
    assert.equal(
        (await state.read("catalog", async () => ({ version: 3 }))).version,
        3,
    );
});

test("an authoritative denial during cached validation invalidates the private snapshot", async () => {
    const state = fixture({ preferCached: true, refreshIntervalMs: 0 });
    await state.read("catalog", async () => ({ version: 1 }));
    await state.read("catalog", async () => {
        throw Object.assign(new Error("denied"), { status: 403 });
    });
    await new Promise((resolve) => setImmediate(resolve));
    assert.equal(state.read.has("catalog"), false);
    state.disconnect();
    await assert.rejects(
        state.read("catalog", async () => ({})),
        /offline_read_unavailable/,
    );
});

test("online metadata freshness avoids repeated reads with Offline Mode disabled and expires on demand", async () => {
    const state = fixture({ onlineMaxAgeMs: 30_000 });
    state.disable();
    let calls = 0;
    const load = async () => ({ version: ++calls });
    assert.equal((await state.read("metadata", load)).version, 1);
    state.advance(29_999);
    const cached = await state.read("metadata", load);
    cached.version = 99;
    assert.equal((await state.read("metadata", load)).version, 1);
    assert.equal(calls, 1);
    state.advance(1);
    assert.equal((await state.read("metadata", load)).version, 2);
    state.read.invalidate();
    assert.equal((await state.read("metadata", load)).version, 3);
    state.values.set("cognis_access_token", "replacement");
    assert.equal((await state.read("metadata", load)).version, 4);
    state.values.set("cognis_session_expires_at", "2000-01-01T00:00:00Z");
    assert.equal((await state.read("metadata", load)).version, 5);
    assert.equal((await state.read("metadata", load)).version, 6);
});

test("expired online metadata coalesces fresh reads and never conceals server denials", async () => {
    const state = fixture({ onlineMaxAgeMs: 30_000 });
    await state.read("metadata", async () => ({ version: 1 }));
    state.advance(30_000);
    let complete,
        calls = 0;
    const load = () => {
        calls++;
        return new Promise((resolve) => {
            complete = resolve;
        });
    };
    const first = state.read("metadata", load),
        second = state.read("metadata", load);
    await Promise.resolve();
    assert.equal(calls, 1);
    complete({ version: 2 });
    assert.equal((await first).version, 2);
    assert.equal((await second).version, 2);
    state.advance(30_000);
    await assert.rejects(
        state.read("metadata", async () => {
            throw Object.assign(new Error("denied"), { status: 403 });
        }),
        /denied/,
    );
    assert.equal(state.read.has("metadata"), false);
});

test("acknowledged snapshot replacement wins over an in-flight stale read and retains cache bounds", async () => {
    const state = fixture({ maxEntries: 1 });
    let complete;
    const stale = state.read(
        "favourites",
        () =>
            new Promise((resolve) => {
                complete = resolve;
            }),
    );
    await Promise.resolve();
    state.read.set("favourites", [{ id: "acknowledged" }]);
    complete([]);
    assert.deepEqual(JSON.parse(JSON.stringify(await stale)), [
        { id: "acknowledged" },
    ]);
    state.disconnect();
    assert.equal(
        (await state.read("favourites", () => assert.fail()))[0].id,
        "acknowledged",
    );
    state.read.set("another", []);
    assert.equal(state.read.has("favourites"), false);
    assert.equal(state.read.has("another"), true);
    state.values.set("cognis_account", "replacement");
    assert.equal(state.read.has("another"), false);
});

for (const replacement of [undefined, { content: "x".repeat(100) }]) {
    test(`uncacheable replacement retires an old snapshot (${replacement ? "oversized" : "undefined"})`, async () => {
        const state = fixture({ maxBytes: 100 });
        await state.read("preferences", async () => ({ mode: "dark" }));
        await state.read("unrelated", async () => ({ value: 1 }));
        let complete;
        const stale = state.read(
            "preferences",
            () =>
                new Promise((resolve) => {
                    complete = resolve;
                }),
        );
        await Promise.resolve();
        state.read.set("preferences", replacement);
        assert.equal(state.read.has("preferences"), false);
        complete({ mode: "dark" });
        await stale;
        state.disconnect();
        await assert.rejects(
            state.read("preferences", () => assert.fail("offline transport")),
            /offline_read_unavailable/,
        );
        assert.equal(
            (await state.read("unrelated", () => assert.fail())).value,
            1,
        );
        state.read.set("preferences", { mode: "light" });
        assert.equal(
            (await state.read("preferences", () => assert.fail())).mode,
            "light",
        );
    });
}

test("coalesced oversized reads remain usable online without entering the offline cache", async () => {
    const state = fixture({ maxBytes: 20 });
    let complete;
    let calls = 0;
    const load = () => {
        calls++;
        return new Promise((resolve) => {
            complete = resolve;
        });
    };
    const first = state.read("content", load);
    const second = state.read("content", load);
    await Promise.resolve();
    const result = { content: "x".repeat(100) };
    complete(result);
    assert.equal((await first).content, result.content);
    assert.equal((await second).content, result.content);
    assert.equal(calls, 1);
    assert.equal(state.read.has("content"), false);
});

for (const options of [
    {},
    { preferCached: true, refreshIntervalMs: 0 },
    { onlineMaxAgeMs: 30_000 },
]) {
    test(`read provenance follows each outcome without changing payloads (${JSON.stringify(options)})`, async () => {
        const state = fixture(options);
        const sources = [];
        const onSource = (source) => sources.push(source);
        const original = { value: 1 };
        assert.equal(
            await state.read(
                "key",
                async () => original,
                undefined,
                false,
                onSource,
            ),
            original,
        );
        const load = async () => ({ value: 2 });
        if (options.preferCached || options.onlineMaxAgeMs) {
            assert.equal(
                (await state.read("key", load, undefined, false, onSource))
                    .value,
                1,
            );
            await new Promise((resolve) => setImmediate(resolve));
            assert.deepEqual(sources, ["live", "cached"]);
        }
        state.disconnect();
        const offline = await state.read(
            "key",
            () => assert.fail("offline transport"),
            undefined,
            false,
            onSource,
        );
        assert.equal(offline.value, options.preferCached ? 2 : 1);
        assert.equal(sources.at(-1), "cached");
        const count = sources.length;
        await assert.rejects(
            state.read("missing", load, undefined, false, onSource),
            /offline_read_unavailable/,
        );
        assert.equal(sources.length, count);
    });
}

test("a fallback reports cached while a successful load that disconnects remains live", async () => {
    const state = fixture();
    const sources = [];
    const onSource = (source) => sources.push(source);
    await state.read("key", async () => ({ value: 1 }));
    assert.equal(
        (
            await state.read(
                "key",
                async () => {
                    state.disconnect();
                    throw new TypeError("Failed to fetch");
                },
                undefined,
                false,
                onSource,
            )
        ).value,
        1,
    );
    state.connect();
    assert.equal(
        (
            await state.read(
                "key",
                async () => {
                    state.disconnect();
                    return { value: 2 };
                },
                undefined,
                false,
                onSource,
            )
        ).value,
        2,
    );
    assert.deepEqual(sources, ["cached", "live"]);
});

for (const replacement of ["none", "snapshot", "oversized"]) {
    test(`coalesced provenance distinguishes explicit replacement (${replacement})`, async () => {
        const state = fixture({ maxBytes: 100 });
        const firstSources = [];
        const secondSources = [];
        const transport = Promise.withResolvers();
        const first = state.read(
            "key",
            () => transport.promise,
            undefined,
            false,
            (source) => firstSources.push(source),
        );
        const second = state.read(
            "key",
            () => assert.fail("coalesced transport"),
            undefined,
            false,
            (source) => secondSources.push(source),
        );
        await Promise.resolve();
        if (replacement !== "none")
            state.read.set("key", {
                value: replacement === "snapshot" ? "new" : "x".repeat(100),
            });
        transport.resolve({ value: "live" });
        for (const result of await Promise.all([first, second])) {
            assert.equal(
                result.value,
                replacement === "snapshot" ? "new" : "live",
            );
        }
        assert.deepEqual(firstSources, [
            replacement === "snapshot" ? "cached" : "live",
        ]);
        assert.deepEqual(secondSources, [
            replacement === "snapshot" ? "cached" : "shared",
        ]);
        const freshSources = [];
        const fresh = await state.read(
            "key",
            async () => ({ value: "live" }),
            undefined,
            false,
            (source) => freshSources.push(source),
        );
        assert.equal(fresh.value, "live");
        assert.deepEqual(freshSources, ["live"]);
    });
}

test("failed and aborted reads do not publish successful provenance", async () => {
    const controller = new AbortController();
    const state = fixture({ signal: controller.signal });
    const sources = [];
    const onSource = (source) => sources.push(source);
    await assert.rejects(
        state.read(
            "denied",
            async () => {
                throw Object.assign(new Error("denied"), { status: 403 });
            },
            undefined,
            false,
            onSource,
        ),
        /denied/,
    );
    const transport = Promise.withResolvers();
    const pending = state.read(
        "pending",
        () => transport.promise,
        undefined,
        false,
        onSource,
    );
    await Promise.resolve();
    controller.abort();
    transport.resolve({ value: 1 });
    await assert.rejects(pending, { name: "AbortError" });
    assert.deepEqual(sources, []);
    assert.equal(state.read.has("pending"), false);
});

test("a coalesced caller restoring an older retained snapshot reports cached", async () => {
    const state = fixture();
    await state.read("key", async () => ({ value: "saved" }));
    const transport = Promise.withResolvers();
    const firstSources = [];
    const secondSources = [];
    const first = state.read(
        "key",
        () => transport.promise,
        () => false,
        false,
        (source) => firstSources.push(source),
    );
    const second = state.read(
        "key",
        () => assert.fail("coalesced transport"),
        undefined,
        false,
        (source) => secondSources.push(source),
    );
    transport.resolve({ value: "live" });
    assert.equal((await first).value, "live");
    assert.equal((await second).value, "saved");
    assert.deepEqual(firstSources, ["live"]);
    assert.deepEqual(secondSources, ["cached"]);
});
