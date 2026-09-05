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
