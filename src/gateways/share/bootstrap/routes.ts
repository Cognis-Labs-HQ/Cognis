import { readFile } from "node:fs/promises";
import path from "node:path";
import type { IncomingMessage, ServerResponse } from "node:http";
import type { FlowApi } from "@cognis/core";
import { readJson } from "../../../api/reuse/read-json.js";
import {
    resolveRouteContext,
    type RouteContext,
} from "../../../api/reuse/route-context.js";
import type { CoreShareGateway } from "../gateway/index.js";

function sendJson(
    res: ServerResponse,
    statusCode: number,
    payload: Record<string, unknown>,
): void {
    res.writeHead(statusCode, { "content-type": "application/json" });
    res.end(JSON.stringify(payload));
}

function sendError(
    res: ServerResponse,
    statusCode: number,
    code: string,
    message: string,
): void {
    sendJson(res, statusCode, { error: { code, message } });
}

function readResourceFilter(url: URL): {
    resourceType?: string;
    resourceId?: string;
} {
    const resourceType = String(
        url.searchParams.get("resourceType") ?? "",
    ).trim();
    const resourceId = String(url.searchParams.get("resourceId") ?? "").trim();
    return {
        ...(resourceType ? { resourceType } : {}),
        ...(resourceId ? { resourceId } : {}),
    };
}

function getFirstStageResult<T>(
    stageResults: Record<string, unknown[]>,
    stageId: string,
): T | null {
    const results = stageResults[stageId] as T[] | undefined;
    return results?.[0] ?? null;
}

export function createShareRoutes(input: {
    gateway: CoreShareGateway;
    routeContext?: RouteContext;
    uiRoot: string;
    flow: FlowApi;
    log?: (
        level: string,
        message: string,
        meta?: Record<string, unknown>,
    ) => void;
}): (req: IncomingMessage, res: ServerResponse, url: URL) => Promise<boolean> {
    const routeContext = resolveRouteContext(input.routeContext);

    return async (req, res, url): Promise<boolean> => {
        if (
            req.method === "GET" &&
            (url.pathname === "/share" || url.pathname.startsWith("/share/"))
        ) {
            routeContext.setPageSecurityHeaders(res);
            const html = await readFile(
                path.join(input.uiRoot, "share.html"),
                "utf8",
            );
            res.writeHead(200, { "content-type": "text/html; charset=utf-8" });
            res.end(html);
            return true;
        }

        if (req.method === "GET" && url.pathname === "/api/v1/share/tokens") {
            const claims = routeContext.requireAuth(req, res, "user");
            if (!claims) return true;
            const filter = readResourceFilter(url);
            const data = await input.gateway.listTokens({
                ownerAccountId: claims.sub,
                ...filter,
            });
            sendJson(res, 200, { data });
            return true;
        }

        if (req.method === "POST" && url.pathname === "/api/v1/share/tokens") {
            const claims = routeContext.requireAuth(req, res, "user");
            if (!claims) return true;
            const body = (await readJson(req)) as {
                resourceType?: unknown;
                resourceId?: unknown;
                label?: unknown;
                grantedCapabilities?: unknown;
                expiresAt?: unknown;
            };
            const resourceType = String(body.resourceType ?? "").trim();
            const resourceId = String(body.resourceId ?? "").trim();
            if (!resourceType || !resourceId) {
                sendError(
                    res,
                    400,
                    "bad_request",
                    "resourceType and resourceId are required.",
                );
                return true;
            }
            const flowResult = await input.flow.run("mint-share-token", {
                claims,
                ownerAccountId: claims.sub,
                resourceType,
                resourceId,
                label: typeof body.label === "string" ? body.label : "",
                grantedCapabilities: Array.isArray(body.grantedCapabilities)
                    ? body.grantedCapabilities
                    : [],
                expiresAt:
                    typeof body.expiresAt === "string" ? body.expiresAt : "",
            });
            const issued = getFirstStageResult<{
                minted?: boolean;
                shareRecord?: unknown;
            }>(flowResult.stageResults, "issue-token");
            if (!issued?.minted) {
                sendError(
                    res,
                    403,
                    "forbidden",
                    "Share token could not be created.",
                );
                return true;
            }
            sendJson(res, 200, { data: issued.shareRecord ?? null });
            return true;
        }

        const deleteMatch = url.pathname.match(
            /^\/api\/v1\/share\/tokens\/([^/]+)$/,
        );
        if (req.method === "DELETE" && deleteMatch) {
            const claims = routeContext.requireAuth(req, res, "user");
            if (!claims) return true;
            const shareId = decodeURIComponent(deleteMatch[1]);
            const existingToken = await input.gateway.getTokenById(shareId);
            if (!existingToken) {
                sendError(res, 404, "not_found", "Share token not found.");
                return true;
            }
            const flowResult = await input.flow.run(
                "revoke-share-token",
                {
                    claims,
                    shareId,
                    ownerAccountId: existingToken.ownerAccountId,
                    resourceType: existingToken.resourceType,
                    resourceId: existingToken.resourceId,
                },
            );
            const deleted = getFirstStageResult<{ revoked?: boolean }>(
                flowResult.stageResults,
                "delete-token",
            );
            if (!deleted?.revoked) {
                sendError(
                    res,
                    403,
                    "forbidden",
                    "Share token could not be revoked.",
                );
                return true;
            }
            sendJson(res, 200, { data: { deleted: true } });
            return true;
        }

        const resolveMatch = url.pathname.match(
            /^\/api\/v1\/share\/resolve\/([^/]+)$/,
        );
        if (req.method === "GET" && resolveMatch) {
            const token = decodeURIComponent(resolveMatch[1]);
            const flowResult = await input.flow.run(
                "resolve-share-token",
                {
                    token,
                },
            );
            const resolved = getFirstStageResult<{
                resolved?: boolean;
                reason?: string;
                resourceType?: string;
                resourceId?: string;
                payload?: Record<string, unknown>;
                grantedCapabilities?: string[];
                page?: Record<string, unknown>;
            }>(flowResult.stageResults, "build-payload");
            if (!resolved?.resolved) {
                const reason = String(resolved?.reason ?? "invalid_token");
                sendError(
                    res,
                    reason === "invalid_token" ? 404 : 403,
                    reason,
                    reason === "invalid_token"
                        ? "Share token is invalid or expired."
                        : "Share token could not be resolved.",
                );
                return true;
            }
            sendJson(res, 200, {
                data: {
                    resourceType: resolved.resourceType,
                    resourceId: resolved.resourceId,
                    payload: resolved.payload ?? {},
                    grantedCapabilities: resolved.grantedCapabilities ?? [],
                    page: resolved.page ?? {},
                },
            });
            return true;
        }

        return false;
    };
}
