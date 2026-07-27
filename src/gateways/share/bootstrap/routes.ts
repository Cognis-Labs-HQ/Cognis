import { readFile } from "node:fs/promises";
import path from "node:path";
import type { IncomingMessage, ServerResponse } from "node:http";
import type { FlowApi } from "@cognis/core";
import { readJson } from "../../../api/reuse/read-json.js";
import {
    resolveShareGuestId,
    resolveShareGuestSessionId,
} from "../reuse/share-guest.js";
import {
    resolveRouteContext,
    type RouteContext,
} from "../../../api/reuse/route-context.js";
import type { CoreShareGateway } from "../gateway/index.js";

const SHARE_EMAIL_COOLDOWN_MS = 12 * 60 * 60 * 1000;
const shareEmailSentAt = new Map<string, number>();

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

function readSharePassword(req: IncomingMessage, url: URL): string | null {
    for (const headerName of [
        "x-cognis-share-password",
        "x-cognis-calendar-passphrase",
    ]) {
        const value = req.headers[headerName];
        const password = String(
            Array.isArray(value) ? value[0] : (value ?? ""),
        );
        if (password) return password;
    }
    const authorization = String(
        Array.isArray(req.headers.authorization)
            ? req.headers.authorization[0]
            : (req.headers.authorization ?? ""),
    );
    if (authorization.startsWith("Basic ")) {
        const decoded = Buffer.from(
            authorization.slice("Basic ".length),
            "base64",
        ).toString("utf8");
        const separator = decoded.indexOf(":");
        const password = separator >= 0 ? decoded.slice(separator + 1) : "";
        if (password) return password;
    }
    const queryPassword =
        url.searchParams.get("password") ??
        url.searchParams.get("passphrase") ??
        "";
    return queryPassword || null;
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

        if (req.method === "GET" && url.pathname === "/api/v1/share/methods") {
            const claims = routeContext.requireAuth(req, res, "user");
            if (!claims) return true;
            sendJson(res, 200, { data: input.gateway.listAdapters() });
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
                accessControls?: unknown;
                password?: unknown;
                generatePassword?: unknown;
                expiresAt?: unknown;
                shareMethod?: unknown;
                recipients?: unknown;
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
            const requestedAccessControls =
                body.accessControls && typeof body.accessControls === "object"
                    ? (body.accessControls as Record<string, unknown>)
                    : {};
            const legacyRecipients = Array.isArray(
                requestedAccessControls.recipients,
            )
                ? requestedAccessControls.recipients
                : [];
            const shareMethod = String(
                body.shareMethod ??
                    (legacyRecipients.length > 0 ? "user" : "link"),
            ).trim();
            const methodResult = await input.flow.run("prepare-share-method", {
                shareMethod,
                recipients: body.recipients ?? legacyRecipients,
                accessControls: requestedAccessControls,
            });
            const prepared = getFirstStageResult<{
                prepared?: boolean;
                reason?: string;
                accessControls?: Record<string, unknown>;
            }>(methodResult.stageResults, "prepare-method");
            if (!prepared?.prepared) {
                sendError(
                    res,
                    400,
                    "invalid_share_method",
                    prepared?.reason ?? "Share method input is invalid.",
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
                accessControls: prepared.accessControls ?? {},
                password:
                    typeof body.password === "string" ? body.password : null,
                generatePassword: body.generatePassword === true,
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

        const updateMatch = url.pathname.match(
            /^\/api\/v1\/share\/tokens\/([^/]+)$/,
        );
        if (req.method === "PATCH" && updateMatch) {
            const claims = routeContext.requireAuth(req, res, "user");
            if (!claims) return true;
            const shareId = decodeURIComponent(updateMatch[1]);
            const body = (await readJson(req)) as {
                label?: unknown;
                grantedCapabilities?: unknown;
                accessControls?: unknown;
                password?: unknown;
                generatePassword?: unknown;
                clearPassword?: unknown;
                expiresAt?: unknown;
            };
            const updated = await input.gateway.updateToken({
                shareId,
                ownerAccountId: claims.sub,
                label: typeof body.label === "string" ? body.label : undefined,
                grantedCapabilities: Array.isArray(body.grantedCapabilities)
                    ? body.grantedCapabilities
                    : undefined,
                accessControls:
                    body.accessControls &&
                    typeof body.accessControls === "object"
                        ? body.accessControls
                        : undefined,
                password:
                    typeof body.password === "string" ? body.password : null,
                generatePassword: body.generatePassword === true,
                clearPassword: body.clearPassword === true,
                expiresAt:
                    typeof body.expiresAt === "string"
                        ? body.expiresAt
                        : undefined,
            });
            if (!updated) {
                sendError(res, 404, "not_found", "Share token not found.");
                return true;
            }
            sendJson(res, 200, { data: updated });
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
            const flowResult = await input.flow.run("revoke-share-token", {
                claims,
                shareId,
                ownerAccountId: existingToken.ownerAccountId,
                resourceType: existingToken.resourceType,
                resourceId: existingToken.resourceId,
            });
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

        const emailMatch = url.pathname.match(
            /^\/api\/v1\/share\/tokens\/([^/]+)\/email$/,
        );
        if (req.method === "POST" && emailMatch) {
            const claims = routeContext.requireAuth(req, res, "user");
            if (!claims) return true;
            const shareId = decodeURIComponent(emailMatch[1]);
            const shareRecord = await input.gateway.getTokenById(shareId);
            if (!shareRecord || shareRecord.ownerAccountId !== claims.sub) {
                sendError(res, 404, "not_found", "Share token not found.");
                return true;
            }
            const body = (await readJson(req)) as { recipients?: unknown };
            const recipients = Array.from(
                new Set(
                    (Array.isArray(body.recipients) ? body.recipients : [])
                        .map((recipient) =>
                            String(recipient ?? "")
                                .trim()
                                .toLowerCase(),
                        )
                        .filter((recipient) =>
                            /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recipient),
                        ),
                ),
            ).slice(0, 20);
            if (recipients.length === 0) {
                sendError(res, 400, "bad_request", "Recipients are required.");
                return true;
            }
            const now = Date.now();
            const limitedRecipient = recipients.find((recipient) => {
                const sentAt =
                    shareEmailSentAt.get(`${claims.sub}:${recipient}`) ?? 0;
                return now - sentAt < SHARE_EMAIL_COOLDOWN_MS;
            });
            if (limitedRecipient) {
                sendError(
                    res,
                    429,
                    "rate_limited",
                    "A share email was recently sent to this recipient.",
                );
                return true;
            }
            const sendEmail =
                input.gateway.getCapability<
                    (emailInput: {
                        recipientEmail: string;
                        templateId: string;
                        variables: Record<string, string>;
                    }) => Promise<unknown>
                >("notify:sendEmail");
            if (!sendEmail) {
                sendError(
                    res,
                    503,
                    "unavailable",
                    "Share email is unavailable.",
                );
                return true;
            }
            const shareUrl = String(shareRecord.shareUrl ?? "");
            await Promise.all(
                recipients.map(async (recipient) => {
                    await sendEmail({
                        recipientEmail: recipient,
                        templateId: "share-link",
                        variables: {
                            url: shareUrl,
                            label: String(shareRecord.label ?? ""),
                        },
                    });
                    shareEmailSentAt.set(`${claims.sub}:${recipient}`, now);
                }),
            );
            input.log?.("info", "Share emails dispatched.", {
                component: "share-gateway",
                operation: "send_share_email",
                accountId: claims.sub,
                shareId,
                recipientCount: recipients.length,
            });
            sendJson(res, 200, { data: { sent: recipients.length } });
            return true;
        }

        const resolveMatch = url.pathname.match(
            /^\/api\/v1\/share\/resolve\/([^/]+)$/,
        );
        if ((req.method === "GET" || req.method === "POST") && resolveMatch) {
            const token = decodeURIComponent(resolveMatch[1]);
            const body =
                req.method === "POST"
                    ? ((await readJson(req)) as { password?: unknown })
                    : {};
            const transportPassword = readSharePassword(req, url);
            const requesterClaims = routeContext.getAuthClaims(req);
            // Share guests resolving another share link (e.g. following a
            // link while already viewing a shared resource) are not "real"
            // requesters for direct-access purposes — only pass through
            // claims that belong to a genuine account session.
            const directAccessClaims =
                requesterClaims &&
                !resolveShareGuestId({ sub: requesterClaims.sub })
                    ? requesterClaims
                    : null;
            const flowResult = await input.flow.run("resolve-share-token", {
                token,
                password:
                    typeof body.password === "string"
                        ? body.password
                        : transportPassword,
                requesterClaims: directAccessClaims,
            });
            const resolved = getFirstStageResult<{
                resolved?: boolean;
                reason?: string;
                resourceType?: string;
                resourceId?: string;
                payload?: Record<string, unknown>;
                directAccess?: boolean;
                grantedCapabilities?: string[];
                accessControls?: Record<string, unknown>;
                readonlyWatermark?: boolean;
                guestAccessToken?: string;
                guestProfile?: Record<string, unknown> | null;
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
                    directAccess: resolved.directAccess === true,
                    grantedCapabilities: resolved.grantedCapabilities ?? [],
                    accessControls: resolved.accessControls ?? {},
                    readonlyWatermark: resolved.readonlyWatermark === true,
                    guestAccessToken:
                        typeof resolved.guestAccessToken === "string"
                            ? resolved.guestAccessToken
                            : "",
                    guestProfile: resolved.guestProfile ?? null,
                    page: resolved.page ?? {},
                },
            });
            return true;
        }

        if (
            req.method === "GET" &&
            url.pathname === "/api/v1/share/recipients/users"
        ) {
            const claims = routeContext.requireAuth(req, res, "user");
            if (!claims) return true;
            const query = String(url.searchParams.get("q") ?? "").trim();
            const profileStore = input.gateway.getCapability<{
                searchProfiles?: (
                    query: string,
                    limit?: number,
                    options?: { includeHidden?: boolean },
                ) => Promise<
                    Array<{
                        accountId: string;
                        handle: string;
                        displayName?: string | null;
                        avatarKey?: string | null;
                    }>
                >;
            }>("social:profileStore");
            const profiles =
                query && typeof profileStore?.searchProfiles === "function"
                    ? await profileStore.searchProfiles(query, 10)
                    : [];
            sendJson(res, 200, {
                data: profiles
                    .filter((profile) => profile.accountId !== claims.sub)
                    .map((profile) => ({
                        type: "user",
                        id: profile.accountId,
                        handle: profile.handle,
                        label: profile.displayName ?? profile.handle,
                        avatarKey: profile.avatarKey ?? null,
                    })),
            });
            return true;
        }

        if (
            req.method === "GET" &&
            url.pathname === "/api/v1/share/guest-profile"
        ) {
            const claims = routeContext.requireAuth(req, res, "user");
            if (!claims) return true;
            const guestSessionId = resolveShareGuestSessionId(claims);
            if (!guestSessionId) {
                sendError(
                    res,
                    404,
                    "not_found",
                    "No guest profile is associated with this session.",
                );
                return true;
            }
            const guestProfile =
                await input.gateway.getGuestProfile(guestSessionId);
            if (!guestProfile) {
                sendError(res, 404, "not_found", "Guest profile not found.");
                return true;
            }
            sendJson(res, 200, {
                data: {
                    displayName: guestProfile.displayName,
                    avatarKey: guestProfile.avatarKey,
                },
            });
            return true;
        }

        if (
            req.method === "GET" &&
            url.pathname === "/api/v1/share/approvals/pending"
        ) {
            const claims = routeContext.requireAuth(req, res, "user");
            if (!claims) return true;
            const pending = await input.gateway.listPendingApprovalsForAccount(
                claims.sub,
            );
            sendJson(res, 200, {
                data: pending.map((request) => ({
                    id: request.id,
                    resourceType: request.resourceType,
                    resourceId: request.resourceId,
                    requesterDisplayName: request.requesterDisplayName,
                    createdAt: request.createdAt,
                    expiresAt: request.expiresAt,
                })),
            });
            return true;
        }

        const approvalRespondMatch = url.pathname.match(
            /^\/api\/v1\/share\/approvals\/([^/]+)\/respond$/,
        );
        if (req.method === "POST" && approvalRespondMatch) {
            const claims = routeContext.requireAuth(req, res, "user");
            if (!claims) return true;
            const approvalId = decodeURIComponent(approvalRespondMatch[1]);
            const body = (await readJson(req)) as { decision?: unknown };
            const decision = String(body.decision ?? "").trim();
            if (decision !== "approved" && decision !== "declined") {
                sendError(
                    res,
                    400,
                    "bad_request",
                    "decision must be 'approved' or 'declined'.",
                );
                return true;
            }
            const applied = await input.gateway.respondToApprovalRequest({
                approvalId,
                targetAccountId: claims.sub,
                decision,
            });
            if (!applied) {
                sendError(
                    res,
                    404,
                    "not_found",
                    "Approval request not found, already resolved, or expired.",
                );
                return true;
            }
            sendJson(res, 200, { data: { ok: true } });
            return true;
        }

        return false;
    };
}
