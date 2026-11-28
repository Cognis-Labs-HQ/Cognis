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
    return async (req: IncomingMessage, res: ServerResponse, url: URL) => {
        if (
            url.pathname !== "/api/v1/tutorials/completions" ||
            !["GET", "POST"].includes(req.method ?? "")
        )
            return false;
        const claims = context.requireAuth(req, res);
        if (!claims) return true;
        let ids: string[] = [];
        if (req.method === "POST") {
            const body = await readJson(req);
            if (
                Object.keys(body).some((key) => key !== "ids") ||
                !Array.isArray(body.ids) ||
                !body.ids.length ||
                body.ids.length > 100 ||
                body.ids.some(
                    (id) => typeof id !== "string" || !identifier.test(id),
                )
            ) {
                res.writeHead(400, { "content-type": "application/json" });
                res.end(
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
            res.writeHead(503, { "content-type": "application/json" });
            res.end(
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
            req.method === "GET"
                ? "tutorial:completion:list"
                : "tutorial:completion:record",
            { accountId: claims.sub, ids },
            {
                handlers: {
                    execute: async (stage) => {
                        stage.data.result =
                            req.method === "GET"
                                ? await store!.list(claims.sub)
                                : await store!.complete(claims.sub, ids);
                    },
                },
            },
        );
        res.writeHead(req.method === "GET" ? 200 : 204, {
            "content-type": "application/json",
            "cache-control": "private, no-store",
        });
        res.end(
            req.method === "GET"
                ? JSON.stringify({ data: result.data.result })
                : undefined,
        );
        return true;
    };
}
