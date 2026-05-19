/**
 * Abstract user-preference store interface used by the API layer. Concrete
 * implementations (DB-backed) live in the adapters; this definition keeps
 * route handlers free of any gateway-specific import.
 *
 * @example
 *   import type { UserPreferenceStore } from '../../reuse/preference-store.js';
 *   export function createSystemRoutes(prefs: UserPreferenceStore) { ... }
 */

export interface UserPreferenceStore {
    get(accountId: string, pageId: string): Promise<string | null>;
    set(accountId: string, pageId: string, layoutJson: string): Promise<void>;
    clearUser(accountId: string): Promise<void>;
}

/**
 * In-memory implementation of UserPreferenceStore for use in tests.
 * No persistence — state resets on every instantiation.
 */
export class VolatileUserPreferenceStore implements UserPreferenceStore {
    private readonly data = new Map<string, string>();

    async get(accountId: string, pageId: string) {
        return this.data.get(`${accountId}:${pageId}`) ?? null;
    }

    async set(accountId: string, pageId: string, layoutJson: string) {
        this.data.set(`${accountId}:${pageId}`, layoutJson);
    }

    async clearUser(accountId: string) {
        for (const key of this.data.keys()) {
            if (key.startsWith(`${accountId}:`)) this.data.delete(key);
        }
    }
}
