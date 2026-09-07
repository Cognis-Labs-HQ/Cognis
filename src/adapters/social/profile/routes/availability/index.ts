import type { IncomingMessage, ServerResponse } from "node:http";
import { readJson } from "../../../../../api/reuse/read-json.js";
import {
    resolveRouteContext,
    type RouteContext,
} from "../../../../../api/reuse/route-context.js";
import type { UserPreferenceStore } from "../../../../../api/reuse/preference-store.js";
import type { ProfileStore } from "../../store-contract.js";

export type AvailabilityStatus = "free" | "busy" | "tentative";
export type EffectiveAvailabilityStatus = AvailabilityStatus | "idle";
export interface CalendarAvailability {
    status: AvailabilityStatus;
    effectiveSince: string;
}

interface ManualAvailability {
    status: AvailabilityStatus;
    updatedAt: string;
}

const AVAILABILITY_PREFERENCE = "availability";
export const AVAILABILITY_STATUSES: readonly AvailabilityStatus[] = [
    "free",
    "busy",
    "tentative",
];
const VALID_STATUSES = new Set(AVAILABILITY_STATUSES);
const ACTIVE_PRESENCE_TTL_MS = 45_000;
const MAX_PRESENCE_SESSIONS_PER_ACCOUNT = 8;

export class AvailabilityPresenceStore {
    private readonly sessionsByAccount = new Map<
        string,
        Map<string, { active: boolean; updatedAt: number }>
    >();

    update(
        accountId: string,
        sessionId: string,
        active: boolean,
        updatedAt = Date.now(),
    ): void {
        const sessions =
            this.sessionsByAccount.get(accountId) ??
            new Map<string, { active: boolean; updatedAt: number }>();
        this.pruneExpiredSessions(sessions, updatedAt);
        sessions.set(sessionId, { active, updatedAt });
        while (sessions.size > MAX_PRESENCE_SESSIONS_PER_ACCOUNT) {
            const oldestSessionId = Array.from(sessions.entries()).sort(
                ([, first], [, second]) => first.updatedAt - second.updatedAt,
            )[0]?.[0];
            if (!oldestSessionId) break;
            sessions.delete(oldestSessionId);
        }
        this.sessionsByAccount.set(accountId, sessions);
    }

    isIdle(accountId: string, now = Date.now()): boolean {
        const sessions = this.sessionsByAccount.get(accountId);
        if (!sessions) return false;
        this.pruneExpiredSessions(sessions, now);
        if (!sessions.size) return true;
        return !Array.from(sessions.values()).some((session) => session.active);
    }

    private pruneExpiredSessions(
        sessions: Map<string, { active: boolean; updatedAt: number }>,
        now: number,
    ): void {
        for (const [sessionId, session] of sessions) {
            if (now - session.updatedAt > ACTIVE_PRESENCE_TTL_MS) {
                sessions.delete(sessionId);
            }
        }
    }
}

async function canViewAvailability(
    requesterId: string,
    target: Awaited<ReturnType<ProfileStore["getProfile"]>>,
    profileStore: ProfileStore,
): Promise<boolean> {
    if (!target) return false;
    if (requesterId === target.accountId) return true;
    if (await profileStore.isBlocked(target.accountId, requesterId)) {
        return false;
    }
    if (target.visibility === "community") return true;
    if (target.visibility === "friends") {
        return profileStore.isFollowing(requesterId, target.accountId);
    }
    if (target.visibility === "private") {
        return profileStore.isFollowing(target.accountId, requesterId);
    }
    return false;
}

export function readStoredManualAvailability(
    value: string | null,
): ManualAvailability | null {
    if (!value) return null;
    try {
        const parsed = JSON.parse(value);
        const status = parsed?.status;
        const updatedAt = parsed?.updatedAt;
        return VALID_STATUSES.has(status) &&
            typeof updatedAt === "string" &&
            Number.isFinite(Date.parse(updatedAt))
            ? { status, updatedAt }
            : null;
    } catch {
        return null;
    }
}

export function readManualStatus(value: string | null): AvailabilityStatus {
    return readStoredManualAvailability(value)?.status ?? "free";
}

