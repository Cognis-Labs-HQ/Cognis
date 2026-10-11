import type { ProbeCache, ProbeCacheFactory } from "@cognis/core";
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
    private readonly cache?: ProbeCache<LibraryDictionaryResult[]>;
    constructor(
        store: LibraryStore,
        factory?: ProbeCacheFactory,
        log?: NonNullable<Parameters<ProbeCacheFactory>[1]>["log"],
    ) {
        this.cache = factory?.(
            {
                read: (key) => store.dictionaryCache(key),
                write: (key, snapshot) =>
                    store.saveDictionaryCache(key, snapshot),
            },
            { log },
        );
    }

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
                    "probe-cache:2",
                    provider.id,
                    provider.cacheRevision,
                    schema.id,
                    schema.version,
                    query,
                ]),
            )
            .digest("hex");
        if (!this.cache) throw new Error("core_cache_unavailable");
        const response = await this.cache.read(key, async () =>
            (
                await Promise.all(
                    schema.layers
                        .filter(
                            (layer) =>
                                layer.dictionary_lookup !== false &&
                                provider.supports(schema, layer),
                        )
                        .map(async (layer) =>
                            (await lookup(layer.id, query)).map((result) => ({
                                ...result,
                                schemaId: schema.id,
                                layer: layer.id,
                            })),
                        ),
                )
            ).flat(),
        );
        return {
            query,
            cached: response.cached,
            results: response.value,
            cachedAt: response.cachedAt,
        };
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
