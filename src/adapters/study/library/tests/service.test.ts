import assert from "node:assert/strict";
import test from "node:test";
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
    const remove = library.registerLookupProvider({
        id: "dictionary",
        supports: () => true,
        lookup: async () => [
            {
                provider: "dictionary",
                provenance: "dictionary:test",
                confidence: 0.8,
                fields: { gloss: "result" },
            },
        ],
    });

    assert.equal(
        (
            await library.lookup({
                schemaId: "test-language",
                layer: "units",
                label: "item",
            })
        ).length,
        1,
    );
    remove();
    assert.deepEqual(
        await library.lookup({
            schemaId: "test-language",
            layer: "units",
            label: "item",
        }),
        [],
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
