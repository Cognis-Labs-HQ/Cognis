/**
 * Routes for the messages adapter. Exposes the chatroom + message API under
 * /api/v1/messages/*. All routes require authentication and (where
 * applicable) chatroom membership.
 *
 * The adapter does not own the social-graph predicates needed for messaging
 * eligibility — those live in the profile adapter and are consumed via the
 * `social:profileStore` capability. This keeps the messages adapter cleanly
 * decoupled from profile internals.
 */

import type { IncomingMessage, ServerResponse } from "node:http";
import { requireAuth } from "../../../gateways/auth/guard.js";
import { readJson } from "../../../api/reuse/read-json.js";
import type { DbMessagesStore, MemberRow } from "./store.js";
import type { DbProfileStore, AccountProfile } from "../profile/store.js";

interface DispatchEnvelope {
    category: string;
    recipientUsername: string;
    subject: string;
    body: string;
    senderName?: string;
    actionUrl?: string;
    metadata?: Record<string, unknown>;
}

type Dispatch = (e: DispatchEnvelope) => Promise<{ dispatched: string[] }>;

/**
 * Messaging eligibility predicate: A may DM B iff
 *   not blocked in either direction, both users are visible, AND
 *   both users follow each other.
 */
export async function canMessage(
    profileStore: DbProfileStore,
    fromId: string,
    toId: string,
): Promise<boolean> {
    if (fromId === toId) return false;
    const [aBlockedB, bBlockedA] = await Promise.all([
        profileStore.isBlocked(fromId, toId),
        profileStore.isBlocked(toId, fromId),
    ]);
    if (aBlockedB || bBlockedA) return false;
    const [requesterProfile, targetProfile] = await Promise.all([
        profileStore.getProfile(fromId),
        profileStore.getProfile(toId),
    ]);
    if (
        !requesterProfile ||
        !targetProfile ||
        requesterProfile.visibility === "hidden" ||
        targetProfile.visibility === "hidden"
    ) {
        return false;
    }
    const [aFollowsB, bFollowsA] = await Promise.all([
        profileStore.isFollowing(fromId, toId),
        profileStore.isFollowing(toId, fromId),
    ]);
    return aFollowsB && bFollowsA;
}

export async function canSendMessageRequest(
    profileStore: DbProfileStore,
    fromId: string,
    toId: string,
): Promise<boolean> {
    if (fromId === toId) return false;
    const [aBlockedB, bBlockedA] = await Promise.all([
        profileStore.isBlocked(fromId, toId),
        profileStore.isBlocked(toId, fromId),
    ]);
    if (aBlockedB || bBlockedA) return false;
    const [requesterProfile, targetProfile] = await Promise.all([
        profileStore.getProfile(fromId),
        profileStore.getProfile(toId),
    ]);
    if (
        !requesterProfile ||
        !targetProfile ||
        requesterProfile.visibility === "hidden" ||
        targetProfile.visibility === "hidden"
    ) {
        return false;
    }
    return true;
}

function publicProfileSummary(profile: AccountProfile) {
    return {
        accountId: profile.accountId,
        handle: profile.handle,
        displayName: profile.displayName ?? profile.handle,
        avatarKey: profile.avatarKey,
    };
}

export interface MessagesRoutesDeps {
    messagesStore: DbMessagesStore;
    profileStore: DbProfileStore;
    dispatch: Dispatch | null;
    isAdapterEnabled: () => boolean;
}

async function enrichMembersWithProfiles(
    members: MemberRow[],
    profileStore: DbProfileStore,
): Promise<
    Array<MemberRow & { handle: string | null; displayName: string | null }>
> {
    return Promise.all(
        members.map(async (memberRow) => {
            const profile = await profileStore.getProfile(memberRow.accountId);
            return {
                ...memberRow,
                handle: profile?.handle ?? null,
                displayName: profile?.displayName ?? null,
            };
        }),
    );
}

async function summarizeRoomRequest(
    request: Awaited<
        ReturnType<DbMessagesStore["getPendingRoomMessageRequest"]>
    >,
    profileStore: DbProfileStore,
    accountId: string,
): Promise<{
    id: string;
    roomId: string | null;
    status: string;
    direction: "incoming" | "outgoing";
    requester: ReturnType<typeof publicProfileSummary> | null;
    recipient: ReturnType<typeof publicProfileSummary> | null;
    canRespond: boolean;
} | null> {
    if (!request) return null;
    const [requester, recipient] = await Promise.all([
        profileStore.getProfile(request.fromAccountId),
        profileStore.getProfile(request.toAccountId),
    ]);
    return {
        id: request.id,
        roomId: request.roomId,
        status: request.status,
        direction: request.toAccountId === accountId ? "incoming" : "outgoing",
        requester: requester ? publicProfileSummary(requester) : null,
        recipient: recipient ? publicProfileSummary(recipient) : null,
        canRespond: request.toAccountId === accountId,
    };
}

