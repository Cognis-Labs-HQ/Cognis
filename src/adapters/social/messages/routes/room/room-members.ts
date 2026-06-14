import type { IncomingMessage, ServerResponse } from "node:http";
import { readJson } from "../../../../../api/reuse/read-json.js";
import { canMessage } from "../shared.js";
import type { DbMessagesStore } from "../../store.js";
import type { SocialMessagesProfileStore } from "../../profile-store-contract.js";

const MEMBER_MUTE_DURATION_HOURS = 24;

function hasModerationPrivileges(input: {
    roomKind: string;
    actorRole: string;
    actorAccountId: string;
    roomMembers: Array<{ accountId: string }>;
}): boolean {
    if (input.actorRole === "owner") return true;
    if (input.actorRole === "admin" && input.roomKind !== "dm") return true;
    if (input.roomKind !== "dm") return false;
    const memberIds = new Set(
        input.roomMembers.map((roomMember) => roomMember.accountId),
    );
    return (
        input.roomMembers.length === 2 && memberIds.has(input.actorAccountId)
    );
}

function canActorModerateTarget(
    actorRole: string,
    targetRole: string,
): boolean {
    if (actorRole === "owner") return true;
    if (actorRole === "admin") return targetRole === "member";
    return false;
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
    const normalizedSelector = String(selector ?? "")
        .trim()
        .replace(/^@/, "");
    if (!normalizedSelector) return null;
    return (
        (await getProfileByHandle(normalizedSelector)) ??
        (await getProfile(normalizedSelector))
    );
}

export async function handleMemberRoutes(input: {
    req: IncomingMessage;
    res: ServerResponse;
    sub: string | undefined;
    subArg: string | undefined;
    subArg2: string | undefined;
    room: { kind: string; id: string };
    member: { role: string };
    accountId: string;
    hasBypass: boolean;
    roomId: string;
    messagesStore: DbMessagesStore;
    profileStore: SocialMessagesProfileStore;
}): Promise<boolean> {
    const {
        req,
        res,
        sub,
        subArg,
        subArg2,
        room,
        member,
        accountId,
        hasBypass,
        roomId,
        messagesStore,
        profileStore,
    } = input;

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
                        message: "Only owners/admins can remove other members.",
                    },
                }),
            );
            return true;
        }
        if (!isSelfLeave && canModerateOthers) {
            const targetMember = await messagesStore.getMember(
                roomId,
                target.accountId,
            );
            if (
                targetMember &&
                !canActorModerateTarget(member.role, targetMember.role)
            ) {
                res.writeHead(403, { "content-type": "application/json" });
                res.end(
                    JSON.stringify({
                        error: {
                            code: "forbidden",
                            message:
                                "Admins cannot remove owners or other admins.",
                        },
                    }),
                );
                return true;
            }
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
                        message: "Only owners/admins can mute members.",
                    },
                }),
            );
            return true;
        }
        const targetMember = roomMembers.find(
            (roomMember) => roomMember.accountId === target.accountId,
        );
        if (!targetMember) {
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
        if (!canActorModerateTarget(member.role, targetMember.role)) {
            res.writeHead(403, { "content-type": "application/json" });
            res.end(
                JSON.stringify({
                    error: {
                        code: "forbidden",
                        message: "Admins cannot mute owners or other admins.",
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
        sub === "members" &&
        subArg &&
        subArg2 === "role" &&
        req.method === "PATCH"
    ) {
        if (member.role !== "owner") {
            res.writeHead(403, { "content-type": "application/json" });
            res.end(
                JSON.stringify({
                    error: {
                        code: "forbidden",
                        message: "Only the room owner can change member roles.",
                    },
                }),
            );
            return true;
        }
        const target = await resolveMemberProfileBySelector(
            subArg,
            profileStore.getProfileByHandle.bind(profileStore),
            profileStore.getProfile.bind(profileStore),
        );
        if (!target) {
            res.writeHead(404, { "content-type": "application/json" });
            res.end(
                JSON.stringify({
                    error: { code: "not_found", message: "User not found." },
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
                        message: "Cannot change your own role.",
                    },
                }),
            );
            return true;
        }
        const targetMember = await messagesStore.getMember(
            roomId,
            target.accountId,
        );
        if (!targetMember) {
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
        if (targetMember.role === "owner") {
            res.writeHead(400, { "content-type": "application/json" });
            res.end(
                JSON.stringify({
                    error: {
                        code: "bad_request",
                        message: "Cannot change the owner's role.",
                    },
                }),
            );
            return true;
        }
        const body = (await readJson(req)) as { role?: unknown };
        const newRole = String(body?.role ?? "").trim();
        if (newRole !== "admin" && newRole !== "member") {
            res.writeHead(400, { "content-type": "application/json" });
            res.end(
                JSON.stringify({
                    error: {
                        code: "bad_request",
                        message: "role must be admin or member.",
                    },
                }),
            );
            return true;
        }
        await messagesStore.setMemberRole(
            roomId,
            target.accountId,
            newRole as "admin" | "member",
        );
        res.writeHead(200, { "content-type": "application/json" });
        res.end(JSON.stringify({ data: { ok: true } }));
        return true;
    }

    return false;
}
