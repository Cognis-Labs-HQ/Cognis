import assert from "node:assert/strict";
import test from "node:test";
import { storeContentPackAudio } from "../../service/content-audio.js";

test("content-pack audio lists are cached and rewritten entry by entry", async () => {
    const stored: string[] = [];
    const plan = {
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
    await storeContentPackAudio(
        plan as never,
        {
            store: async (key: string) => void stored.push(key),
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
