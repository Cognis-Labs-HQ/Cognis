import assert from "node:assert/strict";
import test from "node:test";
import path from "node:path";
import { LibraryService } from "../service.js";
import type { LibrarySchema } from "../types.js";

const schema = (version: number): LibrarySchema => ({
    id: "test-language",
    version,
    namespace: "test",
    language: "x-test",
    metadata: { labels: { en: "Test Language" } },
    layers: [{ id: "units", metadata: { labels: { en: "Units" } } }],
});

function service() {
    const saved: LibrarySchema[] = [];
    const store = {
        saveSchema: async (value: LibrarySchema) => {
            saved.push(value);
        },
    };
    return {
        library: new LibraryService(store as never),
        saved,
    };
}

test("content-pack notifications report only newly introduced records", async () => {
    const root = path.resolve(
        process.cwd(),
        "src/adapters/study/library/tests/fixtures/external-pack",
    );
    const notifications: Array<{ entryCount: number; language?: string }> = [];
    const createLibrary = (newRecordCount: number) =>
        new LibraryService(
            {
                ingestContentPack: async (plan: {
                    manifest: {
                        id: string;
                        publisher: string;
                        version: string;
                        contentRevision: string;
                    };
                    schema: { id: string; version: number };
                    digest: string;
                    records: unknown[];
                }) => ({
                    packId: plan.manifest.id,
                    publisher: plan.manifest.publisher,
                    version: plan.manifest.version,
                    contentRevision: plan.manifest.contentRevision,
                    schemaId: plan.schema.id,
                    schemaVersion: plan.schema.version,
                    digest: plan.digest,
                    recordCount: plan.records.length,
                    newRecordCount,
                    relationshipCount: 0,
                    unchanged: false,
                }),
            } as never,
            undefined,
            undefined,
            undefined,
            undefined,
            { store: async () => {} } as never,
            async (notification) => notifications.push(notification),
        );

    await createLibrary(0).ingestContentPack(root);
    assert.deepEqual(notifications, []);
    await createLibrary(2).ingestContentPack(root);
    assert.deepEqual(notifications, [{ entryCount: 2, language: "x-fixture" }]);
});

test("class publishing locations are filtered by the selected language", async () => {
    const requestedLanguages: Array<string | undefined> = [];
    const library = new LibraryService({} as never, {
        async canRead() {
            return true;
        },
        async canWrite() {
            return true;
        },
        async listReadable() {
            return [];
        },
        async listWritable(_accountId, _role, language) {
            requestedLanguages.push(language);
            return ["class-japanese"];
        },
    });

    const locations = await library.locations(
        { accountId: "teacher-1", role: "teacher" },
        "ja",
    );

    assert.deepEqual(requestedLanguages, ["ja"]);
    assert.deepEqual(locations.writable, [
        { scope: "user", scopeId: "teacher-1" },
        { scope: "class", scopeId: "class-japanese" },
    ]);
});

test("schema registrations are versioned, persisted, and immutable", async () => {
    const { library, saved } = service();
    const input = schema(1);
    await library.registerSchema(input);
    input.metadata.labels.en = "Changed outside the registry";

    assert.equal(
        library.getSchema("test-language")?.metadata.labels.en,
        "Test Language",
    );
    const listed = library.listSchemas();
    assert.equal(listed[0].metadata.labels.en, "Test Language");
    listed[0].metadata.labels.en = "Changed outside the listing";
    assert.equal(library.listSchemas()[0].metadata.labels.en, "Test Language");
    assert.equal(saved.length, 1);
    await assert.rejects(
        library.registerSchema(schema(1)),
        /schema_version_registered/,
    );
});