export function createMessagesRoutes(deps: MessagesRoutesDeps) {
    const { messagesStore, profileStore, dispatch, isAdapterEnabled } = deps;

    return async (
        req: IncomingMessage,
        res: ServerResponse,
        url: URL,
    ): Promise<boolean> => {
        if (!url.pathname.startsWith("/api/v1/messages")) return false;
        if (!isAdapterEnabled()) return false;

        // Lightweight unauthenticated probe used by the UI to detect whether
        // the messages adapter is loaded (so the navbar entry and the message
        // icon on profiles can be conditionally rendered).
        if (url.pathname === "/api/v1/messages/ping" && req.method === "GET") {
            res.writeHead(200, { "content-type": "application/json" });
            res.end(JSON.stringify({ data: { ready: true } }));
            return true;
        }

        const claims = requireAuth(req, res, "user");
        if (!claims) return true;
        const accountId = claims.sub;

        // GET /messages/users/lookup?q=handle
        if (
            url.pathname === "/api/v1/messages/users/lookup" &&
            req.method === "GET"
        ) {
            const requesterProfile = await profileStore.getProfile(accountId);
            if (requesterProfile?.visibility === "hidden") {
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
            const candidates = await profileStore.searchProfiles(query, 10);
            const results: Array<
                ReturnType<typeof publicProfileSummary> & {
                    canDirectMessage: boolean;
                    requiresApproval: boolean;
                }
            > = [];
            for (const profile of candidates) {
                if (profile.accountId === accountId) continue;
                if (profile.visibility === "hidden") continue;
                const canDirectMessage = await canMessage(
                    profileStore,
                    accountId,
                    profile.accountId,
                );
                const canRequestMessage = await canSendMessageRequest(
                    profileStore,
                    accountId,
                    profile.accountId,
                );
                if (!canDirectMessage && !canRequestMessage) continue;
                results.push({
                    ...publicProfileSummary(profile),
                    canDirectMessage,
                    requiresApproval: !canDirectMessage,
                });
            }
            res.writeHead(200, { "content-type": "application/json" });
            res.end(JSON.stringify({ data: results }));
            return true;
        }

        // GET /messages/rooms
        if (url.pathname === "/api/v1/messages/rooms" && req.method === "GET") {
            const rooms = await messagesStore.listRoomsForAccount(accountId);
            const enriched = await Promise.all(
                rooms.map(async (room) => {
                    const [members, lastList, unread, pendingIncoming] =
                        await Promise.all([
                            messagesStore.listMembers(room.id),
                            messagesStore.listMessages(room.id, 1),
                            messagesStore.unreadCount(room.id, accountId),
                            messagesStore.getPendingIncomingRoomMessageRequest(
                                room.id,
                                accountId,
                            ),
                        ]);
                    const last = lastList[0] ?? null;
                    const enrichedMembers = await enrichMembersWithProfiles(
                        members,
                        profileStore,
                    );
                    return {
                        ...room,
                        members: enrichedMembers,
                        lastMessage: pendingIncoming ? null : last,
                        unread: pendingIncoming ? 0 : unread,
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

        // POST /messages/rooms — create DM or group
        if (
            url.pathname === "/api/v1/messages/rooms" &&
            req.method === "POST"
        ) {
            const body = (await readJson(req)) as {
                handles?: unknown;
                title?: unknown;
                kind?: unknown;
            };
            const handles = Array.isArray(body.handles)
                ? body.handles.filter((h): h is string => typeof h === "string")
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
            const targets: AccountProfile[] = [];
            for (const handle of handles) {
                const candidate = await profileStore.getProfileByHandle(handle);
                if (!candidate || candidate.accountId === accountId) continue;
                const canDirectMessage = await canMessage(
                    profileStore,
                    accountId,
                    candidate.accountId,
                );
                const canRequestMessage = await canSendMessageRequest(
                    profileStore,
                    accountId,
                    candidate.accountId,
                );
                if (
                    !canDirectMessage &&
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
            if (isDm) {
                const targetId = targets[0].accountId;
                const existing = await messagesStore.findDmBetween(
                    accountId,
                    targetId,
                );
                if (existing) {
                    res.writeHead(200, {
                        "content-type": "application/json",
                    });
                    res.end(JSON.stringify({ data: existing }));
                    return true;
                }
                const canDirectMessage = await canMessage(
                    profileStore,
                    accountId,
                    targetId,
                );
                if (!canDirectMessage) {
                    let room = await messagesStore.findDmBetween(
                        accountId,
                        targetId,
                    );
                    if (!room) {
                        room = await messagesStore.createRoom(
                            "dm",
                            null,
                            accountId,
                        );
                        await messagesStore.addMember(
                            room.id,
                            accountId,
                            "owner",
                        );
                        await messagesStore.addMember(
                            room.id,
                            targetId,
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
                    const pending =
                        await messagesStore.findPendingMessageRequest(
                            accountId,
                            targetId,
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
                                  toAccountId: targetId,
                                  roomId: room.id,
                              });
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
                await messagesStore.addMember(
                    room.id,
                    target.accountId,
                    "member",
                );
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
            if (isDm) {
                await messagesStore.approvePendingRequestsBetween(
                    accountId,
                    targets[0].accountId,
                    room.id,
                );
            }
            res.writeHead(201, { "content-type": "application/json" });
            res.end(JSON.stringify({ data: room }));
            return true;
        }

        // GET /messages/requests
        if (
            url.pathname === "/api/v1/messages/requests" &&
            req.method === "GET"
        ) {
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

        // POST /messages/requests/:id/(approve|reject)
        const requestMatch = url.pathname.match(
            /^\/api\/v1\/messages\/requests\/([^/]+)\/(approve|reject)$/,
        );
        if (requestMatch && req.method === "POST") {
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
                    const recipientProfile = await profileStore.getProfile(
                        request.toAccountId,
                    );
                    await messagesStore.appendRoomEvent({
                        roomId: request.roomId,
                        actorId: request.toAccountId,
                        eventType: "member_left",
                        subjectAccountId: request.toAccountId,
                        subjectHandle: recipientProfile?.handle ?? null,
                        subjectDisplayName:
                            recipientProfile?.displayName ?? null,
                    });
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
                (await messagesStore.createRoom(
                    "dm",
                    null,
                    request.fromAccountId,
                ));
            if (!existingRoom) {
                await messagesStore.addMember(
                    room.id,
                    request.fromAccountId,
                    "owner",
                );
                await messagesStore.addMember(
                    room.id,
                    request.toAccountId,
                    "member",
                );
                await messagesStore.generateAndStoreRoomKey(room.id);
            }
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
            const recipientProfile = await profileStore.getProfile(
                request.toAccountId,
            );
            await messagesStore.appendRoomEvent({
                roomId: room.id,
                actorId: request.toAccountId,
                eventType: "member_joined",
                subjectAccountId: request.toAccountId,
                subjectHandle: recipientProfile?.handle ?? null,
                subjectDisplayName: recipientProfile?.displayName ?? null,
            });
            res.writeHead(200, { "content-type": "application/json" });
            res.end(JSON.stringify({ data: room }));
            return true;
        }

        // Match per-room paths. Capture groups:
        //   1: roomId  2: sub-resource (messages|members|key|read|typing|reactions)
        //   3: sub-resource argument (e.g. messageId)  4: nested resource (e.g. reactions)
        const roomMatch = url.pathname.match(
            /^\/api\/v1\/messages\/rooms\/([^/]+)(?:\/([^/]+))?(?:\/([^/]+))?(?:\/([^/]+))?$/,
        );
        if (!roomMatch) return false;
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
                        code: "forbidden",
                        message: "Not a member of this room.",
                    },
                }),
            );
            return true;
        }
        const pendingIncomingRoomRequest =
            await messagesStore.getPendingIncomingRoomMessageRequest(
                roomId,
                accountId,
            );
        const pendingRoomRequest = pendingIncomingRoomRequest
            ? pendingIncomingRoomRequest
            : await messagesStore.getPendingRoomMessageRequest(roomId);
        const pendingRequestSummary = await summarizeRoomRequest(
            pendingRoomRequest,
            profileStore,
            accountId,
        );

        // GET /messages/rooms/:id
        if (!sub && req.method === "GET") {
            const members = await messagesStore.listMembers(roomId);
            const enrichedMembers = await enrichMembersWithProfiles(
                members,
                profileStore,
            );
            res.writeHead(200, { "content-type": "application/json" });
            res.end(
                JSON.stringify({
                    data: {
                        ...room,
                        members: enrichedMembers,
                        pendingRequest: pendingRequestSummary,
                    },
                }),
            );
            return true;
        }

        // PATCH /messages/rooms/:id — teacher/admin room metadata updates.
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

        // GET /messages/rooms/:id/key
        if (sub === "key" && !subArg && req.method === "GET") {
            if (pendingIncomingRoomRequest) {
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

        // GET/POST /messages/rooms/:id/messages
        if (sub === "messages" && !subArg) {
            if (req.method === "GET") {
                if (pendingIncomingRoomRequest) {
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
                            }>;
                        }
                    >
                >();
                const reactionRows =
                    await messagesStore.listMessageReactions(roomId);
                for (const reactionRow of reactionRows) {
                    let emojiMap = reactionsByMessage.get(
                        reactionRow.messageId,
                    );
                    if (!emojiMap) {
                        emojiMap = new Map();
                        reactionsByMessage.set(reactionRow.messageId, emojiMap);
                    }
                    let entry = emojiMap.get(reactionRow.emoji);
                    if (!entry) {
                        entry = {
                            emoji: reactionRow.emoji,
                            count: 0,
                            reactedByMe: false,
                            reactedBy: [],
                        };
                        emojiMap.set(reactionRow.emoji, entry);
                    }
                    entry.count += 1;
                    if (reactionRow.accountId === accountId)
                        entry.reactedByMe = true;
                    const reactorProfile = profilesByAccountId.get(
                        reactionRow.accountId,
                    );
                    entry.reactedBy.push({
                        accountId: reactionRow.accountId,
                        handle: reactorProfile?.handle ?? null,
                        displayName: reactorProfile?.displayName ?? null,
                    });
                }
                const enrichedMessages = messages.map((message) => {
                    const senderProfile = profilesByAccountId.get(
                        message.senderId,
                    );
                    // Pre-parse to Date once per message to avoid redundant
                    // construction inside the roomMembers filter.
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
                if (pendingIncomingRoomRequest) {
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
                const message = await messagesStore.appendMessage({
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
                await messagesStore.setTyping(roomId, accountId, false);
                // Notify other members (subject to per-member mute and category prefs).
                if (dispatch) {
                    const sender = await profileStore.getProfile(accountId);
                    const senderHandle = sender?.handle ?? accountId;
                    const members = await messagesStore.listMembers(roomId);
                    for (const otherMember of members) {
                        if (
                            otherMember.accountId === accountId ||
                            otherMember.muted
                        )
                            continue;
                        const recipient = await profileStore.getProfile(
                            otherMember.accountId,
                        );
                        if (!recipient) continue;
                        await dispatch({
                            category: "messages",
                            recipientUsername: recipient.handle,
                            subject: "New message",
                            body: "New message",
                            senderName: senderHandle,
                            actionUrl: `/messages/${roomId}`,
                            metadata: {
                                roomId,
                                messageId: message.id,
                            },
                        }).catch(() => undefined);
                    }
                }
                res.writeHead(201, { "content-type": "application/json" });
                res.end(JSON.stringify({ data: message }));
                return true;
            }
        }

        // POST /messages/rooms/:id/read
        if (sub === "read" && !subArg && req.method === "POST") {
            if (pendingIncomingRoomRequest) {
                res.writeHead(200, { "content-type": "application/json" });
                res.end(JSON.stringify({ data: { ok: true } }));
                return true;
            }
            await messagesStore.markRead(roomId, accountId);
            res.writeHead(200, { "content-type": "application/json" });
            res.end(JSON.stringify({ data: { ok: true } }));
            return true;
        }

        // GET/POST /messages/rooms/:id/typing
        if (sub === "typing" && !subArg) {
            if (req.method === "POST") {
                if (pendingIncomingRoomRequest) {
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
                if (pendingIncomingRoomRequest) {
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

        // POST /messages/rooms/:id/members  (add)
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
            const allowed = await canMessage(
                profileStore,
                accountId,
                target.accountId,
            );
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

        // DELETE /messages/rooms/:id/members/:handle
        if (sub === "members" && subArg && req.method === "DELETE") {
            const target = await profileStore.getProfileByHandle(subArg);
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
            const isOwnerKick = member.role === "owner";
            if (!isSelfLeave && !isOwnerKick) {
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
            res.writeHead(200, { "content-type": "application/json" });
            res.end(JSON.stringify({ data: { ok: true } }));
            return true;
        }

        // POST /messages/rooms/:id/messages/:messageId/reactions
        if (
            sub === "messages" &&
            subArg &&
            subArg2 === "reactions" &&
            req.method === "POST"
        ) {
            if (pendingIncomingRoomRequest) {
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
            const emoji =
                typeof body.emoji === "string" ? body.emoji.trim() : "";
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
            res.writeHead(200, { "content-type": "application/json" });
            res.end(JSON.stringify({ data: { active: !hasReaction } }));
            return true;
        }

        return false;
    };
}
