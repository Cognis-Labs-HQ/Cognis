import type { IncomingMessage, ServerResponse } from "node:http";
import type { RouteContext } from "../../../../api/reuse/route-context.js";
import type { CallRecord, CallStore } from "../store.js";

interface CallRoomContext {
    room: { id: string; kind: string; title: string };
    participants: Array<{
        accountId: string;
        handle: string;
        displayName: string;
    }>;
}

async function readBody(
    req: IncomingMessage,
): Promise<Record<string, unknown>> {
    const chunks: Buffer[] = [];
    for await (const chunk of req) chunks.push(Buffer.from(chunk));
    if (chunks.length === 0) return {};
    return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}

function sendJson(
    res: ServerResponse,
    status: number,
    payload: Record<string, unknown>,
): void {
    res.writeHead(status, { "content-type": "application/json" });
    res.end(JSON.stringify(payload));
}

function publicCall(call: CallRecord): Record<string, unknown> {
    return {
        id: call.id,
        roomId: call.roomId,
        callerAccountId: call.callerAccountId,
        participants: call.participants,
        status: call.status,
        answeredBy: call.answeredBy,
        joinedAccountIds: call.joinedAccountIds,
        endedBy: call.endedBy,
        createdAt: call.createdAt,
        expiresAt: call.expiresAt,
    };
}

