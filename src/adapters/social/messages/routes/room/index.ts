import type { IncomingMessage, ServerResponse } from "node:http";
import { resolveRouteContext } from "../../../../../api/reuse/route-context.js";
import { readJson } from "../../../../../api/reuse/read-json.js";
import {
    canMessage,
    enrichMembersWithProfiles,
    hasAdminBypass,
    normalizeReactionEmoji,
    summarizeRoomRequest,
    type MessagesRoutesDeps,
} from "../shared.js";

const MEMBER_MUTE_DURATION_HOURS = 24;

function hasModerationPrivileges(input: {
    roomKind: string;
    actorRole: string;
    actorAccountId: string;
    roomMembers: Array<{ accountId: string }>;
}): boolean {
    if (input.actorRole === "owner") return true;
    if (input.roomKind !== "dm") return false;
    const memberIds = new Set(
        input.roomMembers.map((roomMember) => roomMember.accountId),
    );
    return (
        input.roomMembers.length === 2 && memberIds.has(input.actorAccountId)
    );
}

async function resolveMemberProfileBySelector(
    selector: string,
    getProfileByHandle: (handle: string) => Promise<{
        accountId: string;
        handle: string;
        displayName: string | null;
    } | null>,
    getProfile: (accountId: string) => Promise<{
        accountId: string;
        handle: string;
        displayName: string | null;
    } | null>,
) {
    const normalizedSelector = String(selector ?? "").trim().replace(/^@/, "");
    if (!normalizedSelector) return null;
    return (
        (await getProfileByHandle(normalizedSelector)) ??
        (await getProfile(normalizedSelector))
    );
}

