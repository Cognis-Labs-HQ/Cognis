import { offlinePolicy } from "./offline-policy.js";
/**
 * Bounded, session-only snapshots for explicitly selected lightweight reads.
 * Public exports: createOfflineReadCache — create a component-owned read cache.
 * @example const read = createOfflineReadCache({ signal });
 * const data = await read('schemas', () => fetchSchemas());
 * @param {{signal?: AbortSignal, maxBytes?: number, maxEntries?: number, preferCached?: boolean, refreshIntervalMs?: number, onlineMaxAgeMs?: number}} options
 * @returns {((key: string, load: () => Promise<unknown>) => Promise<unknown>) & {has: (key: string) => boolean, invalidate: () => void, set: (key: string, value: unknown) => void}} Cached read executor and snapshot readiness.
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
    preferCached = false,
    refreshIntervalMs = 30_000,
    onlineMaxAgeMs = 0,
} = {}) {
    if (!Number.isFinite(onlineMaxAgeMs) || onlineMaxAgeMs < 0)
        throw new TypeError("invalid_online_cache_age");
    const snapshots = new Map();
    let identity;
    let size = 0;
    let generation = 0;
    const pending = new Map();
    const checkedAt = new Map();
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
        checkedAt.clear();
    }

    function notifyReadiness() {
        if (typeof globalThis.CustomEvent === "function")
            globalThis.window?.dispatchEvent(
                new CustomEvent("cognis:offline-data-changed"),
            );
    }

    function removeSnapshot(key) {
        size -= (snapshots.get(key)?.length ?? 0) * 2;
        snapshots.delete(key);
        checkedAt.delete(key);
    }

    function store(key, result) {
        const snapshot = JSON.stringify(result);
        if (snapshot === undefined || snapshot.length * 2 > maxBytes) {
            if (snapshots.has(key)) {
                removeSnapshot(key);
                notifyReadiness();
            }
            return;
        }
        let changed = !snapshots.has(key);
        removeSnapshot(key);
        while (
            snapshots.size &&
            (size + snapshot.length * 2 > maxBytes ||
                snapshots.size >= maxEntries)
        ) {
            changed = true;
            const oldest = snapshots.keys().next().value;
            removeSnapshot(oldest);
        }
        snapshots.set(key, snapshot);
        checkedAt.set(key, Date.now());
        size += snapshot.length * 2;
        if (changed) notifyReadiness();
    }

    signal?.addEventListener("abort", clear, { once: true });
    const execute = async (
        key,
        load,
        canCache = () => true,
        refresh = false,
    ) => {
        signal?.throwIfAborted();
        const currentIdentity = readIdentity();
        const expiry = globalThis.localStorage?.getItem(
            "cognis_session_expires_at",
        );
        if (expiry && !(Date.parse(expiry) > Date.now())) clear();
        if (
            identity !== currentIdentity ||
            (!offlineEnabled() && !onlineMaxAgeMs)
        )
            clear();
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
        if (
            !refresh &&
            snapshots.has(key) &&
            onlineMaxAgeMs > 0 &&
            Date.now() - checkedAt.get(key) < onlineMaxAgeMs
        )
            return restore();
        if (
            preferCached &&
            !refresh &&
            snapshots.has(key) &&
            offlinePolicy.allows()
        ) {
            if (
                !pending.has(key) &&
                Date.now() - (checkedAt.get(key) ?? 0) >= refreshIntervalMs
            ) {
                checkedAt.set(key, Date.now());
                void execute(key, load, canCache, true).catch((error) => {
                    if (signal?.aborted || error?.name === "AbortError") return;
                    console.error("[offline] cached read revalidation failed", {
                        operation: "revalidateRead",
                        errorName: error.name,
                    });
                });
            }
            return restore();
        }
        const loadGeneration = generation;
        let result;
        let loadPromise;
        let replaced = false;
        try {
            if (!pending.has(key))
                pending.set(key, Promise.resolve().then(load));
            loadPromise = pending.get(key);
            result = await loadPromise;
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
            replaced = pending.get(key) !== loadPromise;
            if (pending.get(key) === loadPromise) pending.delete(key);
        }
        signal?.throwIfAborted();
        if (
            replaced &&
            loadGeneration === generation &&
            readIdentity() === currentIdentity
        )
            return snapshots.has(key) ? restore() : result;
        if (
            loadGeneration !== generation ||
            (!offlineEnabled() && !onlineMaxAgeMs) ||
            readIdentity() !== currentIdentity ||
            !canCache(result)
        )
            return result;
        store(key, result);
        return result;
    };
    execute.set = (key, value) => {
        signal?.throwIfAborted();
        const currentIdentity = readIdentity();
        if (identity !== currentIdentity) clear();
        identity = currentIdentity;
        const expiry = globalThis.localStorage?.getItem(
            "cognis_session_expires_at",
        );
        if (
            (!offlineEnabled() && !onlineMaxAgeMs) ||
            (expiry && !(Date.parse(expiry) > Date.now())) ||
            (isOffline() && !offlinePolicy.allows())
        )
            return;
        pending.delete(key);
        store(key, value);
    };
    execute.invalidate = clear;
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
