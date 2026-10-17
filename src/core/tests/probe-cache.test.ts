import assert from "node:assert/strict";
import test from "node:test";
import {
    createProbeCache,
    type CacheSnapshot,
} from "../services/cache/index.js";
const hour = 3600000;

test("core probes cold entries and publishes only changed values at twelve-hour boundaries", async () => {
    let timestamp = 1000,
        calls = 0,
        value = "first";
    const rows = new Map<string, CacheSnapshot<string>>();
    const persistence = {
        read: async (key: string) => rows.get(key) ?? null,
        write: async (key: string, snapshot: CacheSnapshot<string>) => {
            rows.set(key, structuredClone(snapshot));
        },
    };
    let cache = createProbeCache(persistence, { now: () => timestamp });
    const load = async () => {
        calls += 1;
        return value;
    };
    assert.equal((await cache.read("query", load)).cached, false);
    value = "changed";
    timestamp += hour - 1;
    assert.equal((await cache.read("query", load)).value, "first");
    assert.equal(calls, 1);
    timestamp += 1;
    assert.equal((await cache.read("query", load)).value, "first");
    assert.equal(calls, 2);
    assert.equal(rows.get("query")?.pending, "changed");
    cache = createProbeCache(persistence, { now: () => timestamp });
    timestamp = 1000 + 12 * hour;
    assert.equal((await cache.read("query", load)).value, "changed");
    assert.equal(calls, 3);
    assert.equal(rows.get("query")?.pending, undefined);
    const stable = rows.get("query")!.value;
    timestamp += 12 * hour;
    assert.equal((await cache.read("query", load)).value, stable);
    assert.equal(rows.get("query")?.pending, undefined);
});

test("concurrent cold reads share a probe and a failed probe preserves the last successful snapshot", async () => {
    let timestamp = 1000,
        calls = 0,
        fail = false;
    const logs: object[] = [];
    let snapshot: CacheSnapshot<string> | null = null;
    const cache = createProbeCache(
        {
            read: async () => snapshot,
            write: async (_key, state) => {
                snapshot = structuredClone(state);
            },
        },
        {
            now: () => timestamp,
            log: (_level, _message, metadata) => logs.push(metadata),
        },
    );
    const load = async () => {
        calls += 1;
        if (fail) throw new Error("offline");
        return "value";
    };
    await Promise.all([cache.read("query", load), cache.read("query", load)]);
    assert.equal(calls, 1);
    timestamp += hour;
    fail = true;
    assert.equal((await cache.read("query", load)).value, "value");
    assert.equal(logs.length, 1);
    fail = false;
    await cache.read("query", load);
    assert.equal(calls, 3);
});

test("cache probes compare structured values independently of object key order", async () => {
    let now = 1000;
    let snapshot: CacheSnapshot<object> | null = null;
    const cache = createProbeCache(
        {
            read: async () => snapshot,
            write: async (_key, value) => {
                snapshot = structuredClone(value);
            },
        },
        { now: () => now },
    );
    await cache.read("query", async () => ({
        label: "hello",
        fields: { en: "hello", ja: "こんにちは" },
    }));
    now += hour;
    await cache.read("query", async () => ({
        fields: { ja: "こんにちは", en: "hello" },
        label: "hello",
    }));
    assert.equal(snapshot?.pending, undefined);
});
