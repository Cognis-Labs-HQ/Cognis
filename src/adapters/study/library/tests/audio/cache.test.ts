import assert from "node:assert/strict";
import test from "node:test";
import type { NamespaceFileClient } from "@cognis/core";
import { LibraryAudioCache } from "../../audio-cache.js";

function memoryFiles() {
    const objects = new Map<string, Uint8Array>();
    const client = {
        get: async (_access, key) => objects.get(key) ?? null,
        put: async (_access, key, content, options) => {
            assert.equal(options?.publicRead, false);
            objects.set(key, content);
            return {
                key,
                size: content.byteLength,
                lastModified: new Date(),
            };
        },
    } as NamespaceFileClient;
    return { client, objects };
}

test("pack audio round-trips through the Files gateway", async () => {
    const files = memoryFiles();
    const cache = new LibraryAudioCache(files.client);
    await cache.store("packs/example.audio", "audio/ogg", Buffer.from("pack"));
    const stored = await cache.readStored("packs/example.audio");
    assert.equal(stored.mediaType, "audio/ogg");
    assert.equal(stored.data.toString(), "pack");
});

test("audio read-through shares retrieval and persistence, and survives cache reconstruction", async () => {
    const files = memoryFiles();
    const cache = new LibraryAudioCache(files.client);
    let calls = 0;
    const load = async () => {
        calls++;
        await new Promise((resolve) => setImmediate(resolve));
        return { mediaType: "audio/mpeg", data: new Uint8Array([1, 2, 3]) };
    };
    const results = await Promise.all(
        Array.from({ length: 20 }, () =>
            cache.readThrough("lookup.audio", load),
        ),
    );
    assert.equal(calls, 1);
    assert.ok(
        results.every((result) => result.data.equals(Buffer.from([1, 2, 3]))),
    );
    const restarted = new LibraryAudioCache(files.client);
    assert.deepEqual(
        await restarted.readThrough("lookup.audio", load),
        results[0],
    );
    assert.equal(calls, 1);
    await restarted.readThrough("changed-reading.audio", load);
    assert.equal(calls, 2);
});

test("failed audio fetches and cache writes remain retryable", async () => {
    const files = memoryFiles();
    const cache = new LibraryAudioCache(files.client);
    await assert.rejects(
        cache.readThrough("retry.audio", async () => {
            throw new Error("upstream_failed");
        }),
        /upstream_failed/,
    );
    const load = async () => ({
        mediaType: "audio/mpeg",
        data: new Uint8Array([1]),
    });
    const put = files.client.put;
    files.client.put = async () => {
        throw new Error("storage_failed");
    };
    await assert.rejects(
        cache.readThrough("retry.audio", load),
        /storage_failed/,
    );
    files.client.put = put;
    assert.equal((await cache.readThrough("retry.audio", load)).data[0], 1);
});
