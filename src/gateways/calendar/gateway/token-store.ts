import { randomBytes } from "node:crypto";
import type {
    CaldavTokenRecord,
    ScopedMeetingAccessTokenRecord,
} from "./utils.js";

export class CalendarTokenStore {
    private readonly tokensByValue = new Map<string, CaldavTokenRecord>();
    private readonly scopedMeetingTokensByValue = new Map<
        string,
        ScopedMeetingAccessTokenRecord
    >();

    issueCaldavToken(
        input: Omit<CaldavTokenRecord, "token">,
        ttlSeconds?: number,
    ): CaldavTokenRecord {
        const token: CaldavTokenRecord = {
            token: randomBytes(24).toString("hex"),
            ownerAccountId: input.ownerAccountId,
            calendarId: input.calendarId,
            expiresAt: new Date(
                Date.now() + (ttlSeconds ?? 3600) * 1000,
            ).toISOString(),
        };
        this.tokensByValue.set(token.token, token);
        return token;
    }

    resolveCaldavToken(tokenValue: string): CaldavTokenRecord | null {
        const token = this.tokensByValue.get(tokenValue) ?? null;
        if (!token) return null;
        if (new Date(token.expiresAt).getTime() <= Date.now()) {
            this.tokensByValue.delete(tokenValue);
            return null;
        }
        return token;
    }

    issueScopedMeetingToken(
        input: Omit<ScopedMeetingAccessTokenRecord, "token">,
        ttlSeconds?: number,
    ): ScopedMeetingAccessTokenRecord {
        const token: ScopedMeetingAccessTokenRecord = {
            token: randomBytes(24).toString("hex"),
            targetUrl: input.targetUrl,
            createdByAccountId: input.createdByAccountId,
            eventId: input.eventId ?? null,
            expiresAt: new Date(
                Date.now() + (ttlSeconds ?? 900) * 1000,
            ).toISOString(),
        };
        this.scopedMeetingTokensByValue.set(token.token, token);
        return token;
    }

    consumeScopedMeetingToken(
        tokenValue: string,
    ): ScopedMeetingAccessTokenRecord | null {
        const token = this.scopedMeetingTokensByValue.get(tokenValue) ?? null;
        if (!token) return null;
        this.scopedMeetingTokensByValue.delete(tokenValue);
        if (new Date(token.expiresAt).getTime() <= Date.now()) {
            return null;
        }
        return token;
    }
}
