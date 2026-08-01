import type { IncomingMessage, ServerResponse } from "node:http";
import { resolveRouteContext } from "../../../../../api/reuse/route-context.js";
import { readJson } from "../../../../../api/reuse/read-json.js";
import {
    canDirectMessageNowOrByApprovedRequest,
    canMessage,
    canSendMessageRequest,
    enrichMembersWithProfiles,
    hasAdminBypass,
    summarizeRoomRequest,
    type MessagesRoutesDeps,
} from "../shared.js";
import type { SocialMessagesProfile } from "../../profile-store-contract.js";

function isPendingRequestLookupSchemaError(error: unknown): boolean {
    const message = error instanceof Error ? error.message : String(error);
    return (
        /no such table:\s*chat_message_requests/i.test(message) ||
        /no such column:\s*(chat_message_requests\.)?(to_account_id|room_id|status|created_at)\b/i.test(
            message,
        ) ||
        /unknown column\s+'(to_account_id|room_id|status|created_at)'\s+in\s+'(?:where clause|order clause|field list)'/i.test(
            message,
        ) ||
        /column\s+"?(to_account_id|room_id|status|created_at)"?\s+does not exist/i.test(
            message,
        )
    );
}

export function createRoomListHandler(deps: MessagesRoutesDeps) {
    const { messagesStore, profileStore, dispatch } = deps;
    const ctx = resolveRouteContext(deps.routeContext);

    return async (
        req: IncomingMessage,
        res: ServerResponse,
        url: URL,
    ): Promise<boolean> => {
        if (url.pathname !== "/api/v1/social/messages/rooms") {
            return false;
        }

        const claims = ctx.requireAuth(req, res, "user");
        if (!claims) return true;
        const accountId = claims.sub;
        const hasBypass = hasAdminBypass(claims.role);

        if (req.method === "GET") {
            const rooms = await messagesStore.listRoomsForAccount(accountId);
            const enriched = await Promise.all(
                rooms.map(async (room) => {
                    const [members, lastList, unread] = await Promise.all([
                        messagesStore.listMembers(room.id),
                        messagesStore.listMessages(room.id, 1),
                        messagesStore.unreadCount(room.id, accountId),
                    ]);
                    const pendingIncoming = await messagesStore
                        .getPendingIncomingRoomMessageRequest(
                            room.id,
                            accountId,
                        )
                        .catch((error) => {
                            if (isPendingRequestLookupSchemaError(error)) {
                                return null;
                            }
                            throw error;
                        });
                    const last = lastList[0] ?? null;
                    const enrichedMembers = await enrichMembersWithProfiles(
                        members,
                        profileStore,
                    );
                    const currentMember = members.find(
                        (memberRow) => memberRow.accountId === accountId,
                    );
                    const isArchived = Boolean(currentMember?.archived);
                    const canSend =
                        !isArchived &&
                        !(room.kind === "dm" && members.length < 2);
                    return {
                        ...room,
                        members: enrichedMembers,
                        lastMessage: pendingIncoming ? null : last,
                        unread: pendingIncoming ? 0 : unread,
                        isArchived,
                        canSend,
                        pendingRequest: await summarizeRoomRequest(
                            pendingIncoming,
                            profileStore,
                            accountId,
                        ),
                    };
                }),
            );
            res.writeHead(200, { "content-type": "application/json" });
            res.end(JSON.stringify({ data: enriched }));
            return true;
        }

        if (req.method !== "POST") {
            return false;
        }

        const body = (await readJson(req)) as {
            handles?: unknown;
            title?: unknown;
            kind?: unknown;
        };
        const handles = Array.isArray(body.handles)
            ? body.handles.filter(
                  (handleValue): handleValue is string =>
                      typeof handleValue === "string",
              )
            : [];
        if (handles.length === 0) {
            res.writeHead(400, { "content-type": "application/json" });
            res.end(
                JSON.stringify({
                    error: {
                        code: "bad_request",
                        message: "handles required.",
                    },
                }),
            );
            return true;
        }

        const targets: SocialMessagesProfile[] = [];
        for (const handle of handles) {
            const candidate = await profileStore.getProfileByHandle(handle);
            if (!candidate || candidate.accountId === accountId) continue;
            const canDirectMessage = hasBypass
                ? true
                : await canMessage(
                      profileStore,
                      accountId,
                      candidate.accountId,
                  );
            const hasApprovedRequest =
                hasBypass ||
                (await messagesStore.hasApprovedMessageRequestBetween(
                    accountId,
                    candidate.accountId,
                ));
            const canRequestMessage = hasBypass
                ? true
                : await canSendMessageRequest(
                      profileStore,
                      accountId,
                      candidate.accountId,
                  );
            if (
                !canDirectMessage &&
                !hasApprovedRequest &&
                (!canRequestMessage || handles.length > 1)
            ) {
                res.writeHead(403, { "content-type": "application/json" });
                res.end(
                    JSON.stringify({
                        error: {
                            code: "forbidden",
                            message: `Cannot message ${handle}.`,
                        },
                    }),
                );
                return true;
            }
            targets.push(candidate);
        }

        if (targets.length === 0) {
            res.writeHead(400, { "content-type": "application/json" });
            res.end(
                JSON.stringify({
                    error: {
                        code: "bad_request",
                        message: "No valid recipients.",
                    },
                }),
            );
            return true;
        }

        const isDm = targets.length === 1 && body.kind !== "group";
        const primaryTarget = targets[0] ?? null;
        if (isDm && primaryTarget) {
            const existing = await messagesStore.findDmBetween(
                accountId,
                primaryTarget.accountId,
            );
            if (existing) {
                await Promise.all([
                    messagesStore.setArchived(existing.id, accountId, false),
                    messagesStore.setArchived(
                        existing.id,
                        primaryTarget.accountId,
                        false,
                    ),
                ]);
                res.writeHead(200, { "content-type": "application/json" });
                res.end(JSON.stringify({ data: existing }));
                return true;
            }

            const canDirectWithoutRequest =
                hasBypass ||
                (await canDirectMessageNowOrByApprovedRequest(
                    profileStore,
                    messagesStore,
                    accountId,
                    primaryTarget.accountId,
                ));
            if (!canDirectWithoutRequest) {
                const pending = await messagesStore.findPendingMessageRequest(
                    accountId,
                    primaryTarget.accountId,
                );
                const request =
                    pending ??
                    (await messagesStore.createMessageRequest({
                        fromAccountId: accountId,
                        toAccountId: primaryTarget.accountId,
                    }));
                if (dispatch && !pending) {
                    const sender = await profileStore.getProfile(accountId);
                    await dispatch({
                        category: "message-requests",
                        recipientUsername: primaryTarget.handle,
                        subject: "New message request",
                        body: "New message request",
                        senderName: sender?.handle ?? sender?.accountId,
                        actionUrl: "/messages",
                        metadata: {
                            requestId: request.id,
                        },
                    }).catch(() => undefined);
                }
                res.writeHead(202, { "content-type": "application/json" });
                res.end(
                    JSON.stringify({
                        data: {
                            requiresApproval: true,
                            requestId: request.id,
                            status: request.status,
                        },
                    }),
                );
                return true;
            }
        }

        const room =
            isDm && primaryTarget
                ? await messagesStore.createDm(
                      accountId,
                      primaryTarget.accountId,
                  )
                : await messagesStore.createRoom(
                      "group",
                      typeof body.title === "string" ? body.title : null,
                      accountId,
                  );
        const creatorProfile = await profileStore.getProfile(accountId);
        await messagesStore.addMemberWithEvent({
            roomId: room.id,
            actorId: accountId,
            accountId,
            role: "owner",
            handle: creatorProfile?.handle ?? null,
            displayName: creatorProfile?.displayName ?? null,
        });
        for (const target of targets) {
            await messagesStore.addMemberWithEvent({
                roomId: room.id,
                actorId: accountId,
                accountId: target.accountId,
                role: "member",
                handle: target.handle,
                displayName: target.displayName,
            });
        }
        await messagesStore.generateAndStoreRoomKey(room.id);
        if (isDm && primaryTarget) {
            await messagesStore.approvePendingRequestsBetween(
                accountId,
                primaryTarget.accountId,
                room.id,
            );
        }
        res.writeHead(201, { "content-type": "application/json" });
        res.end(JSON.stringify({ data: room }));
        return true;
    };
}
