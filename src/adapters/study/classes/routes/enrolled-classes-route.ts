import type { ServerResponse } from "node:http";
import { jsonError, jsonOk } from "../../../../api/reuse/json-responses.js";
import type { DbClassesStore } from "../store/index.js";
import type { ClassesRouteOptions } from "./route-helpers.js";

export async function handleEnrolledClassesRequest(
    store: DbClassesStore,
    options: ClassesRouteOptions,
    response: ServerResponse,
    input: { accountId: string; logMeta: Record<string, unknown> },
): Promise<void> {
    try {
        jsonOk(response, await store.getEnrolledClasses(input.accountId));
    } catch (err) {
        options.log?.("error", "Failed to load enrolled classes.", {
            ...input.logMeta,
            accountId: input.accountId,
            error: err instanceof Error ? err.message : String(err),
        });
        jsonError(response, 500, "internal_error", "Failed to load classes.");
    }
}
