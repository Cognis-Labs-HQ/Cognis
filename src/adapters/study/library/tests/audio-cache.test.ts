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

test("pack audio round-trips through the Files gateway", async () => {
    const files = memoryFiles();
    const cache = new LibraryAudioCache(files.client);
    await cache.store("packs/example.audio", "audio/ogg", Buffer.from("pack"));
    const stored = await cache.readStored("packs/example.audio");
    assert.equal(stored.mediaType, "audio/ogg");
    assert.equal(stored.data.toString(), "pack");
});
