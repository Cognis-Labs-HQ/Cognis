import test from "node:test";
import assert from "node:assert/strict";
import { createSubmitEvent } from "../ui/app/submit-event.js";
import { createOfflineClientFixture } from "../../../tooling/reuse/offline-client-fixture.js";
import { loadTestModule } from "../../../tooling/reuse/test-module.ts";

test("a queued event remains successful and readable when optional activity and view refresh fail", async (context) => {
    const host = createOfflineClientFixture(async (path) =>
        Response.json({
            data: path.endsWith("/calendars")
                ? [{ id: "primary", ownerAccountId: "learner" }]
                : { events: [] },
        }),
    );
    context.after(() => host.controller.abort());
    host.ctx.extendFlow(
        "activity:record",
        "capture",
        { id: "test:activityFailure" },
        () => {
            throw new Error("analytics_unavailable");
        },
    );
    const client = loadTestModule(
        new URL("../ui/offline-client.js", import.meta.url),
        host.imports,
        host.globals,
    );
    client.registerCalendarClient(host.ctx);
    await client.calendarFetch("/api/v1/calendar/calendars");
    await client.calendarFetch("/api/v1/calendar/calendars/primary/events");
    host.disconnect();
    const notices = [];
    const submit = createSubmitEvent({
        getJitsiAvailable: () => false,
        calendarUi: {
            createEvent: (id, payload) =>
                client.calendarFetch(
                    `/api/v1/calendar/calendars/${id}/events`,
                    { method: "POST", body: JSON.stringify(payload) },
                ),
        },
        showToast: (message, variant) => notices.push({ message, variant }),
        i18n: { t: (key) => key },
        getEventsByCalendar: () => ({}),
        reloadState: async () => {
            throw new Error("view_unavailable");
        },
        setSelectedCalendarId: (id) => assert.equal(id, "primary"),
        syncRouteSelection: () => {},
    });
    const input = {
        calendarId: "primary",
        title: "Offline event",
        startAt: "2027-01-01T10:00Z",
        endAt: "2027-01-01T11:00Z",
        attendees: [],
    };
    const [id, repeated] = await Promise.all([submit(input), submit(input)]);
    assert.equal(repeated, id);
    assert.equal(typeof id, "string");
    assert.deepEqual(notices, [
        {
            message: "gateway.calendar.create_event_success",
            variant: "success",
        },
    ]);
    assert.equal((await host.outbox.pending("calendar.events")).length, 1);
    const details = await (
        await client.calendarFetch(
            `/api/v1/calendar/calendars/primary/events/${id}`,
        )
    ).json();
    assert.equal(details.data.event.title, "Offline event");
    assert.equal(details.data.meta.canEdit, true);
});