test("entry updates migrate stored records to the current schema version", async () => {
    const current = {
        id: "entry-1",
        schemaId: "test-language",
        schemaVersion: 1,
        layer: "units",
        label: "before",
        fields: {},
        references: [],
        scope: "global",
        scopeId: "global",
        createdBy: "admin",
    };
    let updatedInput: Record<string, unknown> | undefined;
    const library = new LibraryService({
        saveSchema: async () => {},
        get: async () => current,
        update: async (_id: string, input: Record<string, unknown>) => {
            updatedInput = input;
            return { ...current, ...input };
        },
    } as never);
    await library.registerSchema(schema(1));
    await library.registerSchema(schema(2));

    const updated = await library.update(
        { accountId: "admin", role: "admin" },
        current.id,
        { ...current, label: "after" },
    );

    assert.equal(updated.schemaVersion, 2);
    assert.equal(updatedInput?.schemaVersion, 2);
});

test("entry traces retain edit permission metadata", async () => {
    const entry = {
        id: "entry-1",
        schemaId: "test-language",
        schemaVersion: 1,
        layer: "units",
        label: "editable",
        fields: {},
        references: [],
        scope: "user",
        scopeId: "alice",
        createdBy: "alice",
    };
    const library = new LibraryService({
        get: async () => entry,
        referencesFor: async () => [],
    } as never);

    const detail = await library.trace(
        { accountId: "alice", role: "user" },
        entry.id,
    );

    assert.equal(detail.entry.canEdit, true);
    assert.equal(detail.entry.editRequiresReview, false);
});

test("provider metadata survives store and capability round trips", async () => {
    const { library, saved } = service();
    const external = {
        ...schema(1),
        metadata: {
            labels: { en: "Test Language", de: "Testsprache" },
            catalog: { featured: true, order: 4 },
        },
        layers: [
            {
                id: "units",
                metadata: { labels: { en: "Units" }, icon: "shapes" },
                fields: [
                    {
                        id: "score",
                        type: "providerScore",
                        validation: { kind: "number" as const, minimum: 0 },
                        metadata: { labels: { en: "Score" }, unit: "points" },
                    },
                ],
            },
        ],
    };
    await library.registerSchema(external);
    assert.deepEqual(saved[0], external);
    assert.deepEqual(library.listSchemas()[0], external);
});

test("content-pack audio lists are cached and rewritten entry by entry", async () => {
    const stored: string[] = [];
    const library = new LibraryService(
        {} as never,
        undefined,
        undefined,
        undefined,
        undefined,
        {
            store: async (key: string) => void stored.push(key),
        } as never,
    );
    const plan = {
        manifest: { publisher: "Fixture", id: "pack", version: "1.0.0" },
        schema: {
            layers: [
                { id: "words", fields: [{ id: "audio", type: "audioList" }] },
            ],
        },
        records: [
            { layer: "words", fields: { audio: ["one.mp3", "two.mp3"] } },
        ],
        assets: ["one.mp3", "two.mp3"].map((path) => ({
            path,
            mediaType: "audio/mpeg",
            data: Buffer.from(path).toString("base64"),
        })),
    };
    await (
        library as unknown as {
            storeContentPackAudio(value: unknown): Promise<void>;
        }
    ).storeContentPackAudio(plan);
    assert.equal(stored.length, 2);
    assert.deepEqual(plan.records[0].fields.audio, [
        `file:${stored[0]}`,
        `file:${stored[1]}`,
    ]);
    assert.deepEqual(plan.assets, []);
});

test("language providers can contribute a complete card constructor", async () => {
    const { library } = service();
    await library.registerSchema({
        ...schema(1),
        layers: [
            {
                id: "units",
                metadata: { labels: { en: "Units" } },
                fields: [
                    {
                        id: "reading",
                        metadata: { labels: { en: "Reading" } },
                        type: "string",
                    },
                ],
            },
        ],
    });
    const remove = library.registerFormContribution({
        id: "test-language:unit-constructor",
        schemaId: "test-language",
        layerId: "units",
        cardConstructor: {
            label: { labels: { en: "Written form" } },
            fields: ["reading"],
            defaults: { reading: "default" },
            allowAlwaysShowDefinition: true,
        },
    });

    assert.deepEqual(library.listSchemas()[0].layers[0].cardConstructor, {
        label: { labels: { en: "Written form" } },
        fields: ["reading"],
        defaults: { reading: "default" },
        allowAlwaysShowDefinition: true,
    });
    remove();
    assert.equal(library.listSchemas()[0].layers[0].cardConstructor, undefined);
});

