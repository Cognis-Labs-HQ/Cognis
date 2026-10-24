import assert from "node:assert/strict";
import test from "node:test";
import type { NamespaceFileClient, StudyAudioCapability } from "@cognis/core";
import { LibraryAudioCache } from "../../audio-cache.js";
import { readAuthorizedEntryAudio } from "../../service/audio.js";
import { createLibraryFlow } from "../reuse/flows.js";
import type { LibraryEntry, LibrarySchema } from "../../types.js";
import { LibraryStore } from "../../store.js";
import type { DbExecutor } from "../../../../../gateways/db/reuse/db-executor.js";

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
        updatedAt: "2026-10-18T00:00:00.000Z",
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
        store: {
            updateField: async () => {
                persisted++;
                entry.fields!.audio = "";
                return true;
            },
        } as unknown as LibraryStore,
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

function regenerationStore(
    beforeUpdate?: (row: Record<string, unknown>) => void,
) {
    const row: Record<string, unknown> = {
        id: "one",
        scope: "global",
        scope_id: "global",
        language: "ja",
        schema_id: "test",
        schema_version: 9,
        layer: "words",
        label: "犬",
        class: "lexical:noun",
        tags_json: '["noun","beginner"]',
        fields_json: JSON.stringify({
            audio: "file:manual",
            pronunciation: ["いぬ"],
            images: ["file:custom-image"],
        }),
        hidden: true,
        always_show_definition: true,
        protected: true,
        provider_modified: true,
        created_by: "admin",
        owners_json: '["admin","author"]',
        created_at: "2026-10-17T00:00:00.000Z",
        updated_at: "2026-10-18T00:00:00.000Z",
    };
    const references = [
        {
            source_entry_id: "one",
            target_entry_id: "reading",
            relation: "reading-kana",
            group_index: 0,
            position: 0,
        },
    ];
    const database: DbExecutor = {
        ensureTable: async () => {},
        transaction: async (operation) => operation(database),
        executeCommand: async (command) => {
            if (command.option === "SELECT")
                return {
                    rows:
                        command.table === "study_library_entries"
                            ? [{ ...row }]
                            : command.table === "study_library_reference_groups"
                              ? structuredClone(references)
                              : [],
                };
            if (
                command.option !== "UPDATE" ||
                command.table !== "study_library_entries"
            )
                throw new Error("unexpected_card_mutation");
            beforeUpdate?.(row);
            for (const [key, value] of Object.entries(command.set)) {
                assert.notEqual(value, undefined, key);
                if (["label", "schema_version"].includes(key))
                    assert.notEqual(value, null, key);
            }
            if (
                !command.where?.every(
                    ({ column, value }) => row[column] === value,
                )
            )
                return { rowCount: 0 };
            Object.assign(row, command.set);
            return { rowCount: 1 };
        },
    };
    return { store: new LibraryStore(database), row, references };
}

for (const concurrent of [false, true])
    test(`regeneration through the store ${concurrent ? "retains a concurrent card edit" : "preserves required columns, grouped links, ownership and custom fields"}`, async () => {
        const { store, row, references } = regenerationStore(
            concurrent
                ? (current) => {
                      current.updated_at = "2026-10-18T00:01:00.000Z";
                      current.label = "編集した犬";
                  }
                : undefined,
        );
        const before = structuredClone(row);
        const objects = new Map<string, Uint8Array>();
        const cache = new LibraryAudioCache({
            get: async (_actor, key) => objects.get(key) ?? null,
            put: async (_actor, key, data) => {
                objects.set(key, data);
            },
        } as NamespaceFileClient);
        const schema = {
            layers: [
                {
                    id: "words",
                    semanticRole: "lexicalUnit",
                    fields: [{ id: "audio", type: "audio" }],
                },
            ],
        } as LibrarySchema;
        const operations: string[] = [];
        const dependencies = {
            store,
            cache,
            flow: createLibraryFlow((id) => operations.push(id)),
            read: async () => store.get("one"),
            schema: () => schema,
            provider: {
                supports: () => true,
                cacheKey: () => "generated",
                fetchAudio: async () => ({
                    mediaType: "audio/mpeg",
                    data: new Uint8Array([3]),
                }),
            } as unknown as StudyAudioCapability,
        };
        const result = readAuthorizedEntryAudio(
            {
                actor: { accountId: "admin", role: "admin" },
                entryId: "one",
                fieldId: "audio",
                refresh: true,
            },
            dependencies,
        );
        if (concurrent) {
            await assert.rejects(result, /audio_entry_changed/);
            assert.equal(row.label, "編集した犬");
            assert.equal(row.fields_json, before.fields_json);
        } else {
            assert.deepEqual((await result).data, Buffer.from([3]));
            assert.deepEqual(JSON.parse(String(row.fields_json)), {
                ...JSON.parse(String(before.fields_json)),
                audio: "",
            });
            for (const key of Object.keys(before).filter(
                (key) => !["fields_json", "updated_at"].includes(key),
            ))
                assert.deepEqual(row[key], before[key], key);
            assert.match(String(row.search_text), /犬 noun beginner/);
            assert.match(String(row.search_text), /custom-image/);
            assert.deepEqual(
                (await store.get("one"))?.referenceGroups?.["reading-kana"][0],
                [{ entryId: "reading", relation: "reading-kana", position: 0 }],
            );
            assert.deepEqual(
                (
                    await readAuthorizedEntryAudio(
                        {
                            actor: { accountId: "admin", role: "admin" },
                            entryId: "one",
                            fieldId: "audio",
                        },
                        dependencies,
                    )
                ).data,
                Buffer.from([3]),
            );
        }
        assert.equal(references[0].target_entry_id, "reading");
        assert.equal(operations[0], "study:library:regenerateAudio");
    });
