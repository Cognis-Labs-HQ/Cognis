import { randomUUID } from "node:crypto";

export type CallStatus = "ringing" | "active" | "ended" | "expired";

export interface CallParticipant {
    accountId: string;
    handle: string;
    displayName: string;
}

export interface CallRecord {
    id: string;
    roomId: string;
    room: { id: string; kind: string; title: string };
    callerAccountId: string;
    participants: CallParticipant[];
    status: CallStatus;
    answeredBy: string | null;
    joinedAccountIds: string[];
    endedBy: string | null;
    createdAt: number;
    expiresAt: number;
}

const CALL_TIMEOUT_MILLISECONDS = 45_000;
const RINGING_LEASE_MILLISECONDS = 6_000;

export class CallStore {
    private readonly calls = new Map<string, CallRecord>();
    private readonly ringingLeases = new Map<
        string,
        { ringerId: string; expiresAt: number }
    >();

    create(input: {
        roomId: string;
        room?: { id: string; kind: string; title: string };
        callerAccountId: string;
        participants: CallParticipant[];
    }): CallRecord {
        this.expireCalls();
        const existing = [...this.calls.values()].find(
            (call) =>
                call.roomId === input.roomId &&
                call.status === "ringing" &&
                call.callerAccountId === input.callerAccountId,
        );
        if (existing) return existing;
        const createdAt = Date.now();
        const call: CallRecord = {
            id: randomUUID(),
            ...input,
            room: input.room ?? { id: input.roomId, kind: "dm", title: "" },
            status: "ringing",
            answeredBy: null,
            joinedAccountIds: [input.callerAccountId],
            endedBy: null,
            createdAt,
            expiresAt: createdAt + CALL_TIMEOUT_MILLISECONDS,
        };
        this.calls.set(call.id, call);
        return call;
    }

    get(id: string): CallRecord | null {
        this.expireCalls();
        return this.calls.get(id) ?? null;
    }

    getCurrentRoomCall(roomId: string): CallRecord | null {
        this.expireCalls();
        return (
            [...this.calls.values()]
                .filter(
                    (call) =>
                        call.roomId === roomId &&
                        (call.status === "ringing" || call.status === "active"),
                )
                .sort((left, right) => right.createdAt - left.createdAt)[0] ??
            null
        );
    }

    answer(id: string, accountId: string): CallRecord | null {
        const call = this.get(id);
        if (!call || !["ringing", "active"].includes(call.status)) return null;
        if (call.callerAccountId === accountId) return null;
        if (call.status === "ringing") {
            call.status = "active";
            call.answeredBy = accountId;
        }
        if (!call.joinedAccountIds.includes(accountId)) {
            call.joinedAccountIds.push(accountId);
        }
        return call;
    }

    leave(id: string, accountId: string): CallRecord | null {
        const call = this.get(id);
        if (!call || call.status !== "active") return null;
        call.joinedAccountIds = call.joinedAccountIds.filter(
            (joinedAccountId) => joinedAccountId !== accountId,
        );
        if (call.joinedAccountIds.length === 0) {
            call.status = "ended";
            call.endedBy = accountId;
        }
        return call;
    }

    hangup(id: string, accountId: string): CallRecord | null {
        const call = this.get(id);
        if (!call || !this.hasParticipant(call, accountId)) return null;
        if (call.status === "ringing" || call.status === "active") {
            call.status = "ended";
            call.endedBy = accountId;
        }
        return call;
    }

    hasParticipant(call: CallRecord, accountId: string): boolean {
        return call.participants.some(
            (participant) => participant.accountId === accountId,
        );
    }

    claimRinging(callId: string, accountId: string, ringerId: string): boolean {
        const call = this.get(callId);
        if (
            !call ||
            call.status !== "ringing" ||
            !this.hasParticipant(call, accountId) ||
            call.callerAccountId === accountId ||
            !ringerId
        ) {
            return false;
        }
        const key = `${callId}:${accountId}`;
        const existing = this.ringingLeases.get(key);
        const now = Date.now();
        if (
            existing &&
            existing.expiresAt > now &&
            existing.ringerId !== ringerId
        ) {
            return false;
        }
        this.ringingLeases.set(key, {
            ringerId,
            expiresAt: now + RINGING_LEASE_MILLISECONDS,
        });
        return true;
    }

    releaseRinging(callId: string, accountId: string, ringerId: string): void {
        const key = `${callId}:${accountId}`;
        if (this.ringingLeases.get(key)?.ringerId === ringerId) {
            this.ringingLeases.delete(key);
        }
    }

    private expireCalls(): void {
        const now = Date.now();
        for (const call of this.calls.values()) {
            if (call.status === "ringing" && call.expiresAt <= now) {
                call.status = "expired";
            }
        }
    }
}
