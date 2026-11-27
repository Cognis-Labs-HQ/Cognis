import type { IncomingMessage, ServerResponse } from "node:http";
import type { Ctx } from "@cognis/core";
import type { RouteContext } from "../reuse/route-context.js";
import { readJson } from "../reuse/read-json.js";
import {
    createTutorialCompletionStore,
    type TutorialDatabase,
} from "./store.js";

const identifier = /^[a-z][a-z0-9.-]{0,79}:[a-z][a-z0-9.-]{0,79}$/;

export function createTutorialCompletionRoutes(context: RouteContext) {
    let store: ReturnType<typeof createTutorialCompletionStore> | undefined;
    const ctx = context.getCapability<Ctx>("system:ctx");
    for (const id of [
        "tutorial:completion:list",
        "tutorial:completion:record",
    ]) {
        if (ctx && !ctx.hasFlow(id))
            ctx.registerFlow({ id, stages: ["validate", "execute", "after"] });
    }
    return async (
        request: IncomingMessage,
        response: ServerResponse,
        url: URL,
    ) => {
        if (
            url.pathname !== "/api/v1/tutorials/completions" ||
            !["GET", "POST"].includes(request.method ?? "")
        )
            return false;
        const claims = context.requireAuth(request, response);
        if (!claims) return true;
        let ids: string[] = [];
        if (request.method === "POST") {
            const body = await readJson(request);
            if (
                Object.keys(body).some((key) => key !== "ids") ||
                !Array.isArray(body.ids) ||
                !body.ids.length ||
                body.ids.length > 100 ||
                body.ids.some(
                    (id) => typeof id !== "string" || !identifier.test(id),
                )
            ) {
                response.writeHead(400, { "content-type": "application/json" });
                response.end(
                    JSON.stringify({
                        error: {
                            code: "invalid_tutorial_completion",
                            message:
                                "Select valid tutorials to record completion.",
                        },
                    }),
                );
                return true;
            }
            ids = body.ids;
        }
        const database = context.getCapability<TutorialDatabase>("db:executor");
        if (!ctx || !database) {
            response.writeHead(503, { "content-type": "application/json" });
            response.end(
                JSON.stringify({
                    error: {
                        code: "tutorial_completion_unavailable",
                        message:
                            "Tutorial completion is temporarily unavailable.",
                    },
                }),
            );
            return true;
        }
        store ??= createTutorialCompletionStore(database);
        const result = await ctx.runFlow(
            request.method === "GET"
                ? "tutorial:completion:list"
                : "tutorial:completion:record",
            { accountId: claims.sub, ids },
            {
                handlers: {
                    execute: async (stage) => {
                        stage.data.result =
                            request.method === "GET"
                                ? await store!.list(claims.sub)
                                : await store!.complete(claims.sub, ids);
                    },
                },
            },
        );
        response.writeHead(request.method === "GET" ? 200 : 204, {
            "content-type": "application/json",
            "cache-control": "private, no-store",
        });
        response.end(
            request.method === "GET"
                ? JSON.stringify({ data: result.data.result })
                : undefined,
        );
        return true;
    };
}
