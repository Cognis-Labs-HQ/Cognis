import type { UserPreferenceStore } from "../../../../api/reuse/preference-store.js";

export interface DictionarySearchContext {
    language: string;
    providerId: string;
    schemaId: string;
    query: string;
}

const KEY = "study-dictionary-search";

/** Latest search is account-owned state, resolved through the authenticated session. */
export class DictionarySearchState {
    constructor(private readonly preferences: UserPreferenceStore) {}

    async get(accountId: string): Promise<DictionarySearchContext | null> {
        const saved = await this.preferences.get(accountId, KEY);
        return saved ? JSON.parse(saved) : null;
    }

    async set(
        accountId: string,
        input: unknown,
    ): Promise<DictionarySearchContext> {
        const value = input as DictionarySearchContext | null;
        if (
            !value ||
            ["language", "providerId", "schemaId", "query"].some((key) => {
                const field = value[key as keyof DictionarySearchContext];
                return (
                    typeof field !== "string" ||
                    !field.trim() ||
                    field.length > 100
                );
            })
        )
            throw new Error("invalid_query");
        const state = Object.fromEntries(
            ["language", "providerId", "schemaId", "query"].map((key) => [
                key,
                value[key as keyof DictionarySearchContext].trim(),
            ]),
        ) as unknown as DictionarySearchContext;
        await this.preferences.set(accountId, KEY, JSON.stringify(state));
        return state;
    }
}
