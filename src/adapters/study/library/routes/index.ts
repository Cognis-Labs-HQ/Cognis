import type { IncomingMessage, ServerResponse } from "node:http";
import { readJson } from "../../../../api/reuse/read-json.js";
import {
    resolveRouteContext,
    type RouteContext,
} from "../../../../api/reuse/route-context.js";
import type { LibraryCapability, LibraryActor } from "../service.js";
import type { LibraryLocation } from "../types.js";

function sendJson(res: ServerResponse, status: number, body: unknown): void {
    res.writeHead(status, { "content-type": "application/json" });
    res.end(JSON.stringify(body));
}

function locationFrom(url: URL): LibraryLocation {
    const scope = url.searchParams.get("scope") ?? "global";
    if (scope !== "global" && scope !== "class" && scope !== "user")
        throw new Error("invalid_scope");
    return { scope, scopeId: url.searchParams.get("scopeId") ?? undefined };
}

export function createLibraryRoutes(
    library: LibraryCapability,
    routeContext?: RouteContext,
    log?: (
        level: string,
        message: string,
        meta?: Record<string, unknown>,
    ) => void | Promise<void>,
) {
    const ctx = resolveRouteContext(routeContext);
    return async (
        req: IncomingMessage,
        res: ServerResponse,
        url: URL,
    ): Promise<boolean> => {
        if (!url.pathname.startsWith("/api/v1/study/library")) return false;
        const claims = ctx.requireAuth(req, res);
        if (!claims) return true;
        const actor: LibraryActor = {
            accountId: claims.sub,
            role: claims.role,
        };
        try {
            if (
                url.pathname === "/api/v1/study/library/schemas" &&
                req.method === "GET"
            ) {
                sendJson(res, 200, { data: library.listSchemas() });
                return true;
            }
            if (
                url.pathname === "/api/v1/study/library/entries" &&
                req.method === "GET"
            ) {
                sendJson(res, 200, {
                    data: await library.list(actor, locationFrom(url), {
                        schemaId: url.searchParams.get("schemaId") ?? undefined,
                        layer: url.searchParams.get("layer") ?? undefined,
                    }),
                });
                return true;
            }
            const detailMatch = url.pathname.match(
                /^\/api\/v1\/study\/library\/entries\/([^/]+)$/,
            );
            if (detailMatch && req.method === "GET") {
                const entry = await library.read(
                    actor,
                    decodeURIComponent(detailMatch[1]),
                );
                sendJson(
                    res,
                    entry ? 200 : 404,
                    entry ? { data: entry } : { error: { code: "not_found" } },
                );
                return true;
            }
            if (
                url.pathname === "/api/v1/study/library/entries" &&
                req.method === "POST"
            ) {
                const body = (await readJson(req)) as {
                    location: LibraryLocation;
                    entry: Parameters<LibraryCapability["create"]>[2];
                };
                const entry = await library.create(
                    actor,
                    body.location,
                    body.entry,
                );
                await log?.("info", "Created library entry.", {
                    component: "study-library",
                    operation: "create",
                    accountId: actor.accountId,
                    entryId: entry.id,
                });
                sendJson(res, 201, { data: entry });
                return true;
            }
            const traceMatch = url.pathname.match(
                /^\/api\/v1\/study\/library\/entries\/([^/]+)\/trace$/,
            );
            if (traceMatch && req.method === "GET") {
                sendJson(res, 200, {
                    data: await library.trace(
                        actor,
                        decodeURIComponent(traceMatch[1]),
                    ),
                });
                return true;
            }
            if (
                url.pathname === "/api/v1/study/library/resolve" &&
                req.method === "POST"
            ) {
                const body = (await readJson(req)) as {
                    location: LibraryLocation;
                    entry: Parameters<LibraryCapability["resolve"]>[2];
                };
                const proposals = await library.resolve(
                    actor,
                    body.location,
                    body.entry,
                );
                await log?.("info", "Resolved library relationships.", {
                    component: "study-library",
                    operation: "resolve",
                    accountId: actor.accountId,
                });
                sendJson(res, 200, { data: proposals });
                return true;
            }
            if (
                url.pathname === "/api/v1/study/library/lookup" &&
                req.method === "POST"
            ) {
                const entry = (await readJson(req)) as Parameters<
                    LibraryCapability["lookup"]
                >[0];
                sendJson(res, 200, { data: await library.lookup(entry) });
                return true;
            }
            if (
                url.pathname === "/api/v1/study/library/push-requests" &&
                req.method === "POST"
            ) {
                const body = (await readJson(req)) as {
                    entryId: string;
                    destination: LibraryLocation;
                };
                const request = await library.requestPush(
                    actor,
                    body.entryId,
                    body.destination,
                );
                await log?.("info", "Submitted library push request.", {
                    component: "study-library",
                    operation: "request_push",
                    accountId: actor.accountId,
                    requestId: request.id,
                });
                sendJson(res, 201, { data: request });
                return true;
            }
            const reviewMatch = url.pathname.match(
                /^\/api\/v1\/study\/library\/push-requests\/([^/]+)$/,
            );
            if (reviewMatch && req.method === "PUT") {
                const body = (await readJson(req)) as {
                    decision: "approved" | "rejected";
                };
                if (
                    body.decision !== "approved" &&
                    body.decision !== "rejected"
                )
                    throw new Error("invalid_decision");
                const request = await library.reviewPush(
                    actor,
                    decodeURIComponent(reviewMatch[1]),
                    body.decision,
                );
                await log?.("info", "Reviewed library push request.", {
                    component: "study-library",
                    operation: "review_push",
                    accountId: actor.accountId,
                    requestId: request.id,
                    decision: body.decision,
                });
                sendJson(res, 200, { data: request });
                return true;
            }
            return false;
        } catch (error) {
            const code =
                error instanceof Error ? error.message : "request_failed";
            const status =
                code === "forbidden" ? 403 : code === "not_found" ? 404 : 400;
            await log?.("error", "Library request failed.", {
                component: "study-library",
                operation: req.method ?? "unknown",
                accountId: actor.accountId,
                code,
            });
            sendJson(res, status, {
                error: {
                    code,
                    message: "Library request could not be completed",
                },
            });
            return true;
        }
    };
}
