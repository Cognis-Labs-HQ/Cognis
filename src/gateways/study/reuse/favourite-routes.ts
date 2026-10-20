import { validateFavourite } from "./favourites.js";
import type { IncomingMessage, ServerResponse } from "node:http";
import type { FlowApi } from "@cognis/core";
import type { RouteContext } from "../../../api/reuse/route-context.js";
import { readJson } from "../../../api/reuse/read-json.js";
import type { BootstrapLog } from "../../shared.js";
import type { StudyFavourites, StudyFavourite } from "./favourites.js";

export function createFavouriteRoutes(
    service: StudyFavourites,
    auth: RouteContext,
    flow: FlowApi,
    log?: BootstrapLog,
): (req: IncomingMessage, res: ServerResponse, url: URL) => Promise<boolean> {
    return async (req, res, url) => {
        if (url.pathname !== "/api/v1/study/favourites") return false;
        const claims = auth.requireAuth(req, res);
        if (!claims) return true;
        const send = (status: number, data: unknown) => {
            res.writeHead(status, { "content-type": "application/json" });
            res.end(JSON.stringify(data));
        };
        try {
            if (req.method === "GET") {
                send(200, { data: await service.list(claims.sub) });
                return true;
            }
            if (req.method !== "PUT") return false;
            const input = await readJson(req, { maxBytes: 16 * 1024 });
            let result: StudyFavourite[] = [];
            await flow.run(
                "study:favourites:save",
                { accountId: claims.sub, input },
                {
                    handlers: {
                        authorize: () => {
                            if (claims.sub.startsWith("share:"))
                                throw new Error("forbidden");
                        },
                        validate: () => validateFavourite(input),
                        persist: async () => {
                            result = await service.set(claims.sub, input);
                        },
                    },
                },
            );
            send(200, { data: result });
        } catch (error) {
            const code =
                error instanceof Error ? error.message : "favourites_failed";
            await log?.("error", "Study favourites request failed.", {
                component: "study-gateway",
                operation: "favourites",
                accountId: claims.sub,
                errorName: error instanceof Error ? error.name : "Unknown",
            });
            send(
                code === "request_body_too_large"
                    ? 413
                    : code === "forbidden"
                      ? 403
                      : ["invalid_favourite", "favourite_limit"].includes(code)
                        ? 400
                        : 500,
                {
                    error:
                        code === "request_body_too_large" ||
                        code === "forbidden" ||
                        ["invalid_favourite", "favourite_limit"].includes(code)
                            ? code
                            : "favourites_failed",
                },
            );
        }
        return true;
    };
}
