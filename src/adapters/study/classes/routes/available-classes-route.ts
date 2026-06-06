import type { ServerResponse } from "node:http";
import { jsonError, jsonOk } from "../../../../api/reuse/json-responses.js";
import type { DbClassesStore } from "../store/index.js";
import {
    filterClassesBySearchQuery,
    type ClassesRouteOptions,
} from "./route-helpers.js";

export async function handleAvailableClassesRequest(
    store: DbClassesStore,
    options: ClassesRouteOptions,
    response: ServerResponse,
    input: {
        accountId: string;
        languageCode?: string;
        searchQuery: string;
        logMeta: Record<string, unknown>;
    },
): Promise<void> {
    try {
        const filteredClasses = filterClassesBySearchQuery(
            await store.getAvailableClasses(
                input.languageCode,
                input.accountId,
            ),
            input.searchQuery,
        );
        const languages = await store.listStudyLanguages(false);
        const languageNameByCode = new Map(
            languages.map((language) => [
                String(language.code ?? "")
                    .trim()
                    .toLowerCase(),
                String(language.name ?? "").trim(),
            ]),
        );
        jsonOk(
            response,
            filteredClasses.map((classRow) => ({
                ...classRow,
                languageName:
                    languageNameByCode.get(
                        String(classRow.languageCode ?? "").toLowerCase(),
                    ) ?? classRow.languageCode,
            })),
        );
    } catch (err) {
        options.log?.("error", "Failed to load available classes.", {
            ...input.logMeta,
            accountId: input.accountId,
            error: err instanceof Error ? err.message : String(err),
        });
        jsonError(response, 500, "internal_error", "Failed to load classes.");
    }
}
