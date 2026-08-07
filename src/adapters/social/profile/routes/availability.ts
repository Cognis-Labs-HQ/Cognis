import type { IncomingMessage, ServerResponse } from "node:http";
import { readJson } from "../../../../api/reuse/read-json.js";
import {
    resolveRouteContext,
    type RouteContext,
} from "../../../../api/reuse/route-context.js";
import type { UserPreferenceStore } from "../../../../api/reuse/preference-store.js";
import type { ProfileStore } from "../store-contract.js";

export type AvailabilityStatus = "free" | "busy" | "tentative";

const AVAILABILITY_PREFERENCE = "availability";
const VALID_STATUSES = new Set<AvailabilityStatus>([
    "free",
    "busy",
    "tentative",
]);

export function readManualStatus(value: string | null): AvailabilityStatus {
    if (!value) return "free";
    try {
        const status = JSON.parse(value)?.status;
        return VALID_STATUSES.has(status) ? status : "free";
    } catch {
        return "free";
    }
}

export function createAvailabilityRoutes(
    profileStore: ProfileStore,
    preferenceStore: UserPreferenceStore,
    resolveCalendarStatus: (
        accountId: string,
    ) => Promise<AvailabilityStatus | null>,
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
            const calendarStatus = await resolveCalendarStatus(
                profile.accountId,
            );
            const manualStatus = readManualStatus(
                await preferenceStore.get(
                    profile.accountId,
                    AVAILABILITY_PREFERENCE,
                ),
            );
            res.writeHead(200, { "content-type": "application/json" });
            res.end(
                JSON.stringify({
                    data: {
                        handle: profile.handle,
                        status: calendarStatus ?? manualStatus,
                        manualStatus,
                        source: calendarStatus ? "calendar" : "manual",
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
                JSON.stringify({ status: body.status }),
            );
            res.writeHead(200, { "content-type": "application/json" });
            res.end(JSON.stringify({ data: { saved: true } }));
            return true;
        }

        return false;
    };
}
