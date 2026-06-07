import test from "node:test";
import assert from "node:assert/strict";
import { createCalendarResponseHandler } from "../ui/app/popup-manager-response.js";

function createHarness({
    calendars = [{ id: "default" }, { id: "target" }],
    selectedCalendarId = "target",
} = {}) {
    const openPopupCalls = [];
    const responded = [];
    const selectedCalendars = [];
    return {
        openPopupCalls,
        responded,
        selectedCalendars,
        handler: createCalendarResponseHandler({
            i18n: { t: (key) => key },
            calendarUi: {
                EVENT_RESPONSE_OPTIONS: ["accepted", "tentative", "declined"],
                respondToEvent: async (...args) => {
                    responded.push(args);
                    return {
                        ok: true,
                        json: async () => ({ data: {} }),
                    };
                },
            },
            showToast: () => {},
            openPopup: async (payload) => {
                openPopupCalls.push(payload);
                return null;
            },
            escapeHtml: (value) => String(value),
            getCalendars: () => calendars,
            getSelectedCalendarId: () => selectedCalendarId,
            setSelectedCalendarId: (value) => selectedCalendars.push(value),
            reloadState: async () => {},
            syncRouteSelection: () => {},
            refreshComposer: () => {},
        }),
    };
}

test("accepted quick response skips calendar picker popup and uses selected calendar", async () => {
    const { handler, openPopupCalls, responded, selectedCalendars } =
        createHarness();
    const success = await handler.handleEventResponse(
        {
            calendar: { id: "invite-source", visibility: "private" },
            event: { id: "event-1", recurrence: "none" },
        },
        "accepted",
    );
    assert.equal(success, true);
    assert.equal(openPopupCalls.length, 0);
    assert.equal(responded.length, 1);
    assert.deepEqual(responded[0], [
        "invite-source",
        "event-1",
        "accepted",
        { respondAll: false, targetCalendarId: "target" },
    ]);
    assert.deepEqual(selectedCalendars, ["target"]);
});

test("tentative quick response uses fallback target resolution and declined skips target", async () => {
    const { handler, responded } = createHarness({
        calendars: [{ id: "source" }, { id: "first-fallback" }],
        selectedCalendarId: "",
    });
    const tentativeSuccess = await handler.handleEventResponse(
        {
            calendar: { id: "source", visibility: "private" },
            event: { id: "event-2", recurrence: "none" },
        },
        "tentative",
    );
    const declinedSuccess = await handler.handleEventResponse(
        {
            calendar: { id: "source", visibility: "private" },
            event: { id: "event-3", recurrence: "none" },
        },
        "declined",
    );
    assert.equal(tentativeSuccess, true);
    assert.equal(declinedSuccess, true);
    assert.deepEqual(responded[0][3], {
        respondAll: false,
        targetCalendarId: "source",
    });
    assert.deepEqual(responded[1][3], {
        respondAll: false,
        targetCalendarId: null,
    });
});

test("accepted quick response falls back to first available calendar when needed", async () => {
    const { handler, responded } = createHarness({
        calendars: [{ id: "first-fallback" }, { id: "other" }],
        selectedCalendarId: "missing",
    });
    await handler.handleEventResponse(
        {
            calendar: { id: "missing-source", visibility: "private" },
            event: { id: "event-4", recurrence: "none" },
        },
        "accepted",
    );
    assert.deepEqual(responded[0][3], {
        respondAll: false,
        targetCalendarId: "first-fallback",
    });
});

test("shared calendar quick responses keep target calendar unset", async () => {
    const { handler, responded } = createHarness();
    await handler.handleEventResponse(
        {
            calendar: { id: "shared-1", visibility: "shared" },
            event: { id: "event-5", recurrence: "none" },
        },
        "accepted",
    );
    assert.deepEqual(responded[0][3], {
        respondAll: false,
        targetCalendarId: null,
    });
});
