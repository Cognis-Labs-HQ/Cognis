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
    return {
        read,
        entries,
        objects,
        cache,
        schema,
        provider,
        calls: () => calls,
    };
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

for (const scope of ["global", "user", "class"] as const) {
    test(`${scope} sentence playback uses uploaded constituents without a speech provider`, async () => {
        const context = fixture();
        context.provider.supports = () => false;
        context.entries.get("sentence")!.scope = scope;
        context.entries.get("word")!.fields!.audio = "file:existing.audio";
        await context.cache.store("existing.audio", "audio/wav", tone().data);
        const result = await context.read();
        assert.equal(result.mediaType, "audio/wav");
        assert.ok(result.data.length > tone().data.length * 2);
        assert.equal(context.calls(), 0);
    });
}

function transformedFixture() {
    const context = fixture();
    context.schema.transformSets = [
        {
            id: "verb",
            flag: "verb",
            matchTags: ["verb"],
            baseState: "base",
            rules: [
                {
                    id: "polite",
                    fromState: "base",
                    toState: "polite",
                    removeSuffix: "る",
                    append: "ます",
                    pronunciation: { removeSuffix: "る", append: "ます" },
                },
                {
                    id: "past",
                    fromState: "polite",
                    toState: "polite-past",
                    removeSuffix: "ます",
                    append: "ました",
                    pronunciation: { removeSuffix: "ます", append: "ました" },
                },
            ],
        },
    ];
    const word = context.entries.get("word")!;
    word.language = "ja";
    word.label = "食べる";
    word.tags = ["verb"];
    word.fields = { pronunciation: ["たべる"], audio: "file:base.audio" };
    word.references = [{ relation: "reading", entryId: "base-reading" }];
    const words = context.schema.layers[0];
    words.relationships = [
        {
            id: "reading",
            targetLayer: "words",
            presentationRole: "pronunciation",
        },
    ];
    context.entries.set("base-reading", {
        ...word,
        id: "base-reading",
        label: "たべる",
        references: [],
    });
    const transformation = { setId: "verb", path: ["polite", "past"] };
    context.entries.get("sentence")!.references = [
        { relation: "words", entryId: "word", position: 0, transformation },
    ];
    context.provider.cacheKey = (input) =>
        `${input.label}:${input.readings?.[0]}.audio`;
    return { ...context, transformation };
}

test("sentence composition requests the chained variant recording and keeps base audio intact", async () => {
    const context = transformedFixture();
    const inputs: unknown[] = [];
    context.provider.fetchAudio = async (input) => {
        inputs.push(input);
        return tone();
    };
    await context.cache.store("base.audio", "audio/wav", tone().data);
    await context.read();
    assert.deepEqual(inputs, [
        {
            language: "ja",
            label: "食べました",
            semanticRole: "lexicalUnit",
            readings: ["たべました"],
        },
    ]);
    assert.equal(context.entries.get("word")!.fields!.audio, "file:base.audio");
    assert.deepEqual(context.entries.get("word")!.fields!.pronunciation, [
        "たべる",
    ]);
});

test("missing sentence variants cannot fall back to base reading recordings, even when nested", async () => {
    for (const nested of [false, true]) {
        const context = transformedFixture();
        await context.cache.store("base.audio", "audio/wav", tone().data);
        const requested: string[] = [];
        context.provider.fetchAudio = async (input) => {
            requested.push(input.label);
            throw new Error("audio_lookup_unavailable");
        };
        if (nested) {
            context.entries.set("wrapper", {
                ...context.entries.get("word")!,
                id: "wrapper",
                tags: [],
                label: "wrapper",
                fields: {},
                references: [
                    {
                        relation: "reading",
                        entryId: "word",
                        transformation: context.transformation,
                    },
                ],
            });
            context.entries.get("sentence")!.references = [
                { relation: "words", entryId: "wrapper", position: 0 },
            ];
        }
        await assert.rejects(context.read(), /audio_not_found/);
        assert.ok(requested.includes("食べました"));
        assert.ok(!requested.includes("たべる"));
    }
});

test("direct variant playback cannot compose a base recording when its own recording is missing", async () => {
    const context = transformedFixture();
    await context.cache.store("base.audio", "audio/wav", tone().data);
    context.provider.fetchAudio = async () => {
        throw new Error("audio_lookup_unavailable");
    };
    await assert.rejects(
        readAuthorizedEntryAudio(
            {
                actor: { accountId: "alice", role: "user" },
                entryId: "word",
                fieldId: "audio",
                transformation: context.transformation,
            },
            {
                read: async (_actor, id) => context.entries.get(id) ?? null,
                schema: () => context.schema,
                cache: context.cache,
                provider: context.provider,
            },
        ),
        /audio_lookup_unavailable/,
    );
});

test("a packaged sentence recording takes priority over synthesis and constituent composition", async () => {
    const context = fixture();
    const direct = tone();
    await context.cache.store(
        "packs/sentence.audio",
        direct.mediaType,
        direct.data,
    );
    context.entries.get("sentence")!.fields!.audio =
        "file:packs/sentence.audio";
    assert.deepEqual(
        (await context.read("word")).data,
        Buffer.from(direct.data),
    );
    assert.equal(context.calls(), 0);
});
