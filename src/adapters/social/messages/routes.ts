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
import { requireAuth } from "../../../api/auth/guard.js";
import { readJson } from "../../../api/reuse/read-json.js";
import type { DbMessagesStore, MemberRow } from "./store.js";
import type {
    DbProfileStore,
    AccountProfile,
} from "../../db/reuse/profile-store.js";

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
 *   not blocked in either direction, AND
 *   B has community visibility or B already follows A.
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
    if (targetProfile.visibility === "community") return true;
    return profileStore.isFollowing(toId, fromId);
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
            const results: ReturnType<typeof publicProfileSummary>[] = [];
            for (const profile of candidates) {
                if (profile.accountId === accountId) continue;
                if (profile.visibility === "hidden") continue;
                const allowed = await canMessage(
                    profileStore,
                    accountId,
                    profile.accountId,
                );
                if (allowed) results.push(publicProfileSummary(profile));
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
                    const [members, lastList, unread] = await Promise.all([
                        messagesStore.listMembers(room.id),
                        messagesStore.listMessages(room.id, 1),
                        messagesStore.unreadCount(room.id, accountId),
                    ]);
                    const last = lastList[0] ?? null;
                    const enrichedMembers = await enrichMembersWithProfiles(
                        members,
                        profileStore,
                    );
                    return {
                        ...room,
                        members: enrichedMembers,
                        lastMessage: last,
                        unread,
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
                const allowed = await canMessage(
                    profileStore,
                    accountId,
                    candidate.accountId,
                );
                if (!allowed) {
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
                const existing = await messagesStore.findDmBetween(
                    accountId,
                    targets[0].accountId,
                );
                if (existing) {
                    res.writeHead(200, {
                        "content-type": "application/json",
                    });
                    res.end(JSON.stringify({ data: existing }));
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
            res.writeHead(201, { "content-type": "application/json" });
            res.end(JSON.stringify({ data: room }));
            return true;
        }

        // Match per-room paths.
        const roomMatch = url.pathname.match(
            /^\/api\/v1\/messages\/rooms\/([^/]+)(?:\/([^/]+))?(?:\/([^/]+))?$/,
        );
        if (!roomMatch) return false;
        const roomId = roomMatch[1];
        const sub = roomMatch[2];
        const subArg = roomMatch[3];

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

        // GET /messages/rooms/:id
        if (!sub && req.method === "GET") {
            const members = await messagesStore.listMembers(roomId);
            const enrichedMembers = await enrichMembersWithProfiles(
                members,
                profileStore,
            );
            res.writeHead(200, { "content-type": "application/json" });
            res.end(
                JSON.stringify({ data: { ...room, members: enrichedMembers } }),
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
                const enrichedMessages = await Promise.all(
                    messages.map(async (message) => {
                        const senderProfile = await profileStore.getProfile(
                            message.senderId,
                        );
                        return {
                            ...message,
                            senderHandle: senderProfile?.handle ?? null,
                            senderDisplayName:
                                senderProfile?.displayName ?? null,
                        };
                    }),
                );
                res.writeHead(200, { "content-type": "application/json" });
                res.end(JSON.stringify({ data: enrichedMessages }));
                return true;
            }
            if (req.method === "POST") {
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
            await messagesStore.markRead(roomId, accountId);
            res.writeHead(200, { "content-type": "application/json" });
            res.end(JSON.stringify({ data: { ok: true } }));
            return true;
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
            await messagesStore.removeMember(roomId, target.accountId);
            res.writeHead(200, { "content-type": "application/json" });
            res.end(JSON.stringify({ data: { ok: true } }));
            return true;
        }

        return false;
    };
}
