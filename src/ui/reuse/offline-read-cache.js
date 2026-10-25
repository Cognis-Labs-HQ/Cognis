import { offlinePolicy } from "./offline-policy.js";
/**
 * Bounded, session-only snapshots for explicitly selected lightweight reads.
 * Public exports: createOfflineReadCache — create a component-owned read cache.
 * @example const read = createOfflineReadCache({ signal });
 * const data = await read('schemas', () => fetchSchemas());
 * @param {{signal?: AbortSignal, maxBytes?: number, maxEntries?: number}} options
 * @returns {((key: string, load: () => Promise<unknown>) => Promise<unknown>) & {has: (key: string) => boolean}} Cached read executor and snapshot readiness.
 */
import {
    isOffline,
    offlineEnabled,
    offlineCacheGeneration,
} from "./offline-state.js";

export function createOfflineReadCache({
    signal,
    maxBytes = 4_000_000,
    maxEntries = 100,
} = {}) {
    const snapshots = new Map();
    let identity;
    let size = 0;
    let generation = 0;
    const pending = new Map();
    const readIdentity = () =>
        JSON.stringify([
            offlineCacheGeneration(),
            globalThis.localStorage?.getItem("cognis_account"),
            globalThis.localStorage?.getItem("cognis_access_token"),
            globalThis.localStorage?.getItem("cognis_session_expires_at"),
        ]);
    function clear() {
        snapshots.clear();
        size = 0;
        generation += 1;
        pending.clear();
    }
    signal?.addEventListener("abort", clear, { once: true });
    const execute = async (key, load, canCache = () => true) => {
        signal?.throwIfAborted();
        const currentIdentity = readIdentity();
        const expiry = globalThis.localStorage?.getItem(
            "cognis_session_expires_at",
        );
        if (expiry && !(Date.parse(expiry) > Date.now())) clear();
        if (identity !== currentIdentity || !offlineEnabled()) clear();
        identity = currentIdentity;
        const restore = () => {
            const snapshot = snapshots.get(key);
            if (snapshot === undefined)
                throw new Error("offline_read_unavailable");
            return JSON.parse(snapshot);
        };
        if (isOffline()) {
            if (!offlinePolicy.allows())
                throw new Error("offline_access_denied");
            return restore();
        }
        const loadGeneration = generation;
        let result;
        try {
            if (!pending.has(key))
                pending.set(key, Promise.resolve().then(load));
            result = await pending.get(key);
        } catch (error) {
            if ([401, 403].includes(error?.status)) clear();
            if (
                (error?.status && error.status < 500) ||
                signal?.aborted ||
                !isOffline() ||
                readIdentity() !== currentIdentity ||
                loadGeneration !== generation
            )
                throw error;
            console.info("[offline] restoring lightweight read", {
                operation: "restoreRead",
            });
            if (!offlinePolicy.allows())
                throw new Error("offline_access_denied");
            return restore();
        } finally {
            pending.delete(key);
        }
        signal?.throwIfAborted();
        if (
            loadGeneration !== generation ||
            !offlineEnabled() ||
            readIdentity() !== currentIdentity ||
            !canCache(result)
        )
            return result;
        const snapshot = JSON.stringify(result);
        if (snapshot !== undefined && snapshot.length * 2 <= maxBytes) {
            let changed = !snapshots.has(key);
            size -= (snapshots.get(key)?.length ?? 0) * 2;
            snapshots.delete(key);
            while (
                snapshots.size &&
                (size + snapshot.length * 2 > maxBytes ||
                    snapshots.size >= maxEntries)
            ) {
                changed = true;
                const oldest = snapshots.keys().next().value;
                size -= snapshots.get(oldest).length * 2;
                snapshots.delete(oldest);
            }
            snapshots.set(key, snapshot);
            size += snapshot.length * 2;
            if (changed && typeof globalThis.CustomEvent === "function")
                globalThis.window?.dispatchEvent(
                    new CustomEvent("cognis:offline-data-changed"),
                );
        }
        return result;
    };
    execute.has = (key) => {
        const expiry = globalThis.localStorage?.getItem(
            "cognis_session_expires_at",
        );
        return (
            !signal?.aborted &&
            offlineEnabled() &&
            identity === readIdentity() &&
            (!expiry || Date.parse(expiry) > Date.now()) &&
            snapshots.has(key)
        );
    };
    return execute;
}