export function createCallRoutes(
    store: CallStore,
    routeContext: RouteContext,
    resolveRoom: (input: {
        roomId: string;
        accountId: string;
    }) => Promise<CallRoomContext | null>,
    dispatch?: (envelope: {
        category: string;
        recipientUsername: string;
        subject: string;
        body: string;
        senderName?: string;
        actionUrl?: string;
        metadata?: Record<string, unknown>;
    }) => Promise<unknown>,
    appendRoomEvent?: (input: {
        roomId: string;
        actorId: string;
        eventType:
            | "call_started"
            | "call_answered"
            | "call_cancelled"
            | "call_declined"
            | "call_missed";
        subjectAccountId: string;
        subjectHandle?: string | null;
        subjectDisplayName?: string | null;
        details?: Record<string, unknown>;
    }) => Promise<unknown>,
) {
    const recordedEvents = new Set<string>();
    const recordEvent = async (
        call: CallRecord,
        eventType:
            | "call_started"
            | "call_answered"
            | "call_cancelled"
            | "call_declined"
            | "call_missed",
        actorId: string,
    ) => {
        const key = `${call.id}:${eventType}`;
        if (recordedEvents.has(key)) return;
        const actor = call.participants.find(
            (participant) => participant.accountId === actorId,
        );
        await appendRoomEvent?.({
            roomId: call.roomId,
            actorId,
            eventType,
            subjectAccountId: actorId,
            subjectHandle: actor?.handle,
            subjectDisplayName: actor?.displayName,
            details: {
                callId: call.id,
                callerAccountId: call.callerAccountId,
                status: call.status,
            },
        });
        recordedEvents.add(key);
    };
    return async (
        req: IncomingMessage,
        res: ServerResponse,
        url: URL,
    ): Promise<boolean> => {
        if (!url.pathname.startsWith("/api/v1/social/call")) return false;
        const claims = routeContext.requireAuth(req, res, "user");
        if (!claims) return true;
        const callMatch = url.pathname.match(
            /^\/api\/v1\/social\/call\/([0-9a-f-]+)(?:\/(answer|hangup|leave|ringing))?$/,
        );
        const roomCallMatch = url.pathname.match(
            /^\/api\/v1\/social\/call\/room\/([^/]+)$/,
        );
        if (roomCallMatch && req.method === "GET") {
            const roomId = decodeURIComponent(roomCallMatch[1]);
            const room = await resolveRoom({
                roomId,
                accountId: claims.sub,
            });
            if (!room) {
                sendJson(res, 404, {
                    error: { code: "not_found", message: "Room not found." },
                });
                return true;
            }
            const call = store.getCurrentRoomCall(roomId);
            sendJson(res, 200, { data: call ? publicCall(call) : null });
            return true;
        }
        if (url.pathname === "/api/v1/social/call" && req.method === "POST") {
            let body: Record<string, unknown>;
            try {
                body = await readBody(req);
            } catch {
                sendJson(res, 400, {
                    error: { code: "invalid_json", message: "Invalid JSON." },
                });
                return true;
            }
            const roomId = String(body.roomId ?? "").trim();
            const room = roomId
                ? await resolveRoom({ roomId, accountId: claims.sub })
                : null;
            if (!room || !["dm", "group"].includes(room.room.kind)) {
                sendJson(res, 403, {
                    error: {
                        code: "call_not_allowed",
                        message: "Calling is unavailable for this room.",
                    },
                });
                return true;
            }
            const existingCall = store.getCurrentRoomCall(roomId);
            if (existingCall) {
                sendJson(res, 200, { data: publicCall(existingCall) });
                return true;
            }
            const call = store.create({
                roomId,
                callerAccountId: claims.sub,
                participants: room.participants,
            });
            const caller = room.participants.find(
                (participant) => participant.accountId === claims.sub,
            );
            await recordEvent(call, "call_started", claims.sub);
            await Promise.all(
                room.participants
                    .filter(
                        (participant) => participant.accountId !== claims.sub,
                    )
                    .map((participant) =>
                        dispatch?.({
                            category: "calls",
                            recipientUsername: participant.handle,
                            subject: "Incoming call",
                            body: `${caller?.displayName || caller?.handle || "Someone"} is calling`,
                            senderName:
                                caller?.displayName || caller?.handle || "Call",
                            actionUrl: `/messages/${encodeURIComponent(roomId)}?call=${encodeURIComponent(call.id)}&answer=1`,
                            metadata: {
                                callId: call.id,
                                roomId,
                                expiresAt: call.expiresAt,
                                continuous: true,
                                correlationId: call.id,
                                actions: [
                                    {
                                        id: "answer",
                                        label: "Answer call",
                                        consequence: "creative",
                                        iconSvg:
                                            '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6.6 10.8c1.5 2.9 3.8 5.2 6.6 6.6l2.2-2.2c.3-.3.7-.4 1-.2 1.1.4 2.3.6 3.6.6.6 0 1 .4 1 1V20c0 .6-.4 1-1 1C10.6 21 3 13.4 3 4c0-.6.4-1 1-1h3.5c.6 0 1 .4 1 1 0 1.3.2 2.5.6 3.6.1.4 0 .8-.2 1l-2.3 2.2Z"/></svg>',
                                    },
                                    {
                                        id: "decline",
                                        label: "Decline call",
                                        consequence: "destructive",
                                        iconSvg:
                                            '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6.6 13.2 2.3 2.2c.2.2.3.6.2 1-.4 1.1-.6 2.3-.6 3.6 0 .6-.4 1-1 1H4c-.6 0-1-.4-1-1 0-9.4 7.6-17 17-17 .6 0 1 .4 1 1v3.5c0 .6-.4 1-1 1-1.3 0-2.5.2-3.6.6-.4.2-.8.1-1-.2l-2.2-2.2c-2.8 1.4-5.2 3.7-6.6 6.5Z"/></svg>',
                                    },
                                ],
                            },
                        }),
                    ),
            );
            sendJson(res, 201, { data: publicCall(call) });
            return true;
        }
        if (!callMatch || (req.method !== "GET" && req.method !== "POST")) {
            return false;
        }
        const operation = callMatch[2];
        if (req.method === "POST" && operation === "ringing") {
            let body: Record<string, unknown>;
            try {
                body = await readBody(req);
            } catch {
                sendJson(res, 400, {
                    error: { code: "invalid_json", message: "Invalid JSON." },
                });
                return true;
            }
            const ringerId = String(body.ringerId ?? "").trim();
            if (body.active === false) {
                store.releaseRinging(callMatch[1], claims.sub, ringerId);
                sendJson(res, 200, { data: { ringing: false } });
                return true;
            }
            sendJson(res, 200, {
                data: {
                    ringing: store.claimRinging(
                        callMatch[1],
                        claims.sub,
                        ringerId,
                    ),
                },
            });
            return true;
        }
        const call = store.get(callMatch[1]);
        if (!call || !store.hasParticipant(call, claims.sub)) {
            sendJson(res, 404, {
                error: { code: "not_found", message: "Call not found." },
            });
            return true;
        }
        if (req.method === "POST" && operation === "answer") {
            const answered = store.answer(call.id, claims.sub);
            if (!answered) {
                sendJson(res, 409, {
                    error: {
                        code: "call_unavailable",
                        message: "Call is no longer ringing.",
                    },
                });
                return true;
            }
            await recordEvent(answered, "call_answered", claims.sub);
            sendJson(res, 200, { data: publicCall(answered) });
            return true;
        }
        if (req.method === "POST" && operation === "hangup") {
            const ended = store.hangup(call.id, claims.sub)!;
            await recordEvent(
                ended,
                claims.sub === ended.callerAccountId
                    ? "call_cancelled"
                    : "call_declined",
                claims.sub,
            );
            sendJson(res, 200, {
                data: publicCall(ended),
            });
            return true;
        }
        if (req.method === "POST" && operation === "leave") {
            const left = store.leave(call.id, claims.sub);
            if (!left) {
                sendJson(res, 200, { data: publicCall(call) });
                return true;
            }
            sendJson(res, 200, { data: publicCall(left) });
            return true;
        }
        if (req.method === "GET" && !operation) {
            if (call.status === "expired") {
                await recordEvent(call, "call_missed", call.callerAccountId);
            }
            sendJson(res, 200, { data: publicCall(call) });
            return true;
        }
        return false;
    };
}
