import type { IncomingMessage, ServerResponse } from "node:http";
import { resolveRouteContext } from "../../../../../api/reuse/route-context.js";
import {
    canSendMessageRequest,
    publicProfileSummary,
    type MessagesRoutesDeps,
} from "../shared.js";

export function createRequestsHandler(deps: MessagesRoutesDeps) {
    const { messagesStore, profileStore } = deps;
    const ctx = resolveRouteContext(deps.routeContext);

    return async (
        req: IncomingMessage,
        res: ServerResponse,
        url: URL,
    ): Promise<boolean> => {
        const isRequestsCollection =
            url.pathname === "/api/v1/social/messages/requests";
        const requestMatch = url.pathname.match(
            /^\/api\/v1\/social\/messages\/requests\/([^/]+)\/(approve|reject)$/,
        );
        if (!isRequestsCollection && !requestMatch) {
            return false;
        }

        const claims = ctx.requireAuth(req, res, "user");
        if (!claims) return true;
        const accountId = claims.sub;

        if (isRequestsCollection && req.method === "GET") {
            const incoming =
                await messagesStore.listIncomingMessageRequests(accountId);
            const enriched = await Promise.all(
                incoming.map(async (request) => {
                    const requester = await profileStore.getProfile(
                        request.fromAccountId,
                    );
                    return {
                        ...request,
                        requester: requester
                            ? publicProfileSummary(requester)
                            : null,
                    };
                }),
            );
            res.writeHead(200, { "content-type": "application/json" });
            res.end(JSON.stringify({ data: enriched }));
            return true;
        }

        if (!requestMatch || req.method !== "POST") {
            return false;
        }

        const requestId = decodeURIComponent(requestMatch[1]);
        const action = requestMatch[2];
        const request = await messagesStore.getMessageRequest(requestId);
        if (!request || request.toAccountId !== accountId) {
            res.writeHead(404, { "content-type": "application/json" });
            res.end(
                JSON.stringify({
                    error: {
                        code: "not_found",
                        message: "Message request not found.",
                    },
                }),
            );
            return true;
        }
        if (request.status !== "pending") {
            res.writeHead(409, { "content-type": "application/json" });
            res.end(
                JSON.stringify({
                    error: {
                        code: "invalid_state",
                        message: "Message request already handled.",
                    },
                }),
            );
            return true;
        }
        if (action === "reject") {
            await messagesStore.updateMessageRequestStatus(
                request.id,
                "rejected",
            );
            if (request.roomId) {
                for (const memberAccountId of [
                    request.toAccountId,
                    request.fromAccountId,
                ]) {
                    const profile =
                        await profileStore.getProfile(memberAccountId);
                    await messagesStore.removeMemberWithEvent({
                        roomId: request.roomId,
                        actorId: request.toAccountId,
                        accountId: memberAccountId,
                        handle: profile?.handle ?? null,
                        displayName: profile?.displayName ?? null,
                    });
                }
            }
            res.writeHead(200, { "content-type": "application/json" });
            res.end(JSON.stringify({ data: { status: "rejected" } }));
            return true;
        }

        const requestAllowed = await canSendMessageRequest(
            profileStore,
            request.fromAccountId,
            request.toAccountId,
        );
        if (!requestAllowed) {
            res.writeHead(403, { "content-type": "application/json" });
            res.end(
                JSON.stringify({
                    error: {
                        code: "forbidden",
                        message: "Cannot approve this request right now.",
                    },
                }),
            );
            return true;
        }
        const requestedRoom = request.roomId
            ? await messagesStore.getRoom(request.roomId)
            : null;
        const existingRoom =
            requestedRoom ??
            (await messagesStore.findDmBetween(
                request.fromAccountId,
                request.toAccountId,
            ));
        const room =
            existingRoom ??
            (await messagesStore.createRoom("dm", null, request.fromAccountId));
        if (!existingRoom) {
            await messagesStore.generateAndStoreRoomKey(room.id);
            const requesterProfile = await profileStore.getProfile(
                request.fromAccountId,
            );
            await messagesStore.addMemberWithEvent({
                roomId: room.id,
                actorId: request.fromAccountId,
                accountId: request.fromAccountId,
                role: "owner",
                handle: requesterProfile?.handle ?? null,
                displayName: requesterProfile?.displayName ?? null,
            });
        }
        const recipientProfile = await profileStore.getProfile(
            request.toAccountId,
        );
        await messagesStore.addMemberWithEvent({
            roomId: room.id,
            actorId: request.toAccountId,
            accountId: request.toAccountId,
            role: "member",
            handle: recipientProfile?.handle ?? null,
            displayName: recipientProfile?.displayName ?? null,
        });
        await Promise.all([
            messagesStore.setArchived(room.id, request.fromAccountId, false),
            messagesStore.setArchived(room.id, request.toAccountId, false),
        ]);
        await messagesStore.updateMessageRequestStatus(
            request.id,
            "approved",
            room.id,
        );
        await messagesStore.approvePendingRequestsBetween(
            request.fromAccountId,
            request.toAccountId,
            room.id,
        );
        res.writeHead(200, { "content-type": "application/json" });
        res.end(JSON.stringify({ data: room }));
        return true;
    };
}
