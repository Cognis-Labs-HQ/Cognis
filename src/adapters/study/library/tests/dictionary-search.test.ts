import { createProbeCache } from "@cognis/core";
import assert from "node:assert/strict";
import test from "node:test";
import { LibraryService } from "../service/index.js";
import { LibraryDictionarySearch } from "../service/dictionary.js";
import { schema } from "./fixtures/service-schema.js";

const provider = {
    id: "dictionary",
    metadata: { labels: { en: "Dictionary" } },
    searchable: true,
    capabilities: ["dictionary"] as const,
    supports: () => true,
    lookup: async () => [],
};

test("dictionary search coalesces requests and persists cache reuse across service restarts", async () => {
    const cache = new Map<string, object>();
    let calls = 0;
    const store = {
        dictionaryCache: async (key: string) => cache.get(key) ?? null,
        saveDictionaryCache: async (key: string, snapshot: object) =>
            cache.set(key, snapshot),
    };
    const dictionary = new LibraryDictionarySearch(
        store as never,
        createProbeCache,
    );
    const lookup = async () => {
        calls += 1;
        await new Promise((resolve) => setTimeout(resolve, 5));
        return [
            {
                provider: provider.id,
                provenance: "dictionary",
                confidence: 1,
                label: "Word",
            },
        ];
    };
    const first = await Promise.all([
        dictionary.search(provider, schema(1), " Ｗｏｒｄ ", lookup),
        dictionary.search(provider, schema(1), "Word", lookup),
    ]);
    assert.equal(calls, 1);
    assert.deepEqual(first[0].results, first[1].results);
    const restarted = new LibraryDictionarySearch(
        store as never,
        createProbeCache,
    );
    assert.equal(
        (await restarted.search(provider, schema(1), "Word", lookup)).cached,
        true,
    );
    assert.equal(calls, 1);
    await restarted.search(provider, schema(2), "Word", lookup);
    assert.equal(calls, 2);
});

test("dictionary search retries failures and exposes only searchable supported layers", async () => {
    const dictionary = new LibraryDictionarySearch(
        {
            dictionaryCache: async () => null,
            saveDictionaryCache: async () => {},
        } as never,
        createProbeCache,
    );
    let calls = 0;
    const lookup = async () => {
        calls += 1;
        if (calls === 1) throw new Error("offline");
        return [];
    };
    await assert.rejects(
        dictionary.search(provider, schema(1), "Word", lookup),
        /offline/,
    );
    assert.equal(
        (await dictionary.search(provider, schema(1), "Word", lookup)).results
            .length,
        0,
    );
    assert.equal(calls, 2);
    const other = { ...schema(1), id: "second" };
    assert.equal(
        dictionary.providers([provider].values(), [schema(1), other]).length,
        2,
    );
    await assert.rejects(
        dictionary.search(
            { ...provider, searchable: false },
            schema(1),
            "Word",
            lookup,
        ),
        /not_searchable/,
    );
    await assert.rejects(
        dictionary.search(provider, schema(1), "", lookup),
        /invalid_query/,
    );
});

test("dictionary search invokes its registered flow for fresh and cached queries", async () => {
    let cached: object | null = null;
    const flows: string[] = [];
    const store = {
        saveSchema: async () => {},
        dictionaryCache: async () => cached,
        saveDictionaryCache: async (_key: string, snapshot: object) => {
            cached = snapshot;
        },
    };
    const library = new LibraryService(
        store as never,
        undefined,
        {
            run: async (id: string) => {
                flows.push(id);
            },
        } as never,
        undefined,
        undefined,
        undefined,
        undefined,
        createProbeCache,
    );
    await library.registerSchema(schema(1));
    library.registerLookupProvider(provider);
    const input = {
        providerId: provider.id,
        schemaId: schema(1).id,
        query: "word",
    };
    await library.searchDictionary(input);
    await library.searchDictionary(input);
    assert.equal(flows.filter((id) => id === "study:library:search").length, 2);
});
