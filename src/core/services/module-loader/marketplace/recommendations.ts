import { fetchMarketplaceResource } from "./request.js";
import type { ModuleMarketplaceLog } from "./index.js";

/** One shared feed per marketplace instance; retain known recommendations on transient failures. */
export function createRecommendationReader(
    log: ModuleMarketplaceLog,
    request = fetchMarketplaceResource,
    now = Date.now,
) {
    let current:
        | {
              url: string;
              values: string[];
              expiresAt: number;
              pending?: Promise<string[]>;
          }
        | undefined;
    return async (url: string, forceRefresh = false): Promise<string[]> => {
        if (current?.url !== url) current = { url, values: [], expiresAt: 0 };
        const record = current;
        if (record.pending) return [...(await record.pending)];
        if (!forceRefresh && record.expiresAt > now())
            return [...record.values];
        record.pending = (async () => {
            let status: number | undefined;
            try {
                const response = await request(url);
                status = response.status;
                if (!response.ok)
                    throw new Error("recommendations_unavailable");
                const value: unknown = await response.json();
                if (!Array.isArray(value))
                    throw new Error("invalid_recommendations");
                record.values = [
                    ...new Set(
                        value.filter(
                            (uuid): uuid is string =>
                                typeof uuid === "string" &&
                                /^[0-9a-f]{8}-[0-9a-f-]{27}$/i.test(uuid),
                        ),
                    ),
                ];
                record.expiresAt = now() + 5 * 60_000;
            } catch (error) {
                record.expiresAt = now() + 60_000;
                log(
                    "error",
                    "Module recommendations refresh failed; cached results retained.",
                    {
                        component: "module-marketplace",
                        operation: "readRecommendations",
                        status,
                        errorName:
                            error instanceof Error ? error.name : undefined,
                    },
                );
            }
            return record.values;
        })();
        try {
            return [...(await record.pending)];
        } finally {
            record.pending = undefined;
        }
    };
}
