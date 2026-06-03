import type { IncomingMessage, ServerResponse } from "node:http";
import { resolveRouteContext } from "../../../../api/reuse/route-context.js";
import { readJson } from "../../../../api/reuse/read-json.js";
import { createRequestsHandler } from "./requests-routes.js";
import { createRoomHandler } from "./room-routes.js";
import { createRoomListHandler } from "./rooms-routes.js";
import {
    canMessage,
    canSendMessageRequest,
    hasAdminBypass,
    normalizeReactionEmoji,
    publicProfileSummary,
    type Dispatch,
    type DispatchEnvelope,
    type MessagesRoutesDeps,
} from "./shared.js";

export type {
    Dispatch,
    DispatchEnvelope,
    EnrichedMemberRow,
    MessagesRoutesDeps,
    PublicProfileSummary,
    RoomRequestSummary,
} from "./shared.js";
export {
    canDirectMessageNowOrByApprovedRequest,
    canMessage,
    canSendMessageRequest,
    enrichMembersWithProfiles,
    hasAdminBypass,
    normalizeReactionEmoji,
    publicProfileSummary,
    summarizeRoomRequest,
} from "./shared.js";

export function createMessagesRoutes(deps: MessagesRoutesDeps) {
    const { messagesStore, profileStore, isAdapterEnabled } = deps;
    const ctx = resolveRouteContext(deps.routeContext);
    const roomListHandler = createRoomListHandler(deps);
    const requestsHandler = createRequestsHandler(deps);
    const roomHandler = createRoomHandler(deps);

    return async (
        req: IncomingMessage,
        res: ServerResponse,
        url: URL,
    ): Promise<boolean> => {
        if (!url.pathname.startsWith("/api/v1/messages")) return false;
        if (!isAdapterEnabled()) return false;

        if (url.pathname === "/api/v1/messages/ping" && req.method === "GET") {
            res.writeHead(200, { "content-type": "application/json" });
            res.end(JSON.stringify({ data: { ready: true } }));
            return true;
        }

        if (
            url.pathname === "/api/v1/messages/users/lookup" &&
            req.method === "GET"
        ) {
            const claims = ctx.requireAuth(req, res, "user");
            if (!claims) return true;
            const accountId = claims.sub;
            const hasBypass = hasAdminBypass(claims.role);
            const requesterProfile = await profileStore.getProfile(accountId);
            if (!hasBypass && requesterProfile?.visibility === "hidden") {
                res.writeHead(403, { "content-type": "application/json" });
                res.end(
                    JSON.stringify({
                        error: {
                            code: "forbidden",
                            message:
                                "Hidden users cannot send messages to others",
                        },
                    }),
                );
                return true;
            }
            const rawQuery = (url.searchParams.get("q") ?? "").trim();
            const query = rawQuery.replace(/^@/, "").toLowerCase();
            if (!query) {
                res.writeHead(200, { "content-type": "application/json" });
                res.end(JSON.stringify({ data: [] }));
                return true;
            }
            const candidates = await profileStore.searchProfiles(query, 10, {
                includeHidden: hasBypass,
            });
            const results: Array<
                ReturnType<typeof publicProfileSummary> & {
                    canDirectMessage: boolean;
                    requiresApproval: boolean;
                }
            > = [];
            for (const profile of candidates) {
                if (profile.accountId === accountId) continue;
                if (!hasBypass && profile.visibility === "hidden") continue;
                const canDirectMessage = hasBypass
                    ? true
                    : await canMessage(
                          profileStore,
                          accountId,
                          profile.accountId,
                      );
                const hasApprovedRequest =
                    hasBypass ||
                    (await messagesStore.hasApprovedMessageRequestBetween(
                        accountId,
                        profile.accountId,
                    ));
                const canOpenDirect = canDirectMessage || hasApprovedRequest;
                const canRequestMessage = hasBypass
                    ? true
                    : await canSendMessageRequest(
                          profileStore,
                          accountId,
                          profile.accountId,
                      );
                if (!canOpenDirect && !canRequestMessage) continue;
                results.push({
                    ...publicProfileSummary(profile),
                    canDirectMessage: canOpenDirect,
                    requiresApproval: !canOpenDirect,
                });
            }
            res.writeHead(200, { "content-type": "application/json" });
            res.end(JSON.stringify({ data: results }));
            return true;
        }

        if (
            url.pathname === "/api/v1/messages/emoji-usage" &&
            req.method === "GET"
        ) {
            const claims = ctx.requireAuth(req, res, "user");
            if (!claims) return true;
            const topEmojis = await messagesStore.getTopEmojiUsage(
                claims.sub,
                20,
            );
            res.writeHead(200, { "content-type": "application/json" });
            res.end(JSON.stringify({ data: topEmojis }));
            return true;
        }

        if (
            url.pathname === "/api/v1/messages/emoji-usage" &&
            req.method === "POST"
        ) {
            const claims = ctx.requireAuth(req, res, "user");
            if (!claims) return true;
            const body = (await readJson(req)) as { emoji?: unknown };
            const emoji = normalizeReactionEmoji(
                typeof body.emoji === "string" ? body.emoji : "",
            );
            if (!emoji || emoji.length > 16) {
                res.writeHead(400, { "content-type": "application/json" });
                res.end(
                    JSON.stringify({
                        error: {
                            code: "bad_request",
                            message:
                                "Invalid emoji: must be provided and no longer than 16 characters.",
                        },
                    }),
                );
                return true;
            }
            await messagesStore.incrementEmojiUsage(claims.sub, emoji);
            res.writeHead(200, { "content-type": "application/json" });
            res.end(JSON.stringify({ data: { ok: true } }));
            return true;
        }

        if (await roomListHandler(req, res, url)) return true;
        if (await requestsHandler(req, res, url)) return true;
        if (await roomHandler(req, res, url)) return true;
        return false;
    };
}
