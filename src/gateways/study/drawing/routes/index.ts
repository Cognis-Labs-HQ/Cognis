import type { IncomingMessage, ServerResponse } from "node:http";
import type { FlowApi, AccessRole } from "@cognis/core";
import type { RouteContext } from "../../../../api/reuse/route-context.js";
import { readJson } from "../../../../api/reuse/read-json.js";
import type { BootstrapLog } from "../../../shared.js";
import {
    validateDrawingCardId,
    validateDrawingCompletion,
    type DrawingProgressStore,
    type DrawingProgress,
    type DrawingCompletion,
} from "../progress.js";

export function createDrawingRoutes(
    service: DrawingProgressStore,
    auth: RouteContext,
    flow: FlowApi,
    log?: BootstrapLog,
    recordResult?: (
        actor: { accountId: string; role: AccessRole },
        cardId: string,
        input: DrawingCompletion,
    ) => Promise<void>,
    available: () => boolean = () => true,
): (req: IncomingMessage, res: ServerResponse, url: URL) => Promise<boolean> {
    return async (req, res, url) => {
        const match = /^\/api\/v1\/study\/drawing\/([^/]+)$/.exec(url.pathname);
        if (!match || !["GET", "POST"].includes(req.method ?? "")) return false;
        const claims = auth.requireAuth(req, res);
        if (!claims) return true;
        const send = (status: number, body: unknown) => {
            res.writeHead(status, { "content-type": "application/json" });
            res.end(JSON.stringify(body));
        };
        try {
            if (!available()) throw new Error("adapter_disabled");
            const cardId = decodeURIComponent(match[1]);
            const input =
                req.method === "POST"
                    ? await readJson(req, { maxBytes: 16 * 1024 })
                    : undefined;
            let result: DrawingProgress | undefined;
            await flow.run(
                req.method === "GET"
                    ? "study:drawing:readProgress"
                    : "study:drawing:complete",
                { accountId: claims.sub, cardId, input },
                {
                    handlers: {
                        authorize: () => {
                            if (claims.sub.startsWith("share:"))
                                throw new Error("forbidden");
                        },
                        validate: () => {
                            validateDrawingCardId(cardId);
                            if (req.method === "POST")
                                validateDrawingCompletion(input);
                        },
                        [req.method === "GET" ? "read" : "persist"]:
                            async () => {
                                if (req.method === "GET") {
                                    result = await service.get(
                                        claims.sub,
                                        cardId,
                                    );
                                    return;
                                }
                                validateDrawingCompletion(input);
                                await recordResult?.(
                                    {
                                        accountId: claims.sub,
                                        role: claims.role,
                                    },
                                    cardId,
                                    input,
                                );
                                result = await service.complete(
                                    claims.sub,
                                    cardId,
                                    input,
                                );
                                await log?.("info", "Drawing progress saved.", {
                                    component: "study-gateway",
                                    operation: "drawing_complete",
                                    accountId: claims.sub,
                                    cardId,
                                });
                            },
                    },
                },
            );
            send(200, { data: result });
        } catch (error) {
            const code =
                error instanceof Error
                    ? error.message
                    : "drawing_progress_failed";
            await log?.("error", "Drawing progress request failed.", {
                component: "study-gateway",
                operation: "drawing_progress",
                accountId: claims.sub,
                errorName: error instanceof Error ? error.name : "Unknown",
            });
            const invalid =
                error instanceof SyntaxError ||
                [
                    "invalid_drawing_card",
                    "invalid_drawing_completion",
                    "invalid_study_attempt",
                    "invalid_json",
                ].includes(code) ||
                error instanceof URIError;
            send(
                code === "request_body_too_large"
                    ? 413
                    : code === "adapter_disabled"
                      ? 503
                      : code === "forbidden"
                        ? 403
                        : invalid
                          ? 400
                          : 500,
                {
                    error:
                        code === "request_body_too_large"
                            ? code
                            : code === "adapter_disabled"
                              ? code
                              : code === "forbidden"
                                ? code
                                : invalid
                                  ? "invalid_drawing_progress"
                                  : "drawing_progress_failed",
                },
            );
        }
        return true;
    };
}
