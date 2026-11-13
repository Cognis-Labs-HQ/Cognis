import { LibraryService } from "../../service/index.js";
import assert from "node:assert/strict";
import test from "node:test";
import {
    createCtx,
    type NamespaceFileClient,
    type StudyAudioCapability,
} from "@cognis/core";
import { LibraryAudioCache } from "../../audio-cache.js";
import { readEntryAudio } from "../../service/audio.js";
import type {
    LibraryEntry,
    LibraryLayerSchema,
    LibrarySchema,
} from "../../types.js";

function createAudioCache() {
    const objects = new Map<string, Uint8Array>();
    return new LibraryAudioCache({
        get: async (_actor, key) => objects.get(key) ?? null,
        put: async (_actor, key, data) => {
            objects.set(key, data);
        },
    } as unknown as NamespaceFileClient);
}

test("missing card audio is fetched once into Files without changing authored fields", async () => {
    const cache = createAudioCache();
    let requests = 0;
    const provider: StudyAudioCapability = {
        registerProvider() {
            throw new Error("not_used");
        },
        supports: () => true,
        cacheKey: () => "lookup.audio",
        async fetchAudio(input) {
            assert.equal(input.label, "dog");
            requests++;
            return { mediaType: "audio/mpeg", data: new Uint8Array([1, 2, 3]) };
        },
    };
    const entry = {
        scope: "global",
        id: "dog",
        label: "dog",
        language: "en",
        fields: {},
    } as LibraryEntry;
    const layer = {
        id: "words",
        semanticRole: "lexicalUnit",
        fields: [{ id: "audio", type: "audio" }],
    } as LibraryLayerSchema;
    const [first, second] = await Promise.all(
        Array.from({ length: 10 }, () =>
            readEntryAudio(entry, layer, "audio", cache, provider),
        ),
    );
    assert.deepEqual(
        await readEntryAudio(entry, layer, "audio", cache, provider),
        first,
    );
    assert.deepEqual(first, second);
    assert.equal(requests, 1);
    assert.deepEqual(entry.fields, {});
    await assert.rejects(
        readEntryAudio(entry, layer, "other", cache, provider),
        /audio_field_required/,
    );
    await assert.rejects(
        readEntryAudio(entry, layer, "audio", cache),
        /audio_not_found/,
    );
});

