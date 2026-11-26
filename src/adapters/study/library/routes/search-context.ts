import { sendJson } from "../../../../api/reuse/http-response.js";
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
        res.setHeader("cache-control", "no-store");
        try {
            if (!["GET", "PUT"].includes(req.method ?? "")) return false;
            const reading = req.method === "GET";
            const data: Record<string, unknown> = {};
            await flow.run(
                reading
                    ? "study:library:readSearchContext"
                    : "study:library:searchContext",
                { accountId: claims.sub },
                {
                    data,
                    handlers: {
                        authorize: () => {
                            if (claims.sub.startsWith("share:"))
                                throw new Error("forbidden");
                        },
                        ...(reading
                            ? {
                                  resolve: async () => {
                                      data.result = await state.get(claims.sub);
                                  },
                              }
                            : {
                                  validate: async () => {
                                      data.input = await readJson(req, {
                                          maxBytes: 16 * 1024,
                                      });
                                  },
                                  persist: async () => {
                                      data.result = await state.set(
                                          claims.sub,
                                          data.input,
                                      );
                                  },
                              }),
                    },
                },
            );
            sendJson(res, 200, { data: data.result });
        } catch (error) {
            const code =
                error instanceof SyntaxError
                    ? "invalid_query"
                    : error instanceof Error
                      ? error.message
                      : "search_context_failed";
            await log?.("error", "Dictionary search context request failed.", {
                component: "study-library",
                operation: "dictionary-context",
                accountId: claims.sub,
                errorName: error instanceof Error ? error.name : "Unknown",
            });
            sendJson(
                res,
                code === "request_body_too_large"
                    ? 413
                    : code === "invalid_query"
                      ? 400
                      : code === "forbidden"
                        ? 403
                        : 500,
                {
                    error: {
                        code: [
                            "invalid_query",
                            "forbidden",
                            "request_body_too_large",
                        ].includes(code)
                            ? code
                            : "search_context_failed",
                    },
                },
            );
        }
        return true;
    };
}
