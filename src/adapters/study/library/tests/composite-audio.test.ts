import assert from "node:assert/strict";
import test from "node:test";
import {
    createCtx,
    type NamespaceFileClient,
    type StudyAudioCapability,
} from "@cognis/core";
import { LibraryAudioCache } from "../audio-cache.js";
import { readAuthorizedEntryAudio } from "../service/audio.js";
import { audioReferences } from "../service/composite-audio.js";
import { encodeWav, composeRecording } from "../service/recording.js";
import type { LibraryEntry, LibrarySchema } from "../types.js";

function tone() {
    return encodeWav(
        Float32Array.from(
            { length: 2400 },
            (_, index) => Math.sin(index / 10) * 0.5,
        ),
    );
}

function fixture() {
    const objects = new Map<string, Uint8Array>();
    const cache = new LibraryAudioCache({
        get: async (_actor, key) => objects.get(key) ?? null,
        put: async (_actor, key, data, options) => {
            assert.equal(options?.publicRead, false);
            objects.set(key, data);
        },
    } as unknown as NamespaceFileClient);
    const schema = {
        id: "test",
        layers: [
            {
                id: "words",
                semanticRole: "lexicalUnit",
                fields: [{ id: "audio", type: "audio" }],
            },
            {
                id: "sentences",
                semanticRole: "orderedLexicalSequence",
                metadata: {
                    labels: { en: "Sentences" },
                    audio: { wordGapMs: 90 },
                },
                fields: [{ id: "audio", type: "audio" }],
                relationships: [
                    {
                        id: "words",
                        targetLayer: "words",
                        presentationRole: "composition",
                    },
                ],
            },
        ],
    } as LibrarySchema;
    const entries = new Map<string, LibraryEntry>([
        [
            "word",
            {
                scope: "global",
                id: "word",
                label: "run",
                language: "en",
                schemaId: "test",
                layer: "words",
                fields: {},
            } as LibraryEntry,
        ],
        [
            "comma",
            {
                id: "comma",
                label: ",",
                schemaId: "test",
                layer: "words",
                tags: ["punctuation"],
            } as LibraryEntry,
        ],
        [
            "sentence",
            {
                scope: "global",
                id: "sentence",
                label: "run, run",
                schemaId: "test",
                layer: "sentences",
                fields: {},
                references: [
                    { relation: "words", entryId: "word", position: 0 },
                    { relation: "words", entryId: "comma", position: 1 },
                    { relation: "words", entryId: "word", position: 2 },
                ],
            } as LibraryEntry,
        ],
    ]);
    const ctx = createCtx();
    ctx.registerFlow({
        id: "study:library:audio",
        stages: ["authorize", "validate", "resolve"],
    });
    let calls = 0;
    const provider = {
        supports: (_language, role) => role !== "orderedLexicalSequence",
        cacheKey: () => "word.audio",
        fetchAudio: async () => {
            calls++;
            return tone();
        },
    } as unknown as StudyAudioCapability;
    const read = async (denied?: string) =>
        readAuthorizedEntryAudio(
            {
                actor: { accountId: "alice", role: "user" },
                entryId: "sentence",
                fieldId: "audio",
            },
            {
                read: async (_actor, id) => {
                    if (id === denied) throw new Error("forbidden");
                    return entries.get(id) ?? null;
                },
                schema: () => schema,
                flow: ctx.flow,
                cache,
                provider,
            },
        );
    return { read, entries, objects, cache, schema, calls: () => calls };
}

test("new sentence audio is automatically composed, cached and replaced by uploaded audio", async () => {
    const context = fixture();
    const first = await context.read();
    assert.equal(first.mediaType, "audio/wav");
    assert.equal(first.data.toString("ascii", 0, 4), "RIFF");
    assert.ok(first.data.length > tone().data.length * 2);
    const second = await context.read();
    assert.deepEqual(second, first);
    assert.equal(context.calls(), 1);
    assert.equal(
        [...context.objects.keys()].filter((key) =>
            key.startsWith("composites/"),
        ).length,
        1,
    );
    await assert.rejects(context.read("word"), /forbidden/);
    await context.cache.store(
        "manual.audio",
        "audio/mpeg",
        new Uint8Array([1, 2, 3]),
    );
    context.entries.get("sentence")!.fields!.audio = "file:manual.audio";
    assert.deepEqual((await context.read()).data, Buffer.from([1, 2, 3]));
    assert.equal(context.calls(), 1);
});

test("composition selects only the first pronunciation group and detects cycles", async () => {
    const context = fixture();
    const layer = {
        id: "kanji",
        fields: [],
        metadata: { labels: { en: "Kanji" } },
        semanticRole: "compoundWritingUnit",
        relationships: [{ id: "readings", presentationRole: "pronunciation" }],
    } as unknown as LibrarySchema["layers"][number];
    const entry = {
        id: "kanji",
        referenceGroups: {
            readings: [
                [{ entryId: "first", relation: "readings" }],
                [{ entryId: "second", relation: "readings" }],
            ],
        },
    } as LibraryEntry;
    assert.deepEqual(
        audioReferences(entry, layer).map((item) => item.entryId),
        ["first"],
    );
    context.entries.get("sentence")!.references = [
        { relation: "words", entryId: "sentence" },
    ];
    await assert.rejects(context.read(), /invalid_audio_composition/);
});

test("composite audio has a quiet lead-in, bounded peaks and explicit phrase pauses", async () => {
    const word = tone();
    const quick = await composeRecording([
        { recording: word, pauseMs: 50 },
        { recording: word, pauseMs: 50 },
    ]);
    const paced = await composeRecording([
        { recording: word, pauseMs: 300 },
        { recording: word, pauseMs: 50 },
    ]);
    assert.equal(paced.data.length - quick.data.length, 24000 * 0.25 * 2);
    assert.ok(
        Buffer.from(paced.data)
            .subarray(44, 44 + 24000 * 0.19 * 2)
            .every((value) => value === 0),
    );
    await assert.rejects(
        composeRecording([{ recording: word, pauseMs: 5000 }]),
        /invalid_audio_recording/,
    );
    await assert.rejects(
        composeRecording([
            {
                recording: {
                    mediaType: "audio/mpeg",
                    data: new Uint8Array([1]),
                },
                pauseMs: 50,
            },
        ]),
        /invalid_audio_recording/,
    );
});

for (const scope of ["user", "class"] as const) {
    test(`${scope} sentences use existing recordings without calling speech`, async () => {
        const context = fixture();
        context.entries.get("sentence")!.scope = scope;
        await assert.rejects(context.read(), /audio_not_found/);
        assert.equal(context.calls(), 0);
        await context.cache.store("word.audio", "audio/wav", tone().data);
        const audio = await context.read();
        assert.equal(audio.mediaType, "audio/wav");
        assert.equal(context.calls(), 0);
        context.entries.get("word")!.fields!.audio = "file:manual.audio";
        await context.cache.store("manual.audio", "audio/wav", tone().data);
        assert.equal((await context.read()).mediaType, "audio/wav");
        assert.equal(context.calls(), 0);
    });
}
