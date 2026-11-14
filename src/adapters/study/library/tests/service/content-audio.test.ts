import assert from "node:assert/strict";
import test from "node:test";
import { LibraryAudioCache } from "../../audio-cache.js";
import type { NamespaceFileClient } from "@cognis/core";
import { storeContentPackAudio } from "../../service/content-audio.js";

function audioPlan() {
    return {
        manifest: { publisher: "Fixture", id: "pack", version: "1.0.0" },
        schema: {
            layers: [
                { id: "words", fields: [{ id: "audio", type: "audioList" }] },
            ],
        },
        records: [
            { layer: "words", fields: { audio: ["one.mp3", "two.mp3"] } },
            {
                layer: "words",
                fields: { audio: ["two.mp3", "one.mp3", "two.mp3"] },
            },
        ],
        assets: ["one.mp3", "two.mp3"].map((path) => ({
            path,
            mediaType: "audio/mpeg",
            data: Buffer.from(path).toString("base64"),
        })),
    };
}

test("content-pack audio lists are cached and rewritten entry by entry", async () => {
    const stored: string[] = [];
    const plan = audioPlan();
    await storeContentPackAudio(
        plan as never,
        {
            readThrough: async (key: string, load: () => Promise<unknown>) => {
                stored.push(key);
                return load();
            },
        } as never,
    );
    assert.equal(stored.length, 2);
    assert.deepEqual(plan.records[0].fields.audio, [
        `file:${stored[0]}`,
        `file:${stored[1]}`,
    ]);
    assert.deepEqual(plan.records[1].fields.audio, [
        `file:${stored[1]}`,
        `file:${stored[0]}`,
        `file:${stored[1]}`,
    ]);
    assert.deepEqual(plan.assets, []);
});

test("pack reactivation reuses persisted recordings and restores missing files after cache reconstruction", async () => {
    const files = new Map<string, Uint8Array>();
    const writes: string[] = [];
    let failWrite = false;
    const client = {
        get: async (_actor, key) => files.get(key) ?? null,
        put: async (_actor, key, data) => {
            if (failWrite) throw new Error("storage_failed");
            writes.push(key);
            files.set(key, data);
        },
    } as NamespaceFileClient;
    const ingest = async () => {
        const plan = audioPlan();
        await storeContentPackAudio(
            plan as never,
            new LibraryAudioCache(client),
        );
        return plan;
    };
    const first = await ingest();
    assert.equal(writes.length, 2);
    const restored = await ingest();
    assert.deepEqual(restored.records, first.records);
    assert.equal(writes.length, 2);
    const missing = writes[0];
    files.delete(missing);
    failWrite = true;
    await assert.rejects(ingest(), /storage_failed/);
    failWrite = false;
    assert.deepEqual((await ingest()).records, first.records);
    assert.deepEqual(writes, [missing, writes[1], missing]);
    const audio = await new LibraryAudioCache(client).readStored(missing);
    assert.equal(audio.data.toString(), "one.mp3");
});