test("card constructors reject unknown provider fields", async () => {
    const { library } = service();
    await library.registerSchema(schema(1));
    assert.throws(
        () =>
            library.registerFormContribution({
                id: "test-language:invalid-constructor",
                schemaId: "test-language",
                layerId: "units",
                cardConstructor: {
                    label: { labels: { en: "Unit" } },
                    fields: ["missing"],
                },
            }),
        /constructor_field_not_found/,
    );
});

test("lookup providers are ranked and cleanly removable", async () => {
    const { library } = service();
    await library.registerSchema(schema(1));
    let lookupLabel = "";
    const remove = library.registerLookupProvider({
        id: "dictionary",
        metadata: { labels: { en: "Test Dictionary" } },
        supports: () => true,
        lookup: async ({ label }) => {
            lookupLabel = label;
            return [
                {
                    provider: "dictionary",
                    provenance: "dictionary:test",
                    confidence: 0.8,
                    fields: { gloss: "result" },
                },
            ];
        },
    });

    assert.deepEqual(
        library.listLookupProviders({
            schemaId: "test-language",
            layer: "units",
        }),
        [
            {
                id: "dictionary",
                metadata: { labels: { en: "Test Dictionary" } },
            },
        ],
    );
    assert.equal(
        (
            await library.lookup("dictionary", {
                schemaId: "test-language",
                layer: "units",
                label: "item",
            })
        ).length,
        1,
    );
    assert.equal(lookupLabel, "item");
    remove();
    assert.deepEqual(
        library.listLookupProviders({
            schemaId: "test-language",
            layer: "units",
        }),
        [],
    );
    await assert.rejects(
        library.lookup("dictionary", {
            schemaId: "test-language",
            layer: "units",
            label: "item",
        }),
        /lookup_provider_not_found/,
    );
});

test("entry traces exclude self-references and duplicate dependants", async () => {
    const entry = {
        id: "character-i",
        scope: "global",
        scopeId: "global",
        references: [],
    };
    const dependant = {
        id: "word-i",
        scope: "global",
        scopeId: "global",
        references: [{ entryId: entry.id, relation: "characters" }],
    };
    const store = {
        get: async (id: string) => (id === entry.id ? entry : null),
        referencesFor: async () => [entry, entry, dependant, dependant],
    };
    const library = new LibraryService(store as never);

    const detail = await library.trace(
        { accountId: "owner", role: "owner" },
        entry.id,
    );

    assert.deepEqual(detail.usedBy, [dependant]);
});

test("users delete personal entries while administrators delete global entries", async () => {
    const deleted: Array<{
        ids: readonly string[];
        accountId: string;
        blacklist: boolean;
    }> = [];
    const entries = new Map([
        [
            "owned",
            {
                id: "owned",
                scope: "user",
                scopeId: "alice",
                createdBy: "alice",
                protected: false,
            },
        ],
        [
            "module",
            {
                id: "module",
                scope: "global",
                scopeId: "global",
                createdBy: "content-pack:language",
                protected: false,
            },
        ],
    ]);
    const store = {
        get: async (id: string) => entries.get(id) ?? null,
        resolveDeletionCascade: async (ids: readonly string[]) => ids,
        deleteEntries: async (
            ids: readonly string[],
            accountId: string,
            blacklist: boolean,
            authorize: (entries: readonly unknown[]) => Promise<void>,
        ) => {
            await authorize(ids.map((id) => entries.get(id)));
            deleted.push({ ids, accountId, blacklist });
            return ids;
        },
    };
    const library = new LibraryService(store as never);

    await library.deleteEntries(
        { accountId: "alice", role: "user" },
        ["owned"],
        false,
    );
    await library.deleteEntries(
        { accountId: "admin", role: "admin" },
        ["module"],
        true,
    );

    assert.deepEqual(deleted, [
        { ids: ["owned"], accountId: "alice", blacklist: false },
        { ids: ["module"], accountId: "admin", blacklist: true },
    ]);
});

