import { apiFetch } from "/static/reuse/api-client.js";
import { registerScopedUiActions } from "/static/reuse/scoped-actions.js";

/** Shared Calendar requests retain explicit guest authority and never enter the account outbox. */
export function registerSharedCalendarClient(ctx) {
    const methods = {
        readEvents: "GET",
        createEvent: "POST",
        updateEvent: "PATCH",
        deleteEvent: "DELETE",
    };
    const actions = Object.fromEntries(
        Object.entries(methods).map(([action, method]) => [
            action,
            async (input) => {
                const signal = input.signal
                    ? AbortSignal.any([ctx.signal, input.signal])
                    : ctx.signal;
                return apiFetch(
                    `/api/v1/calendar/shared/${encodeURIComponent(input.calendarId)}/events`,
                    {
                        method,
                        signal,
                        accessToken: input.guestAccessToken,
                        bufferOffline: false,
                        headers: { "content-type": "application/json" },
                        ...(method === "GET"
                            ? {}
                            : { body: JSON.stringify(input.body) }),
                    },
                );
            },
        ]),
    );
    const client = registerScopedUiActions(ctx, "calendar:shared", actions);
    for (const action of Object.keys(methods))
        ctx.extendFlow(
            `calendar:shared:${action}`,
            "before",
            { id: `calendar:shared:validate:${action}` },
            ({ input }) => {
                if (
                    typeof input?.calendarId !== "string" ||
                    !input.calendarId.trim() ||
                    typeof input.guestAccessToken !== "string" ||
                    !input.guestAccessToken.trim()
                )
                    throw new Error("calendar_shared_authority_required");
            },
        );
    ctx.capabilities.contribute("calendar:sharedClient", Object.freeze(client));
}
