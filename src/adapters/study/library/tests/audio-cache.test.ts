import assert from "node:assert/strict";
import test from "node:test";
import type { NamespaceFileClient } from "@cognis/core";
import { LibraryAudioCache } from "../audio-cache.js";

function memoryFiles() {
    const objects = new Map<string, Uint8Array>();
    const client = {
        get: async (_access, key) => objects.get(key) ?? null,
        put: async (_access, key, content) => {
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

test("remote audio is stored once through the Files gateway", async () => {
    const files = memoryFiles();
    let requests = 0;
    const cache = new LibraryAudioCache(
        files.client,
        async () => {
            requests += 1;
            return new Response(Buffer.from("audio"), {
                headers: { "content-type": "audio/mpeg" },
            });
        },
        async () => ["93.184.216.34"],
    );
    const [first, concurrent] = await Promise.all([
        cache.read("https://audio.example.test/a.mp3"),
        cache.read("https://audio.example.test/a.mp3"),
    ]);
    const second = await cache.read("https://audio.example.test/a.mp3");
    assert.equal(first.mediaType, "audio/mpeg");
    assert.equal(first.data.toString(), "audio");
    assert.equal(concurrent.data.toString(), "audio");
    assert.equal(second.data.toString(), "audio");
    assert.equal(requests, 1);
    assert.equal(files.objects.size, 1);
});

test("remote audio rejects non-HTTPS and private destinations", async () => {
    const cache = new LibraryAudioCache(
        memoryFiles().client,
        fetch,
        async () => ["127.0.0.1"],
    );
    await assert.rejects(
        cache.read("http://example.test/a.mp3"),
        /invalid_audio_url/,
    );
    await assert.rejects(
        cache.read("https://example.test/a.mp3"),
        /invalid_audio_host/,
    );
});

test("pack audio round-trips through the Files gateway", async () => {
    const files = memoryFiles();
    const cache = new LibraryAudioCache(files.client);
    await cache.store("packs/example.audio", "audio/ogg", Buffer.from("pack"));
    const stored = await cache.readStored("packs/example.audio");
    assert.equal(stored.mediaType, "audio/ogg");
    assert.equal(stored.data.toString(), "pack");
});
