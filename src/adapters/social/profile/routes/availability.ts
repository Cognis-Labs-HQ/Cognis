import type { IncomingMessage, ServerResponse } from "node:http";
import { readJson } from "../../../../api/reuse/read-json.js";
import {
    resolveRouteContext,
    type RouteContext,
} from "../../../../api/reuse/route-context.js";
import type { UserPreferenceStore } from "../../../../api/reuse/preference-store.js";
import type { ProfileStore } from "../store-contract.js";

export type AvailabilityStatus = "free" | "busy" | "tentative";
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
) {
    const ctx = resolveRouteContext(routeContext);
    return async (
        req: IncomingMessage,
        res: ServerResponse,
        url: URL,
    ): Promise<boolean> => {
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
            res.writeHead(200, { "content-type": "application/json" });
            res.end(
                JSON.stringify({
                    data: {
                        handle: profile.handle,
                        status: effectiveAvailability.status,
                        manualStatus: manualAvailability?.status ?? "free",
                        source: effectiveAvailability.source,
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
