import type { IncomingMessage, ServerResponse } from "node:http";
import type { FlowApi } from "@cognis/core";
import type { RouteContext } from "../../../../api/reuse/route-context.js";
import { readJson } from "../../../../api/reuse/read-json.js";
import type { DictionarySearchState } from "../service/search-context.js";

export function createDictionarySearchContextRoutes(
    state: DictionarySearchState,
    auth: RouteContext,
    flow: FlowApi,
    log?: (
        level: string,
        message: string,
        meta?: Record<string, unknown>,
    ) => void | Promise<void>,
) {
    return async (
        req: IncomingMessage,
        res: ServerResponse,
        url: URL,
    ): Promise<boolean> => {
        if (url.pathname !== "/api/v1/study/library/dictionary/context")
            return false;
        const claims = auth.requireAuth(req, res);
        if (!claims) return true;
        const send = (status: number, data: unknown) => {
            res.writeHead(status, {
                "content-type": "application/json",
                "cache-control": "no-store",
            });
            res.end(JSON.stringify(data));
        };
        try {
            if (req.method === "GET") {
                send(200, { data: await state.get(claims.sub) });
                return true;
            }
            if (req.method !== "PUT") return false;
            const input = await readJson(req);
            let data;
            await flow.run(
                "study:library:search-context",
                { accountId: claims.sub },
                {
                    handlers: {
                        authorize: () => {
                            if (claims.sub.startsWith("share:"))
                                throw new Error("forbidden");
                        },
                        persist: async () => {
                            data = await state.set(claims.sub, input);
                        },
                    },
                },
            );
            send(200, { data });
        } catch (error) {
            const code =
                error instanceof Error
                    ? error.message
                    : "search_context_failed";
            await log?.("error", "Dictionary search context request failed.", {
                component: "study-library",
                operation: "dictionary-context",
                accountId: claims.sub,
                errorName: error instanceof Error ? error.name : "Unknown",
            });
            send(
                code === "invalid_query"
                    ? 400
                    : code === "forbidden"
                      ? 403
                      : 500,
                {
                    error: {
                        code:
                            code === "invalid_query" || code === "forbidden"
                                ? code
                                : "search_context_failed",
                    },
                },
            );
        }
        return true;
    };
}
