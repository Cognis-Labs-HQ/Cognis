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
                            const errorCode =
                                typeof error === "object" &&
                                error !== null &&
                                "code" in error
                                    ? String(error.code)
                                    : "";
                            const message =
                                error instanceof Error
                                    ? error.message
                                    : String(error);
                            if (
                                errorCode === "SQLITE_ERROR" &&
                                /(no such table:\s*chat_message_requests|no such column:\s*(chat_message_requests\.)?(to_account_id|room_id))/i.test(
                                    message,
                                )
                            ) {
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
                let room = await messagesStore.findDmBetween(
                    accountId,
                    primaryTarget.accountId,
                );
                if (!room) {
                    room = await messagesStore.createRoom(
                        "dm",
                        null,
                        accountId,
                    );
                    await messagesStore.addMember(room.id, accountId, "owner");
                    await messagesStore.addMember(
                        room.id,
                        primaryTarget.accountId,
                        "member",
                    );
                    await messagesStore.generateAndStoreRoomKey(room.id);
                    const requesterProfile =
                        await profileStore.getProfile(accountId);
                    await messagesStore.appendRoomEvent({
                        roomId: room.id,
                        actorId: accountId,
                        eventType: "member_joined",
                        subjectAccountId: accountId,
                        subjectHandle: requesterProfile?.handle ?? null,
                        subjectDisplayName:
                            requesterProfile?.displayName ?? null,
                    });
                }
                const pending = await messagesStore.findPendingMessageRequest(
                    accountId,
                    primaryTarget.accountId,
                );
                if (pending && !pending.roomId) {
                    await messagesStore.updateMessageRequestStatus(
                        pending.id,
                        "cancelled",
                    );
                }
                const request =
                    pending && pending.roomId === room.id
                        ? pending
                        : await messagesStore.createMessageRequest({
                              fromAccountId: accountId,
                              toAccountId: primaryTarget.accountId,
                              roomId: room.id,
                          });
                if (dispatch) {
                    const sender = await profileStore.getProfile(accountId);
                    await dispatch({
                        category: "messages",
                        recipientUsername: primaryTarget.handle,
                        subject: "New message request",
                        body: "New message request",
                        senderName: sender?.handle ?? sender?.accountId,
                        actionUrl: `/messages/${room.id}`,
                        metadata: {
                            roomId: room.id,
                            requestId: request.id,
                        },
                    }).catch(() => undefined);
                }
                res.writeHead(202, { "content-type": "application/json" });
                res.end(
                    JSON.stringify({
                        data: {
                            id: room.id,
                            requiresApproval: true,
                            requestId: request.id,
                            status: request.status,
                        },
                    }),
                );
                return true;
            }
        }

        const room = await messagesStore.createRoom(
            isDm ? "dm" : "group",
            typeof body.title === "string" ? body.title : null,
            accountId,
        );
        await messagesStore.addMember(room.id, accountId, "owner");
        for (const target of targets) {
            await messagesStore.addMember(room.id, target.accountId, "member");
        }
        await messagesStore.generateAndStoreRoomKey(room.id);
        const creatorProfile = await profileStore.getProfile(accountId);
        await messagesStore.appendRoomEvent({
            roomId: room.id,
            actorId: accountId,
            eventType: "member_joined",
            subjectAccountId: accountId,
            subjectHandle: creatorProfile?.handle ?? null,
            subjectDisplayName: creatorProfile?.displayName ?? null,
        });
        for (const target of targets) {
            await messagesStore.appendRoomEvent({
                roomId: room.id,
                actorId: accountId,
                eventType: "member_joined",
                subjectAccountId: target.accountId,
                subjectHandle: target.handle,
                subjectDisplayName: target.displayName,
            });
        }
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
