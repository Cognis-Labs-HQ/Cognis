import { registerCalendarClient, calendarFetch } from "./offline-client.js";
import { calendarDashboardEvents } from "./calendar-api.js";
import { bindOfflineSnapshotRefresh } from "/static/reuse/offline-snapshot.js";
import { isOffline } from "/static/reuse/offline-state.js";

export function mountProvider(ctx) {
    ctx.capabilities
        .get("offline:assets")
        .register(["/static/gateways/calendar/ui/calendar-status.css"], {
            signal: ctx.signal,
        });
    registerCalendarClient(ctx);
    ctx.capabilities.contribute(
        "calendar:dashboardEvents",
        calendarDashboardEvents,
    );
    bindOfflineSnapshotRefresh(ctx, {
        id: "calendar:prepareOfflineSnapshot",
        refresh: async () => {
            const response = await calendarFetch("/api/v1/calendar/calendars", {
                signal: ctx.signal,
            });
            if (!response.ok) throw new Error("calendar_load_failed");
            const calendars = (await response.json()).data ?? [];
            const paths = [
                "/api/v1/calendar/invitations",
                ...calendars
                    .filter(
                        (calendar) =>
                            calendar.ownerAccountId ===
                            localStorage.getItem("cognis_account"),
                    )
                    .map(
                        (calendar) =>
                            `/api/v1/calendar/calendars/${encodeURIComponent(calendar.id)}/events`,
                    ),
            ];
            let index = 0;
            await Promise.all(
                Array.from({ length: Math.min(2, paths.length) }, async () => {
                    while (
                        index < paths.length &&
                        !isOffline() &&
                        !ctx.signal.aborted
                    )
                        await calendarFetch(paths[index++], {
                            signal: ctx.signal,
                        });
                }),
            );
        },
    });
}
