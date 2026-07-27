import { escapeHtml } from "/static/reuse/escape-html.js";
import { formatDateTime } from "/static/reuse/timestamp.js";
import { showToast } from "/static/reuse/toast.js";
import { registerShareRenderer } from "/static/gateways/share/ui/app/renderer-registry.js";

registerShareRenderer(
    "calendar",
    ({ data, grantedCapabilities, guestAccessToken, i18n }) => {
        const calendar = data?.calendar ?? {};
        const events = Array.isArray(data?.events) ? data.events : [];
        const canWrite = grantedCapabilities?.includes("calendar:write");
        queueMicrotask(() => {
            const form = document.querySelector("#shared-calendar-event-form");
            form?.addEventListener("submit", async (event) => {
                event.preventDefault();
                const formData = new FormData(form);
                const response = await fetch(
                    `/api/v1/calendar/shared/${encodeURIComponent(calendar.id)}/events`,
                    {
                        method: "POST",
                        headers: {
                            "content-type": "application/json",
                            ...(guestAccessToken
                                ? {
                                      authorization: `Bearer ${guestAccessToken}`,
                                  }
                                : {}),
                        },
                        body: JSON.stringify(Object.fromEntries(formData)),
                    },
                );
                showToast(
                    i18n.t(
                        response.ok
                            ? "gateway.calendar.create_event_success"
                            : "gateway.calendar.create_event_failed",
                    ),
                    { variant: response.ok ? "success" : "error" },
                );
                if (response.ok) globalThis.location.reload();
            });
        });
        return `<section class="shared-calendar"><h2>${escapeHtml(calendar.name || i18n.t("gateway.calendar.page_title"))}</h2><div class="shared-calendar-events">${events.map((event) => `<article><h3>${escapeHtml(event.title)}</h3><p>${escapeHtml(formatDateTime(event.startAt))} – ${escapeHtml(formatDateTime(event.endAt))}</p><p>${escapeHtml(event.description || "")}</p></article>`).join("")}</div>${canWrite ? `<form id="shared-calendar-event-form"><label>${escapeHtml(i18n.t("gateway.calendar.event_title"))}<input name="title" required /></label><label>${escapeHtml(i18n.t("gateway.calendar.event_start"))}<input name="startAt" type="datetime-local" required /></label><label>${escapeHtml(i18n.t("gateway.calendar.event_end"))}<input name="endAt" type="datetime-local" required /></label><button type="submit" class="btn-confirm">${escapeHtml(i18n.t("gateway.calendar.create_event"))}</button></form>` : ""}</section>`;
    },
);
