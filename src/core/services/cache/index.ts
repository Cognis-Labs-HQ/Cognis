import { isDeepStrictEqual } from "node:util";
export interface CacheSnapshot<T> {
    value: T;
    pending?: T;
    probedAt: number;
    publishedAt: number;
    expiresAt: number;
}
export interface CachePersistence<T> {
    read(key: string): Promise<CacheSnapshot<T> | null>;
    write(key: string, snapshot: CacheSnapshot<T>): Promise<void>;
}
export interface ProbeCache<T> {
    read(
        key: string,
        load: () => Promise<T>,
    ): Promise<{
        value: T;
        cached: boolean;
        cachedAt: string;
    }>;
}
export type ProbeCacheFactory = <T>(
    persistence: CachePersistence<T>,
    options?: {
        now?: () => number;
        log?: (
            level: string,
            message: string,
            metadata: Record<string, unknown>,
        ) => unknown;
    },
) => ProbeCache<T>;

const HOUR = 60 * 60 * 1000;
export const CORE_CACHE_CAPABILITY = "core:cache";

/**
 * Core-owned persistent caching: probe cold values hourly and publish changes
 * every twelve hours. Concurrent readers share one probe; failed probes retain
 * the last successful value. Consumers supply storage and provider retrieval.
 */
export const createProbeCache: ProbeCacheFactory = <T>(
    persistence: CachePersistence<T>,
    { now = Date.now, log }: Parameters<ProbeCacheFactory>[1] = {},
): ProbeCache<T> => {
    const pending = new Map<
        string,
        Promise<{ value: T; cached: boolean; cachedAt: string }>
    >();
    const read = async (key: string, load: () => Promise<T>) => {
        const timestamp = now();
        let snapshot = await persistence.read(key);
        const cached = Boolean(snapshot && snapshot.expiresAt > timestamp);
        if (!cached) {
            snapshot = {
                value: await load(),
                probedAt: timestamp,
                publishedAt: timestamp,
                expiresAt: timestamp + 24 * HOUR,
            };
            await persistence.write(key, snapshot);
        } else if (snapshot) {
            const publishDue = timestamp - snapshot.publishedAt >= 12 * HOUR;
            if (timestamp - snapshot.probedAt >= HOUR) {
                let candidate: T;
                try {
                    candidate = await load();
                } catch (error) {
                    log?.("error", "Cache change probe failed.", {
                        component: "core-cache",
                        operation: "probe",
                        errorName:
                            error instanceof Error ? error.name : "Error",
                    });
                    return {
                        value: snapshot.value,
                        cached: true,
                        cachedAt: new Date(snapshot.publishedAt).toISOString(),
                    };
                }
                snapshot = {
                    ...snapshot,
                    probedAt: timestamp,
                    expiresAt: timestamp + 24 * HOUR,
                };
                if (isDeepStrictEqual(candidate, snapshot.value))
                    delete snapshot.pending;
                else snapshot.pending = candidate;
                if (publishDue) {
                    if (snapshot.pending !== undefined)
                        snapshot.value = snapshot.pending;
                    delete snapshot.pending;
                    snapshot.publishedAt = timestamp;
                }
                await persistence.write(key, snapshot);
            } else if (publishDue) {
                if (snapshot.pending !== undefined)
                    snapshot.value = snapshot.pending;
                delete snapshot.pending;
                snapshot.publishedAt = timestamp;
                await persistence.write(key, snapshot);
            }
        }
        return {
            value: snapshot!.value,
            cached,
            cachedAt: new Date(snapshot!.publishedAt).toISOString(),
        };
    };
    return {
        read(key, load) {
            let operation = pending.get(key);
            if (!operation) {
                operation = Promise.resolve().then(() => read(key, load));
                pending.set(key, operation);
            }
            return operation.finally(() => {
                if (pending.get(key) === operation) pending.delete(key);
            });
        },
    };
};
