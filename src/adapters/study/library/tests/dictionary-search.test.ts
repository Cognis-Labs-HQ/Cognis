import assert from "node:assert/strict";
import test from "node:test";
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
        saveDictionaryCache: async (key: string, results: object[]) =>
            cache.set(key, {
                results,
                cachedAt: new Date().toISOString(),
                expiresAt: Date.now() + 10000,
            }),
    };
    const dictionary = new LibraryDictionarySearch(store as never);
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
        dictionary.search(provider, schema(1), " Ｗｏｒｄ ", false, lookup),
        dictionary.search(provider, schema(1), "Word", false, lookup),
    ]);
    assert.equal(calls, 1);
    assert.deepEqual(first[0].results, first[1].results);
    const restarted = new LibraryDictionarySearch(store as never);
    assert.equal(
        (await restarted.search(provider, schema(1), "Word", false, lookup))
            .cached,
        true,
    );
    assert.equal(calls, 1);
    await restarted.search(provider, schema(1), "Word", true, lookup);
    assert.equal(calls, 2);
    await restarted.search(provider, schema(2), "Word", false, lookup);
    assert.equal(calls, 3);
});

test("dictionary search retries failures and exposes only searchable supported layers", async () => {
    const dictionary = new LibraryDictionarySearch({
        dictionaryCache: async () => null,
        saveDictionaryCache: async () => {},
    } as never);
    let calls = 0;
    const lookup = async () => {
        calls += 1;
        if (calls === 1) throw new Error("offline");
        return [];
    };
    await assert.rejects(
        dictionary.search(provider, schema(1), "Word", false, lookup),
        /offline/,
    );
    assert.equal(
        (await dictionary.search(provider, schema(1), "Word", false, lookup))
            .results.length,
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
            false,
            lookup,
        ),
        /not_searchable/,
    );
    await assert.rejects(
        dictionary.search(provider, schema(1), "", false, lookup),
        /invalid_query/,
    );
});
