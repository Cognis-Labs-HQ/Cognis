import assert from "node:assert/strict";
import test from "node:test";
import type { NamespaceFileClient, StudyAudioCapability } from "@cognis/core";
import { LibraryAudioCache } from "../audio-cache.js";
import { readAuthorizedEntryAudio } from "../service/audio.js";
import { createLibraryFlow } from "./reuse/flows.js";
import type { LibraryEntry, LibrarySchema } from "../types.js";

test("only global administrators can regenerate, bypassing cache and replacing an explicit recording", async () => {
    const objects = new Map<string, Uint8Array>();
    const cache = new LibraryAudioCache({
        get: async (_actor, key) => objects.get(key) ?? null,
        put: async (_actor, key, data) => {
            objects.set(key, data);
        },
    } as NamespaceFileClient);
    await cache.store("manual", "audio/mpeg", new Uint8Array([1]));
    await cache.store("generated", "audio/mpeg", new Uint8Array([2]));
    const entry = {
        id: "one",
        scope: "global",
        language: "en",
        schemaId: "test",
        layer: "words",
        label: "dog",
        fields: { audio: "file:manual" },
    } as LibraryEntry;
    const schema = {
        layers: [
            {
                id: "words",
                semanticRole: "lexicalUnit",
                fields: [{ id: "audio", type: "audio" }],
            },
        ],
    } as LibrarySchema;
    let calls = 0;
    let persisted = 0;
    const dependencies = {
        cache,
        flow: createLibraryFlow(),
        read: async () => entry,
        schema: () => schema,
        provider: {
            supports: () => true,
            cacheKey: () => "generated",
            fetchAudio: async () => {
                calls++;
                return { mediaType: "audio/mpeg", data: new Uint8Array([3]) };
            },
        } as unknown as StudyAudioCapability,
        replaceManual: async () => {
            persisted++;
            entry.fields!.audio = "";
        },
    };
    const input = {
        actor: { accountId: "admin", role: "admin" },
        entryId: "one",
        fieldId: "audio",
        refresh: true,
    };
    await assert.rejects(
        readAuthorizedEntryAudio(
            { ...input, actor: { accountId: "user", role: "user" } },
            dependencies,
        ),
        /forbidden/,
    );
    entry.scope = "user";
    await assert.rejects(
        readAuthorizedEntryAudio(input, dependencies),
        /forbidden/,
    );
    assert.equal(calls, 0);
    entry.scope = "global";
    assert.deepEqual(
        (
            await readAuthorizedEntryAudio(
                { ...input, refresh: false },
                dependencies,
            )
        ).data,
        Buffer.from([1]),
    );
    assert.deepEqual(
        (await readAuthorizedEntryAudio(input, dependencies)).data,
        Buffer.from([3]),
    );
    assert.equal(calls, 1);
    assert.equal(persisted, 1);
    assert.deepEqual(
        (
            await readAuthorizedEntryAudio(
                { ...input, refresh: false },
                dependencies,
            )
        ).data,
        Buffer.from([3]),
    );
    assert.equal(calls, 1);
});
