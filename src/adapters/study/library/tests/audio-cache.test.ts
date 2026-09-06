import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { LibraryAudioCache } from "../audio-cache.js";

test("remote audio is downloaded once into the shared local cache", async (t) => {
    const root = await mkdtemp(path.join(os.tmpdir(), "cognis-audio-cache-"));
    t.after(() => rm(root, { recursive: true, force: true }));
    let requests = 0;
    const cache = new LibraryAudioCache(
        root,
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
});

test("remote audio rejects non-HTTPS and private destinations", async (t) => {
    const root = await mkdtemp(path.join(os.tmpdir(), "cognis-audio-cache-"));
    t.after(() => rm(root, { recursive: true, force: true }));
    const cache = new LibraryAudioCache(root, fetch, async () => ["127.0.0.1"]);
    await assert.rejects(
        cache.read("http://example.test/a.mp3"),
        /invalid_audio_url/,
    );
    await assert.rejects(
        cache.read("https://example.test/a.mp3"),
        /invalid_audio_host/,
    );
});