export function resolveEffectiveAvailability(
    manualAvailability: ManualAvailability | null,
    calendarAvailability: CalendarAvailability | null,
): { status: AvailabilityStatus; source: "manual" | "calendar" } {
    if (
        calendarAvailability &&
        (!manualAvailability ||
            Date.parse(calendarAvailability.effectiveSince) >
                Date.parse(manualAvailability.updatedAt))
    ) {
        return { status: calendarAvailability.status, source: "calendar" };
    }
    return {
        status: manualAvailability?.status ?? "free",
        source: "manual",
    };
}

export function createAvailabilityRoutes(
    profileStore: ProfileStore,
    preferenceStore: UserPreferenceStore,
    resolveCalendarStatus: (
        accountId: string,
    ) => Promise<CalendarAvailability | null>,
    routeContext?: RouteContext,
    presenceStore = new AvailabilityPresenceStore(),
) {
    const ctx = resolveRouteContext(routeContext);
    return async (
        req: IncomingMessage,
        res: ServerResponse,
        url: URL,
    ): Promise<boolean> => {
        if (
            url.pathname === "/api/v1/social/availability/presence" &&
            req.method === "PUT"
        ) {
            const claims = ctx.requireAuth(req, res, "user");
            if (!claims) return true;
            const body = await readJson(req);
            const sessionId = String(body.sessionId ?? "").trim();
            if (!sessionId || typeof body.active !== "boolean") {
                res.writeHead(400, { "content-type": "application/json" });
                res.end(
                    JSON.stringify({ error: { code: "invalid_presence" } }),
                );
                return true;
            }
            presenceStore.update(claims.sub, sessionId, body.active);
            res.writeHead(200, { "content-type": "application/json" });
            res.end(JSON.stringify({ data: { saved: true } }));
            return true;
        }

        const match = url.pathname.match(
            /^\/api\/v1\/social\/availability(?:\/([^/]+))?$/,
        );
        if (!match) return false;
        const claims = ctx.requireAuth(req, res, "user");
        if (!claims) return true;

        const requestedHandle = match[1]
            ? decodeURIComponent(match[1]).replace(/^@/, "")
            : null;
        const profile = requestedHandle
            ? await profileStore.getProfileByHandle(requestedHandle)
            : await profileStore.getProfile(claims.sub);
        if (!profile) {
            res.writeHead(404, { "content-type": "application/json" });
            res.end(JSON.stringify({ error: { code: "not_found" } }));
            return true;
        }

        if (req.method === "GET") {
            if (
                !(await canViewAvailability(claims.sub, profile, profileStore))
            ) {
                res.writeHead(404, { "content-type": "application/json" });
                res.end(JSON.stringify({ error: { code: "not_found" } }));
                return true;
            }
            const calendarAvailability = await resolveCalendarStatus(
                profile.accountId,
            );
            const manualAvailability = readStoredManualAvailability(
                await preferenceStore.get(
                    profile.accountId,
                    AVAILABILITY_PREFERENCE,
                ),
            );
            const effectiveAvailability = resolveEffectiveAvailability(
                manualAvailability,
                calendarAvailability,
            );
            const idle = presenceStore.isIdle(profile.accountId);
            res.writeHead(200, { "content-type": "application/json" });
            res.end(
                JSON.stringify({
                    data: {
                        handle: profile.handle,
                        status: idle ? "idle" : effectiveAvailability.status,
                        manualStatus: manualAvailability?.status ?? "free",
                        source: idle
                            ? "presence"
                            : effectiveAvailability.source,
                    },
                }),
            );
            return true;
        }

        if (req.method === "PUT" && profile.accountId === claims.sub) {
            const body = await readJson(req);
            if (!VALID_STATUSES.has(body.status)) {
                res.writeHead(400, { "content-type": "application/json" });
                res.end(
                    JSON.stringify({
                        error: {
                            code: "invalid_status",
                            message: "Status must be free, busy, or tentative.",
                        },
                    }),
                );
                return true;
            }
            await preferenceStore.set(
                profile.accountId,
                AVAILABILITY_PREFERENCE,
                JSON.stringify({
                    status: body.status,
                    updatedAt: new Date().toISOString(),
                }),
            );
            res.writeHead(200, { "content-type": "application/json" });
            res.end(JSON.stringify({ data: { saved: true } }));
            return true;
        }

        return false;
    };
}
