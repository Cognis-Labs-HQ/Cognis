import type { IncomingMessage, ServerResponse } from "node:http";
import { resolveRouteContext } from "../../../../api/reuse/route-context.js";
import { readJson } from "../../../../api/reuse/read-json.js";
import { createRequestsHandler } from "./requests/index.js";
import { createRoomHandler } from "./room/index.js";
import { createRoomListHandler } from "./rooms/index.js";
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
import { createChatroomMembershipCapability } from "../membership.js";

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

export function createMessagesRoutes(dependencies: MessagesRoutesDeps) {
    const { messagesStore, profileStore, isAdapterEnabled } = dependencies;
    const routeDependencies = {
        ...dependencies,
        membership:
            dependencies.membership ??
            createChatroomMembershipCapability(messagesStore, profileStore),
    };
    const ctx = resolveRouteContext(dependencies.routeContext);
    const roomListHandler = createRoomListHandler(routeDependencies);
    const requestsHandler = createRequestsHandler(routeDependencies);
    const roomHandler = createRoomHandler(routeDependencies);

    return async (
        request: IncomingMessage,
        response: ServerResponse,
        url: URL,
    ): Promise<boolean> => {
        if (!url.pathname.startsWith("/api/v1/social/messages")) return false;
        if (!isAdapterEnabled()) return false;

        if (
            url.pathname === "/api/v1/social/messages/ping" &&
            request.method === "GET"
        ) {
            response.writeHead(200, { "content-type": "application/json" });
            response.end(JSON.stringify({ data: { ready: true } }));
            return true;
        }

        if (
            url.pathname === "/api/v1/social/messages/users/lookup" &&
            request.method === "GET"
        ) {
            const claims = ctx.requireAuth(request, response, "user");
            if (!claims) return true;
            const accountId = claims.sub;
            const hasBypass = hasAdminBypass(claims.role);
            const requesterProfile = await profileStore.getProfile(accountId);
            if (!hasBypass && requesterProfile?.visibility === "hidden") {
                response.writeHead(403, { "content-type": "application/json" });
                response.end(
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
                response.writeHead(200, { "content-type": "application/json" });
                response.end(JSON.stringify({ data: [] }));
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
            response.writeHead(200, { "content-type": "application/json" });
            response.end(JSON.stringify({ data: results }));
            return true;
        }

        if (
            url.pathname === "/api/v1/social/messages/emoji-usage" &&
            request.method === "GET"
        ) {
            const claims = ctx.requireAuth(request, response, "user");
            if (!claims) return true;
            const topEmojis = await messagesStore.getTopEmojiUsage(
                claims.sub,
                20,
            );
            response.writeHead(200, { "content-type": "application/json" });
            response.end(JSON.stringify({ data: topEmojis }));
            return true;
        }

        if (
            url.pathname === "/api/v1/social/messages/emoji-usage" &&
            request.method === "POST"
        ) {
            const claims = ctx.requireAuth(request, response, "user");
            if (!claims) return true;
            const body = (await readJson(request)) as { emoji?: unknown };
            const emoji = normalizeReactionEmoji(
                typeof body.emoji === "string" ? body.emoji : "",
            );
            if (!emoji || emoji.length > 16) {
                response.writeHead(400, { "content-type": "application/json" });
                response.end(
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
            response.writeHead(200, { "content-type": "application/json" });
            response.end(JSON.stringify({ data: { ok: true } }));
            return true;
        }

        if (await roomListHandler(request, response, url)) return true;
        if (await requestsHandler(request, response, url)) return true;
        if (await roomHandler(request, response, url)) return true;
        return false;
    };
}
