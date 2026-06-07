import test from "node:test";
import assert from "node:assert/strict";
import { createCalendarResponseHandler } from "../ui/app/popup-manager-response.js";

function createHarness({
    calendars = [
        { id: "default", name: "Default" },
        { id: "target", name: "Target" },
    ],
    selectedCalendarId = "target",
    scopeAction = "single",
    targetAction = "save",
    targetCalendarId = "target",
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
                const actionIds = payload.actions.map((action) => action.id);
                if (actionIds.includes("single")) {
                    return scopeAction;
                }
                if (actionIds.includes("save")) {
                    if (typeof payload.onAction === "function") {
                        await payload.onAction(targetAction, {
                            querySelector: (selector) =>
                                selector ===
                                "#calendar-response-target-calendar"
                                    ? { value: targetCalendarId }
                                    : null,
                        });
                    }
                    return targetAction;
                }
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

test("accepted quick response prompts for target calendar and uses selection", async () => {
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
    assert.equal(openPopupCalls.length, 1);
    assert.equal(
        openPopupCalls[0].title,
        "gateway.calendar.accept_calendar_title",
    );
    assert.equal(responded.length, 1);
    assert.deepEqual(responded[0], [
        "invite-source",
        "event-1",
        "accepted",
        { respondAll: false, targetCalendarId: "target" },
    ]);
    assert.deepEqual(selectedCalendars, ["target"]);
});

test("tentative quick response prompts and declined skips target calendar prompt", async () => {
    const { handler, responded } = createHarness({
        calendars: [
            { id: "source", name: "Source" },
            { id: "first-fallback", name: "Fallback" },
        ],
        selectedCalendarId: "",
        targetCalendarId: "source",
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

test("accepted quick response uses fallback target default when no selected calendar is active", async () => {
    const { handler, responded } = createHarness({
        calendars: [
            { id: "first-fallback", name: "Fallback" },
            { id: "other", name: "Other" },
        ],
        selectedCalendarId: "missing",
        targetCalendarId: "first-fallback",
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
    const { handler, responded, openPopupCalls } = createHarness();
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
    assert.equal(openPopupCalls.length, 0);
});

test("accepted quick response aborts when calendar selection is canceled", async () => {
    const { handler, responded } = createHarness({
        targetAction: "cancel",
    });
    const success = await handler.handleEventResponse(
        {
            calendar: { id: "invite-source", visibility: "private" },
            event: { id: "event-6", recurrence: "none" },
        },
        "accepted",
    );
    assert.equal(success, false);
    assert.equal(responded.length, 0);
});
