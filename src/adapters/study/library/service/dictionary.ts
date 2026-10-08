import { createHash } from "node:crypto";
import type {
    LibraryLookupProvider,
    LibraryLookupSuggestion,
    LibrarySchema,
    LibraryLayer,
} from "../types.js";
import type { LibraryStore } from "../store.js";

export interface LibraryDictionaryResult extends LibraryLookupSuggestion {
    schemaId: string;
    layer: string;
}

export class LibraryDictionarySearch {
    private readonly pending = new Map<
        string,
        Promise<LibraryDictionaryResult[]>
    >();
    constructor(private readonly store: LibraryStore) {}

    providers(
        providers: Iterable<LibraryLookupProvider>,
        schemas: LibrarySchema[],
        language?: string,
    ) {
        const registered = Array.from(providers);
        return schemas
            .filter((schema) => !language || schema.language === language)
            .flatMap((schema) =>
                registered
                    .filter(
                        (provider) =>
                            provider.searchable === true &&
                            provider.capabilities?.includes("dictionary"),
                    )
                    .map((provider) => ({
                        id: provider.id,
                        metadata: provider.metadata,
                        schemaId: schema.id,
                        layers: schema.layers
                            .filter(
                                (layer) =>
                                    layer.dictionary_lookup !== false &&
                                    provider.supports(schema, layer),
                            )
                            .map(({ id }) => id),
                    }))
                    .filter(({ layers }) => layers.length),
            );
    }

    async search(
        provider: LibraryLookupProvider,
        schema: LibrarySchema,
        rawQuery: string,
        refresh: boolean,
        lookup: (
            layer: string,
            query: string,
        ) => Promise<LibraryLookupSuggestion[]>,
    ) {
        const query = String(rawQuery ?? "")
            .normalize("NFKC")
            .trim()
            .replace(/\s+/g, " ");
        if (!query || query.length > 100) throw new Error("invalid_query");
        if (
            provider.searchable !== true ||
            !provider.capabilities?.includes("dictionary")
        )
            throw new Error("lookup_provider_not_searchable");
        const key = createHash("sha256")
            .update(
                JSON.stringify([
                    provider.id,
                    provider.cacheRevision,
                    schema.id,
                    schema.version,
                    query,
                ]),
            )
            .digest("hex");
        const cached = await this.store.dictionaryCache(key);
        if (!refresh && cached && cached.expiresAt > Date.now())
            return {
                query,
                cached: true,
                results: cached.results,
                cachedAt: cached.cachedAt,
            };
        let pending = this.pending.get(key);
        if (!pending) {
            pending = (async () => {
                const results = (
                    await Promise.all(
                        schema.layers
                            .filter(
                                (layer) =>
                                    layer.dictionary_lookup !== false &&
                                    provider.supports(schema, layer),
                            )
                            .map(async (layer) =>
                                (await lookup(layer.id, query)).map(
                                    (result) => ({
                                        ...result,
                                        schemaId: schema.id,
                                        layer: layer.id,
                                    }),
                                ),
                            ),
                    )
                ).flat();
                await this.store.saveDictionaryCache(key, results);
                return results;
            })();
            this.pending.set(key, pending);
        }
        try {
            return {
                query,
                cached: false,
                results: await pending,
                cachedAt: new Date().toISOString(),
            };
        } finally {
            if (this.pending.get(key) === pending) this.pending.delete(key);
        }
    }
}

export async function lookupDictionarySuggestions(
    provider: LibraryLookupProvider,
    schema: LibrarySchema,
    layer: LibraryLayer,
    label: string,
    refresh: boolean,
): Promise<LibraryLookupSuggestion[]> {
    const suggestions = await provider.lookup({
        schema,
        layer,
        label,
        ...(refresh ? { refresh: true } : {}),
    });
    return suggestions
        .map((suggestion) => ({
            ...suggestion,
            provider: suggestion.provider?.trim() || provider.id,
            provenance: suggestion.provenance?.trim() || provider.id,
            confidence: Number.isFinite(suggestion.confidence)
                ? suggestion.confidence
                : 1,
        }))
        .filter(
            (suggestion) =>
                suggestion.provider.trim() &&
                suggestion.provenance.trim() &&
                Number.isFinite(suggestion.confidence) &&
                suggestion.confidence >= 0 &&
                suggestion.confidence <= 1,
        )
        .sort((left, right) => right.confidence - left.confidence);
}