test("protected provider entries cannot be deleted even by administrators", async () => {
    const entry = {
        id: "protected",
        scope: "global",
        scopeId: "global",
        createdBy: "content-pack:language",
        protected: true,
    };
    const store = {
        deleteEntries: async (
            _ids: readonly string[],
            _accountId: string,
            _blacklist: boolean,
            authorize: (entries: readonly unknown[]) => Promise<void>,
        ) => authorize([entry]),
    };
    const library = new LibraryService(store as never);
    await assert.rejects(
        library.deleteEntries(
            { accountId: "admin", role: "admin" },
            [entry.id],
            false,
        ),
        /protected_content/,
    );
});

test("promotion approval moves personal content into the requested scope", async () => {
    const source = {
        id: "personal-card",
        scope: "user",
        scopeId: "alice",
        createdBy: "alice",
        protected: false,
    };
    const moves: unknown[] = [];
    const store = {
        getPush: async () => ({
            id: "request",
            sourceEntryId: source.id,
            destination: { scope: "global", scopeId: "global" },
            requestedBy: "alice",
            status: "pending",
        }),
        get: async () => source,
        move: async (_id: string, destination: unknown) => {
            moves.push(destination);
            return { ...source, ...(destination as object) };
        },
        reviewPush: async () => {},
    };
    const library = new LibraryService(store as never);
    await library.reviewPush(
        { accountId: "admin", role: "admin" },
        "request",
        "approved",
    );
    assert.deepEqual(moves, [{ scope: "global", scopeId: "global" }]);
});

test("authors submit global card edits as update requests", async () => {
    const source = {
        id: "global-card",
        label: "Original",
        scope: "global",
        scopeId: "global",
        createdBy: "alice",
        protected: false,
    };
    let captured: unknown;
    const store = {
        get: async () => source,
        listPushRequests: async () => [],
        createPush: async (...args: unknown[]) => {
            captured = args;
            return { id: "update-request", status: "pending" };
        },
    };
    const library = new LibraryService(store as never);
    const proposed = {
        schemaId: "test-language",
        layer: "units",
        label: "Updated",
        fields: {},
    };
    await library.requestUpdate(
        { accountId: "alice", role: "user" },
        source.id,
        proposed,
    );
    assert.deepEqual(captured, [
        source.id,
        { scope: "global", scopeId: "global" },
        "alice",
        "update",
        proposed,
    ]);
});

test("authorized reviewers receive the source card with each request", async () => {
    const source = {
        id: "personal-card",
        label: "Learner contribution",
        scope: "user",
        scopeId: "alice",
        createdBy: "alice",
    };
    const store = {
        listPushRequests: async () => [
            {
                id: "request",
                sourceEntryId: source.id,
                destination: { scope: "class", scopeId: "class-a" },
                requestedBy: "alice",
                status: "pending",
            },
        ],
        get: async () => source,
    };
    const library = new LibraryService(store as never, {
        canRead: async () => true,
        canWrite: async () => true,
    });

    const requests = await library.listPushRequests({
        accountId: "teacher",
        role: "teacher",
    });
    assert.equal(requests[0].source?.label, "Learner contribution");
    assert.equal(requests[0].canReview, true);
});

test("submitters can withdraw pending visibility requests", async () => {
    const statuses: string[] = [];
    const store = {
        getPush: async () => ({
            id: "request",
            sourceEntryId: "personal-card",
            destination: { scope: "global", scopeId: "global" },
            requestedBy: "alice",
            status: "pending",
        }),
        get: async () => ({
            id: "personal-card",
            scope: "user",
            scopeId: "alice",
        }),
        reviewPush: async (_id: string, status: string) => {
            statuses.push(status);
        },
    };
    const library = new LibraryService(store as never);

    const request = await library.withdrawPush(
        { accountId: "alice", role: "user" },
        "request",
    );
    assert.equal(request.status, "withdrawn");
    assert.deepEqual(statuses, ["withdrawn"]);
});

