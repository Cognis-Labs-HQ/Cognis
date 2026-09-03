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
    callerAccountId: string;
    participants: CallParticipant[];
    status: CallStatus;
    answeredBy: string | null;
    endedBy: string | null;
    createdAt: number;
    expiresAt: number;
}

const CALL_TIMEOUT_MILLISECONDS = 45_000;

export class CallStore {
    private readonly calls = new Map<string, CallRecord>();

    create(input: {
        roomId: string;
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
            status: "ringing",
            answeredBy: null,
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
        if (!call || call.status !== "ringing") return null;
        if (call.callerAccountId === accountId) return null;
        call.status = "active";
        call.answeredBy = accountId;
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

    private expireCalls(): void {
        const now = Date.now();
        for (const call of this.calls.values()) {
            if (call.status === "ringing" && call.expiresAt <= now) {
                call.status = "expired";
            }
        }
    }
}