test("audio access checks ownership and derives transformed speech from the schema", async () => {
    const cache = createAudioCache();
    const requests: string[] = [];
    const provider: StudyAudioCapability = {
        registerProvider() {
            throw new Error("not_used");
        },
        supports: () => true,
        cacheKey: (input) => `${input.label}.audio`,
        async fetchAudio(input) {
            requests.push(input.label);
            return { mediaType: "audio/mpeg", data: new Uint8Array([1, 2, 3]) };
        },
    };
    const entry = {
        id: "dog",
        schemaId: "test",
        language: "en",
        layer: "words",
        label: "dog",
        scope: "user",
        scopeId: "alice",
        tags: ["noun"],
        fields: { audio: "file:base.audio", pronunciation: ["dog"] },
    } as LibraryEntry;
    let writes = 0;
    const store = {
        get: async () => entry,
        saveSchema: async () => {},
        updateField: async () => {
            writes++;
            return true;
        },
    };
    const ctx = createCtx();
    ctx.registerFlow({
        id: "study:library:audio",
        stages: ["authorize", "validate", "resolve"],
    });
    const stages: string[] = [];
    for (const stage of ["authorize", "validate", "resolve"])
        ctx.flow.extend(
            "study:library:audio",
            stage,
            { id: `test:${stage}` },
            () => {
                stages.push(stage);
            },
        );
    const library = new LibraryService(
        store as never,
        undefined,
        ctx.flow,
        undefined,
        undefined,
        cache,
        undefined,
        undefined,
        undefined,
        provider,
    );
    const schema: LibrarySchema = {
        id: "test",
        version: 1,
        namespace: "test",
        language: "en",
        metadata: { labels: { en: "Test" } },
        layers: [
            {
                id: "words",
                semanticRole: "lexicalUnit",
                metadata: { labels: { en: "Words" } },
                fields: [
                    {
                        id: "audio",
                        type: "audio",
                        metadata: { labels: { en: "Audio" } },
                    },
                ],
            },
        ],
        transformSets: [
            {
                id: "number",
                flag: "noun",
                matchTags: ["noun"],
                baseState: "base",
                metadata: { labels: { en: "Number" } },
                rules: [
                    {
                        id: "plural",
                        fromState: "base",
                        toState: "plural",
                        removeSuffix: "dog",
                        append: "dogs",
                        pronunciation: { removeSuffix: "dog", append: "dogs" },
                        metadata: { labels: { en: "Plural" } },
                    },
                ],
            },
        ],
    };
    await library.registerSchema(schema);
    const descriptor = { setId: "number", path: ["plural"] };
    await assert.rejects(
        library.readAudio(
            { accountId: "bob", role: "user" },
            "dog",
            "audio",
            descriptor,
        ),
        /forbidden/,
    );
    assert.deepEqual(requests, []);
    entry.scope = "global";
    entry.scopeId = "global";
    await assert.rejects(
        library.readAudio(
            { accountId: "alice", role: "user" },
            "dog",
            "audio",
            { setId: "number", path: ["forged"] },
        ),
        /invalid_reference_transformation/,
    );
    await library.readAudio(
        { accountId: "alice", role: "user" },
        "dog",
        "audio",
        descriptor,
    );
    assert.deepEqual(requests, ["dogs"]);
    assert.deepEqual(stages.slice(-3), ["authorize", "validate", "resolve"]);
    assert.equal(entry.fields!.audio, "file:base.audio");
    ctx.registerFlow({
        id: "study:library:regenerateAudio",
        stages: ["authorize", "validate", "resolve", "persist"],
    });
    await library.readAudio(
        { accountId: "admin", role: "admin" },
        "dog",
        "audio",
        descriptor,
        true,
    );
    assert.equal(writes, 0);
    assert.equal(entry.fields!.audio, "file:base.audio");
    assert.deepEqual(requests, ["dogs", "dogs"]);
    const published = library.listSchemas()[0].layers[0].fields![0];
    assert.equal(published.audioLookupAvailable, true);
    assert.deepEqual(published.metadata, schema.layers[0].fields![0].metadata);
    provider.supports = () => false;
    assert.equal(
        Boolean(
            library.listSchemas()[0].layers[0].fields![0].audioLookupAvailable,
        ),
        false,
    );
});

test("only the first pronunciation controls playback and cache identity", async () => {
    const cache = createAudioCache();
    const spoken: string[] = [];
    const provider: StudyAudioCapability = {
        registerProvider() {
            throw new Error("not_used");
        },
        supports: () => true,
        cacheKey: (input) => `reading-${input.readings?.[0]}.audio`,
        fetchAudio: async (input) => {
            assert.equal(input.readings?.length, 1);
            spoken.push(input.readings![0]);
            return { mediaType: "audio/mpeg", data: new Uint8Array([1, 2]) };
        },
    };
    const entry = {
        scope: "global",
        id: "kanji",
        language: "ja",
        label: "字",
        fields: {
            pronunciation: [
                "first",
                ...Array.from({ length: 20 }, (_, index) => `other-${index}`),
            ],
        },
    } as LibraryEntry;
    const layer = {
        id: "kanji",
        semanticRole: "compoundWritingUnit",
        fields: [{ id: "audio", type: "audio" }],
    } as LibraryLayerSchema;
    await readEntryAudio(entry, layer, "audio", cache, provider);
    entry.fields!.pronunciation = ["first", "changed-secondary"];
    await readEntryAudio(entry, layer, "audio", cache, provider);
    assert.deepEqual(spoken, ["first"]);
    entry.fields!.pronunciation = ["second", "first"];
    await readEntryAudio(entry, layer, "audio", cache, provider);
    assert.deepEqual(spoken, ["first", "second"]);
});