test("provider cards cannot be sent to a personal namespace", async () => {
    const entry = {
        id: "provider-card",
        scope: "global",
        scopeId: "global",
        createdBy: "content-pack:japanese-core",
        protected: false,
    };
    const store = { get: async () => entry };
    const library = new LibraryService(store as never);

    await assert.rejects(
        library.moveToPersonal({ accountId: "admin", role: "admin" }, entry.id),
        /provider_content/,
    );
});

test("global downgrades return content to its original submitter", async () => {
    const entry = {
        id: "global-card",
        scope: "global",
        scopeId: "global",
        createdBy: "alice",
        protected: false,
    };
    let destination: unknown;
    const store = {
        get: async () => entry,
        move: async (_id: string, value: unknown) => {
            destination = value;
            return { ...entry, ...(value as object) };
        },
    };
    const library = new LibraryService(store as never);
    await library.moveToPersonal(
        { accountId: "admin", role: "admin" },
        entry.id,
    );
    assert.deepEqual(destination, { scope: "user", scopeId: "alice" });
});

test("content deletion rejects actors who do not own every cascaded entry", async () => {
    let deleteCalled = false;
    const store = {
        get: async (id: string) => ({
            id,
            scope: "global",
            scopeId: "global",
            createdBy: id === "owned" ? "alice" : "bob",
        }),
        resolveDeletionCascade: async () => ["owned", "dependent"],
        deleteEntries: async (
            _ids: readonly string[],
            _accountId: string,
            _blacklist: boolean,
            authorize: (entries: readonly unknown[]) => Promise<void>,
        ) => {
            await authorize([
                await store.get("owned"),
                await store.get("dependent"),
            ]);
            deleteCalled = true;
        },
    };
    const library = new LibraryService(store as never);

    await assert.rejects(
        library.deleteEntries(
            { accountId: "alice", role: "user" },
            ["owned"],
            false,
        ),
        /forbidden/,
    );
    assert.equal(deleteCalled, false);
});

test("definition creation generates a key and requires English", async () => {
    let captured: Record<string, unknown> | undefined;
    const store = {
        saveSchema: async () => {},
        create: async (
            _location: unknown,
            input: Record<string, unknown>,
            _language: string,
            _account: string,
            id: string,
        ) => {
            captured = { input, id };
            return { ...input, id };
        },
    };
    const library = new LibraryService(store as never);
    await library.registerSchema({
        ...schema(1),
        layers: [
            {
                id: "definitions",
                semanticRole: "definition",
                metadata: { labels: { en: "Definitions" } },
                fields: [
                    {
                        id: "key",
                        type: "string",
                        metadata: { labels: { en: "Key" } },
                    },
                    {
                        id: "text",
                        type: "localizedText",
                        metadata: { labels: { en: "Text" } },
                    },
                ],
                definitionLocalization: {
                    stringKeyPrefix: "test:definitions",
                    stringKeyField: "key",
                    translationsField: "text",
                },
            },
        ],
    });
    const actor = { accountId: "owner", role: "owner" as const };
    await library.create(
        actor,
        { scope: "global" },
        {
            schemaId: "test-language",
            layer: "definitions",
            label: "Greeting",
            fields: { text: { en: "Greeting" } },
        },
    );
    const generatedId = String(captured?.id);
    assert.equal(
        (captured?.input as { fields: { key: string } }).fields.key,
        `test:definitions:${generatedId}`,
    );
    await assert.rejects(
        library.create(
            actor,
            { scope: "global" },
            {
                schemaId: "test-language",
                layer: "definitions",
                label: "Gruß",
                fields: { text: { de: "Gruß" } },
            },
        ),
        /definition_english_required/,
    );
});