export function createRoomHandler(deps: MessagesRoutesDeps) {
    const { messagesStore, profileStore, dispatch, flow } = deps;
    const ctx = resolveRouteContext(deps.routeContext);

    return async (
        req: IncomingMessage,
        res: ServerResponse,
        url: URL,
    ): Promise<boolean> => {
        const roomMatch = url.pathname.match(
            /^\/api\/v1\/social\/messages\/rooms\/([^/]+)(?:\/([^/]+))?(?:\/([^/]+))?(?:\/([^/]+))?$/,
        );
        if (!roomMatch) return false;

        const claims = ctx.requireAuth(req, res, "user");
        if (!claims) return true;
        const accountId = claims.sub;
        const hasBypass = hasAdminBypass(claims.role);
        const roomId = roomMatch[1];
        const sub = roomMatch[2];
        const subArg = roomMatch[3];
        const subArg2 = roomMatch[4];

        const room = await messagesStore.getRoom(roomId);
        if (!room) {
            res.writeHead(404, { "content-type": "application/json" });
            res.end(
                JSON.stringify({
                    error: { code: "not_found", message: "Room not found." },
                }),
            );
            return true;
        }
        const member = await messagesStore.getMember(roomId, accountId);
        if (!member) {
            res.writeHead(403, { "content-type": "application/json" });
            res.end(
                JSON.stringify({
                    error: {
                        code: "not_member",
                        message: "Not a member of this room.",
                    },
                }),
            );
            return true;
        }
        const pendingIncomingRoomRequest = hasBypass
            ? null
            : await messagesStore.getPendingIncomingRoomMessageRequest(
                  roomId,
                  accountId,
              );
        const pendingRoomRequest = pendingIncomingRoomRequest
            ? pendingIncomingRoomRequest
            : await messagesStore.getPendingRoomMessageRequest(roomId);
        const incomingPendingRoomRequest =
            pendingIncomingRoomRequest ||
            (pendingRoomRequest?.toAccountId === accountId
                ? pendingRoomRequest
                : null);
        const pendingRequestSummary = await summarizeRoomRequest(
            pendingRoomRequest,
            profileStore,
            accountId,
        );

        if (!sub && req.method === "GET") {
            const members = await messagesStore.listMembers(roomId);
            const enrichedMembers = await enrichMembersWithProfiles(
                members,
                profileStore,
            );
            const classId =
                room.kind === "classroom"
                    ? await messagesStore.getClassroomIdForRoom(room.id)
                    : null;
            res.writeHead(200, { "content-type": "application/json" });
            res.end(
                JSON.stringify({
                    data: {
                        ...room,
                        classId,
                        members: enrichedMembers,
                        isArchived: member.archived,
                        canSend:
                            !member.archived &&
                            !(room.kind === "dm" && members.length < 2),
                        pendingRequest: pendingRequestSummary,
                    },
                }),
            );
            return true;
        }

        if (!sub && req.method === "PATCH") {
            const body = (await readJson(req)) as { avatarKey?: unknown };
            if (room.kind !== "classroom") {
                res.writeHead(400, { "content-type": "application/json" });
                res.end(
                    JSON.stringify({
                        error: {
                            code: "bad_request",
                            message:
                                "Only classroom rooms can set chat avatars.",
                        },
                    }),
                );
                return true;
            }
            if (claims.role !== "teacher" && claims.role !== "admin") {
                res.writeHead(403, { "content-type": "application/json" });
                res.end(
                    JSON.stringify({
                        error: {
                            code: "forbidden",
                            message:
                                "Teacher role required to set classroom chat avatar.",
                        },
                    }),
                );
                return true;
            }
            const avatarKey =
                typeof body.avatarKey === "string" && body.avatarKey.trim()
                    ? body.avatarKey.trim()
                    : null;
            const updated = await messagesStore.updateRoomAvatar(
                roomId,
                avatarKey,
            );
            res.writeHead(200, { "content-type": "application/json" });
            res.end(JSON.stringify({ data: updated }));
            return true;
        }

        if (sub === "key" && !subArg && req.method === "GET") {
            if (incomingPendingRoomRequest) {
                res.writeHead(403, { "content-type": "application/json" });
                res.end(
                    JSON.stringify({
                        error: {
                            code: "forbidden",
                            message:
                                "Approve the message request before reading messages.",
                        },
                    }),
                );
                return true;
            }
            const plaintextKeyHex =
                await messagesStore.getUnwrappedRoomKey(roomId);
            if (!plaintextKeyHex) {
                res.writeHead(500, { "content-type": "application/json" });
                res.end(
                    JSON.stringify({
                        error: {
                            code: "missing_key",
                            message: "Room key missing.",
                        },
                    }),
                );
                return true;
            }
            res.writeHead(200, { "content-type": "application/json" });
            res.end(JSON.stringify({ data: { key: plaintextKeyHex } }));
            return true;
        }

        if (sub === "messages" && !subArg) {
            if (req.method === "GET") {
                if (incomingPendingRoomRequest) {
                    res.writeHead(200, { "content-type": "application/json" });
                    res.end(
                        JSON.stringify({
                            data: [],
                            pendingRequest: pendingRequestSummary,
                        }),
                    );
                    return true;
                }
                const limit = Math.max(
                    1,
                    Math.min(100, Number(url.searchParams.get("limit") ?? 50)),
                );
                const before = url.searchParams.get("before") ?? undefined;
                const messages = await messagesStore.listMessages(
                    roomId,
                    limit,
                    before,
                );
                const roomMembers = await messagesStore.listMembers(roomId);
                const profilesByAccountId = new Map(
                    await Promise.all(
                        roomMembers.map((roomMember) =>
                            profileStore
                                .getProfile(roomMember.accountId)
                                .then(
                                    (profile) =>
                                        [
                                            roomMember.accountId,
                                            profile,
                                        ] as const,
                                ),
                        ),
                    ),
                );
                const reactionsByMessage = new Map<
                    string,
                    Map<
                        string,
                        {
                            emoji: string;
                            count: number;
                            reactedByMe: boolean;
                            reactedBy: Array<{
                                accountId: string;
                                handle: string | null;
                                displayName: string | null;
                                reactedAt: string;
                            }>;
                        }
                    >
                >();
                const reactionRows =
                    await messagesStore.listMessageReactions(roomId);
                for (const reactionRow of reactionRows) {
                    const normalizedEmoji = normalizeReactionEmoji(
                        reactionRow.emoji,
                    );
                    if (!normalizedEmoji) continue;
                    let emojiMap = reactionsByMessage.get(
                        reactionRow.messageId,
                    );
                    if (!emojiMap) {
                        emojiMap = new Map();
                        reactionsByMessage.set(reactionRow.messageId, emojiMap);
                    }
                    let entry = emojiMap.get(normalizedEmoji);
                    if (!entry) {
                        entry = {
                            emoji: normalizedEmoji,
                            count: 0,
                            reactedByMe: false,
                            reactedBy: [],
                        };
                        emojiMap.set(normalizedEmoji, entry);
                    }
                    entry.count += 1;
                    if (reactionRow.accountId === accountId) {
                        entry.reactedByMe = true;
                    }
                    const reactorProfile = profilesByAccountId.get(
                        reactionRow.accountId,
                    );
                    entry.reactedBy.push({
                        accountId: reactionRow.accountId,
                        handle: reactorProfile?.handle ?? null,
                        displayName: reactorProfile?.displayName ?? null,
                        reactedAt: reactionRow.createdAt,
                    });
                }
                const enrichedMessages = messages.map((message) => {
                    const senderProfile = profilesByAccountId.get(
                        message.senderId,
                    );
                    const messageCreatedDate = new Date(message.createdAt);
                    const readBy = roomMembers
                        .filter(
                            (roomMember) =>
                                roomMember.accountId !== message.senderId &&
                                Boolean(roomMember.lastReadAt) &&
                                new Date(roomMember.lastReadAt as string) >=
                                    messageCreatedDate,
                        )
                        .map((roomMember) => {
                            const readerProfile = profilesByAccountId.get(
                                roomMember.accountId,
                            );
                            return {
                                accountId: roomMember.accountId,
                                handle: readerProfile?.handle ?? null,
                                displayName: readerProfile?.displayName ?? null,
                                avatarKey: readerProfile?.avatarKey ?? null,
                                readAt: roomMember.lastReadAt,
                            };
                        });
                    const deliveredToCount = roomMembers.filter(
                        (roomMember) =>
                            roomMember.accountId !== message.senderId,
                    ).length;
                    return {
                        ...message,
                        senderHandle: senderProfile?.handle ?? null,
                        senderDisplayName: senderProfile?.displayName ?? null,
                        senderAvatarKey: senderProfile?.avatarKey ?? null,
                        deliveredToCount,
                        readBy,
                        reactions: Array.from(
                            reactionsByMessage.get(message.id)?.values() ?? [],
                        ),
                    };
                });
                res.writeHead(200, { "content-type": "application/json" });
                res.end(
                    JSON.stringify({
                        data: enrichedMessages,
                        pendingRequest: pendingRequestSummary,
                    }),
                );
                return true;
            }
            if (req.method === "POST") {
                if (incomingPendingRoomRequest) {
                    res.writeHead(403, { "content-type": "application/json" });
                    res.end(
                        JSON.stringify({
                            error: {
                                code: "forbidden",
                                message:
                                    "Approve the message request before replying.",
                            },
                        }),
                    );
                    return true;
                }
                const activeMembers = await messagesStore.listMembers(roomId);
                const dmIsArchivedForSender =
                    room.kind === "dm" &&
                    (member.archived || activeMembers.length < 2);
                if (dmIsArchivedForSender) {
                    res.writeHead(409, { "content-type": "application/json" });
                    res.end(
                        JSON.stringify({
                            error: {
                                code: "chat_archived",
                                message:
                                    "This conversation is archived. Start a new conversation to message again.",
                            },
                        }),
                    );
                    return true;
                }
                const mutedUntilTimestamp = member.mutedUntil
                    ? Date.parse(member.mutedUntil)
                    : Number.NaN;
                if (
                    Number.isFinite(mutedUntilTimestamp) &&
                    mutedUntilTimestamp > Date.now()
                ) {
                    res.writeHead(403, { "content-type": "application/json" });
                    res.end(
                        JSON.stringify({
                            error: {
                                code: "member_muted",
                                message:
                                    "You are muted in this conversation.",
                            },
                        }),
                    );
                    return true;
                }
                if (
                    Number.isFinite(mutedUntilTimestamp) &&
                    mutedUntilTimestamp <= Date.now()
                ) {
                    await messagesStore.setMemberMutedUntil(
                        roomId,
                        accountId,
                        null,
                    );
                }
                const body = (await readJson(req)) as {
                    ciphertext?: unknown;
                    iv?: unknown;
                    authTag?: unknown;
                    contentType?: unknown;
                };
                if (
                    typeof body.ciphertext !== "string" ||
                    typeof body.iv !== "string"
                ) {
                    res.writeHead(400, {
                        "content-type": "application/json",
                    });
                    res.end(
                        JSON.stringify({
                            error: {
                                code: "bad_request",
                                message: "ciphertext and iv required.",
                            },
                        }),
                    );
                    return true;
                }
                if (!flow?.exists("send-message")) {
                    res.writeHead(503, {
                        "content-type": "application/json",
                    });
                    res.end(
                        JSON.stringify({
                            error: {
                                code: "flow_unavailable",
                                message: "send-message flow not available",
                            },
                        }),
                    );
                    return true;
                }
                const flowResult = await flow.run("send-message", {
                    roomId,
                    senderId: accountId,
                    ciphertext: body.ciphertext,
                    iv: body.iv,
                    authTag:
                        typeof body.authTag === "string" ? body.authTag : "",
                    contentType:
                        typeof body.contentType === "string"
                            ? body.contentType
                            : "text/plain",
                });
                const persistResult = (flowResult.stageResults[
                    "persist-message"
                ] ?? [])[0] as
                    | {
                          messageId?: string;
                          persisted?: boolean;
                          message?: Record<string, unknown>;
                      }
                    | undefined;
                if (!persistResult?.persisted) {
                    res.writeHead(500, {
                        "content-type": "application/json",
                    });
                    res.end(
                        JSON.stringify({
                            error: {
                                code: "persist_failed",
                                message: "Failed to send message",
                            },
                        }),
                    );
                    return true;
                }
                res.writeHead(201, { "content-type": "application/json" });
                res.end(JSON.stringify({ data: persistResult.message }));
                return true;
            }
        }

        if (sub === "read" && !subArg && req.method === "POST") {
            if (incomingPendingRoomRequest) {
                res.writeHead(200, { "content-type": "application/json" });
                res.end(JSON.stringify({ data: { ok: true } }));
                return true;
            }
            await messagesStore.markRead(roomId, accountId);
            res.writeHead(200, { "content-type": "application/json" });
            res.end(JSON.stringify({ data: { ok: true } }));
            return true;
        }

        if (sub === "typing" && !subArg) {
            if (req.method === "POST") {
                if (incomingPendingRoomRequest) {
                    res.writeHead(200, { "content-type": "application/json" });
                    res.end(JSON.stringify({ data: { ok: true } }));
                    return true;
                }
                const body = (await readJson(req)) as {
                    typing?: unknown;
                    ttlSeconds?: unknown;
                };
                const ttlSeconds = Math.min(
                    30,
                    Math.max(1, Number(body.ttlSeconds) || 8),
                );
                await messagesStore.setTyping(
                    roomId,
                    accountId,
                    Boolean(body.typing),
                    ttlSeconds,
                );
                res.writeHead(200, { "content-type": "application/json" });
                res.end(JSON.stringify({ data: { ok: true } }));
                return true;
            }
            if (req.method === "GET") {
                if (incomingPendingRoomRequest) {
                    res.writeHead(200, { "content-type": "application/json" });
                    res.end(JSON.stringify({ data: [] }));
                    return true;
                }
                const typingRows = await messagesStore.listActiveTypers(roomId);
                const enriched = await Promise.all(
                    typingRows
                        .filter(
                            (typingRow) => typingRow.accountId !== accountId,
                        )
                        .map(async (typingRow) => {
                            const profile = await profileStore.getProfile(
                                typingRow.accountId,
                            );
                            return {
                                accountId: typingRow.accountId,
                                handle: profile?.handle ?? null,
                                displayName: profile?.displayName ?? null,
                                typingUntil: typingRow.typingUntil,
                            };
                        }),
                );
                res.writeHead(200, { "content-type": "application/json" });
                res.end(JSON.stringify({ data: enriched }));
                return true;
            }
        }

        if (sub === "members" && !subArg && req.method === "POST") {
            if (member.role !== "owner" && member.role !== "admin") {
                res.writeHead(403, { "content-type": "application/json" });
                res.end(
                    JSON.stringify({
                        error: {
                            code: "forbidden",
                            message: "Only owners/admins can add members.",
                        },
                    }),
                );
                return true;
            }
            const body = (await readJson(req)) as { handle?: unknown };
            const handle = typeof body.handle === "string" ? body.handle : null;
            if (!handle) {
                res.writeHead(400, { "content-type": "application/json" });
                res.end(
                    JSON.stringify({
                        error: {
                            code: "bad_request",
                            message: "handle required.",
                        },
                    }),
                );
                return true;
            }
            const target = await profileStore.getProfileByHandle(handle);
            if (!target) {
                res.writeHead(404, { "content-type": "application/json" });
                res.end(
                    JSON.stringify({
                        error: {
                            code: "not_found",
                            message: "User not found.",
                        },
                    }),
                );
                return true;
            }
            const allowed =
                hasBypass ||
                (await canMessage(profileStore, accountId, target.accountId));
            if (!allowed) {
                res.writeHead(403, { "content-type": "application/json" });
                res.end(
                    JSON.stringify({
                        error: {
                            code: "forbidden",
                            message: "Cannot add this user.",
                        },
                    }),
                );
                return true;
            }
            await messagesStore.addMember(roomId, target.accountId, "member");
            await messagesStore.appendRoomEvent({
                roomId,
                actorId: accountId,
                eventType: "member_joined",
                subjectAccountId: target.accountId,
                subjectHandle: target.handle,
                subjectDisplayName: target.displayName,
            });
            res.writeHead(200, { "content-type": "application/json" });
            res.end(JSON.stringify({ data: { ok: true } }));
            return true;
        }

        if (sub === "members" && subArg && req.method === "DELETE") {
            const target = await resolveMemberProfileBySelector(
                subArg,
                profileStore.getProfileByHandle.bind(profileStore),
                profileStore.getProfile.bind(profileStore),
            );
            if (!target) {
                res.writeHead(404, { "content-type": "application/json" });
                res.end(
                    JSON.stringify({
                        error: {
                            code: "not_found",
                            message: "User not found.",
                        },
                    }),
                );
                return true;
            }
            const isSelfLeave = target.accountId === accountId;
            const roomMembers = await messagesStore.listMembers(roomId);
            const canModerateOthers = hasModerationPrivileges({
                roomKind: room.kind,
                actorRole: member.role,
                actorAccountId: accountId,
                roomMembers,
            });
            if (!isSelfLeave && !canModerateOthers) {
                res.writeHead(403, { "content-type": "application/json" });
                res.end(
                    JSON.stringify({
                        error: {
                            code: "forbidden",
                            message: "Only owners can remove other members.",
                        },
                    }),
                );
                return true;
            }
            await messagesStore.appendRoomEvent({
                roomId,
                actorId: accountId,
                eventType: "member_left",
                subjectAccountId: target.accountId,
                subjectHandle: target.handle,
                subjectDisplayName: target.displayName,
            });
            await messagesStore.removeMember(roomId, target.accountId);
            const remainingMembers = await messagesStore.listMembers(roomId);
            if (isSelfLeave && remainingMembers.length === 1) {
                await messagesStore.setArchived(
                    roomId,
                    remainingMembers[0].accountId,
                    true,
                );
            }
            res.writeHead(200, { "content-type": "application/json" });
            res.end(JSON.stringify({ data: { ok: true } }));
            return true;
        }

        if (
            sub === "members" &&
            subArg &&
            subArg2 === "mute" &&
            req.method === "POST"
        ) {
            const target = await resolveMemberProfileBySelector(
                subArg,
                profileStore.getProfileByHandle.bind(profileStore),
                profileStore.getProfile.bind(profileStore),
            );
            if (!target) {
                res.writeHead(404, { "content-type": "application/json" });
                res.end(
                    JSON.stringify({
                        error: {
                            code: "not_found",
                            message: "User not found.",
                        },
                    }),
                );
                return true;
            }
            if (target.accountId === accountId) {
                res.writeHead(400, { "content-type": "application/json" });
                res.end(
                    JSON.stringify({
                        error: {
                            code: "bad_request",
                            message: "Cannot mute yourself.",
                        },
                    }),
                );
                return true;
            }
            const roomMembers = await messagesStore.listMembers(roomId);
            const canModerateOthers = hasModerationPrivileges({
                roomKind: room.kind,
                actorRole: member.role,
                actorAccountId: accountId,
                roomMembers,
            });
            if (!canModerateOthers) {
                res.writeHead(403, { "content-type": "application/json" });
                res.end(
                    JSON.stringify({
                        error: {
                            code: "forbidden",
                            message: "Only owners can mute members.",
                        },
                    }),
                );
                return true;
            }
            const targetIsMember = roomMembers.some(
                (roomMember) => roomMember.accountId === target.accountId,
            );
            if (!targetIsMember) {
                res.writeHead(404, { "content-type": "application/json" });
                res.end(
                    JSON.stringify({
                        error: {
                            code: "not_member",
                            message: "Target is not a room member.",
                        },
                    }),
                );
                return true;
            }
            const mutedUntil = new Date(
                Date.now() + MEMBER_MUTE_DURATION_HOURS * 60 * 60 * 1000,
            ).toISOString();
            await messagesStore.setMemberMutedUntil(
                roomId,
                target.accountId,
                mutedUntil,
            );
            res.writeHead(200, { "content-type": "application/json" });
            res.end(JSON.stringify({ data: { ok: true, mutedUntil } }));
            return true;
        }

        if (
            sub === "messages" &&
            subArg &&
            subArg2 === "reactions" &&
            req.method === "POST"
        ) {
            if (incomingPendingRoomRequest) {
                res.writeHead(403, { "content-type": "application/json" });
                res.end(
                    JSON.stringify({
                        error: {
                            code: "forbidden",
                            message:
                                "Approve the message request before reacting.",
                        },
                    }),
                );
                return true;
            }
            const message = await messagesStore.getMessage(subArg);
            if (!message || message.chatroomId !== roomId) {
                res.writeHead(404, { "content-type": "application/json" });
                res.end(
                    JSON.stringify({
                        error: {
                            code: "not_found",
                            message: "Message not found.",
                        },
                    }),
                );
                return true;
            }
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
                            message: "emoji required.",
                        },
                    }),
                );
                return true;
            }
            const hasReaction = await messagesStore.hasMessageReaction(
                roomId,
                subArg,
                accountId,
                emoji,
            );
            await messagesStore.setMessageReaction(
                roomId,
                subArg,
                accountId,
                emoji,
                !hasReaction,
            );
            if (dispatch && !hasReaction && message.senderId !== accountId) {
                const pendingIncomingForMessageSender =
                    await messagesStore.getPendingIncomingRoomMessageRequest(
                        roomId,
                        message.senderId,
                    );
                if (pendingIncomingForMessageSender) {
                    res.writeHead(200, { "content-type": "application/json" });
                    res.end(
                        JSON.stringify({
                            data: { active: !hasReaction },
                        }),
                    );
                    return true;
                }
                const [sender, recipient, recipientMember] = await Promise.all([
                    profileStore.getProfile(accountId),
                    profileStore.getProfile(message.senderId),
                    messagesStore.getMember(roomId, message.senderId),
                ]);
                if (recipient && recipientMember && !recipientMember.muted) {
                    await dispatch({
                        category: "messages",
                        recipientUsername: recipient.handle,
                        subject: "New reaction",
                        body: `Reacted with ${emoji}`,
                        senderName: sender?.handle ?? sender?.accountId,
                        actionUrl: `/messages/${roomId}`,
                        metadata: {
                            roomId,
                            messageId: subArg,
                            reaction: emoji,
                        },
                    }).catch(() => undefined);
                }
            }
            res.writeHead(200, { "content-type": "application/json" });
            res.end(JSON.stringify({ data: { active: !hasReaction } }));
            return true;
        }

        return false;
    };
}
