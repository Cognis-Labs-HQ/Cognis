import assert from "node:assert/strict";
import { getEventListeners } from "node:events";
import test from "node:test";
import { loadPopupManager } from "../fixtures/popup-manager-loader.js";

class Element extends EventTarget {
    constructor() {
        super();
        this.children = [];
    }

    get previousElementSibling() {
        const siblings = this.parentElement?.children ?? [];
        return siblings[siblings.indexOf(this) - 1] ?? null;
    }

    closest() {
        return this.parentElement;
    }

    insertAdjacentElement(position, element) {
        assert.equal(position, "afterend");
        const oldParent = element.parentElement;
        oldParent.children.splice(oldParent.children.indexOf(element), 1);
        element.parentElement = this.parentElement;
        this.parentElement.children.splice(
            this.parentElement.children.indexOf(this) + 1,
            0,
            element,
        );
    }
}

class Input extends Element {
    constructor(value, type = "datetime-local") {
        super();
        this.value = value;
        this.type = type;
        this.checked = false;
    }

    removeAttribute(name) {
        delete this[name];
    }
}

class Form extends Element {}

function createOverlay(values, markup) {
    const form = new Form();
    const outside = new Element();
    const allDayRow = new Element();
    allDayRow.parentElement = outside;
    outside.children.push(allDayRow);
    const inputs = {};
    for (const [name, value] of Object.entries(values)) {
        const field = new Element();
        field.parentElement = form;
        form.children.push(field);
        const input = new Input(value);
        input.parentElement = field;
        inputs[`#form-builder-${name}`] = input;
    }
    const allDay = new Input("", "checkbox");
    allDay.parentElement = allDayRow;
    const participants = new Input("", "text");
    const selectors = {
        ...inputs,
        "#calendar-event-form": form,
        "#calendar-popup-all-day": allDay,
        "#calendar-popup-participant-search": participants,
        "#calendar-popup-update-all": { checked: true },
    };
    for (const selector of [
        "#calendar-event-form",
        "#calendar-popup-all-day",
        "#calendar-popup-participant-search",
    ]) {
        assert.ok(
            markup.includes(`id="${selector.slice(1)}"`),
            `Rendered control missing: ${selector}`,
        );
    }
    return {
        form,
        allDay,
        allDayRow,
        participants,
        inputs,
        querySelector: (selector) => selectors[selector] ?? null,
        querySelectorAll: (selector) => {
            assert.equal(
                selector,
                'input[name="calendar-popup-reminder-offset"]:checked',
            );
            return [{ value: "30" }, { value: "90" }];
        },
    };
}

for (const mode of ["create", "edit"]) {
    test(`${mode} binds the composer, rejects invalid input and saves after a cancelled opening`, async () => {
        const createManager = await loadPopupManager({
            globals: {
                HTMLElement: Element,
                HTMLInputElement: Input,
                HTMLFormElement: Form,
                Event,
            },
        });
        const controller = new AbortController();
        const calendar = { id: "personal", visibility: "private" };
        const values = {
            title: "Planning",
            description: "Notes",
            calendarId: calendar.id,
            startAt: "2026-11-14T09:00",
            endAt: "2026-11-14T10:00",
            status: "free",
            recurrence: "weekly",
        };
        const writes = [];
        const overlays = [];
        let formValid = false;
        let action = "cancel";
        const manager = createManager({
            signal: controller.signal,
            i18n: { t: (key) => key },
            escapeHtml: String,
            calendarUi: {
                createEventComposerBuilder: () => ({
                    render: () => '<form id="calendar-event-form"></form>',
                    attach: (form, options) => {
                        assert.equal(form, overlays.at(-1).form);
                        assert.equal(options.signal, controller.signal);
                        return {
                            validateAll: (showErrors) => {
                                assert.equal(showErrors, true);
                                return formValid;
                            },
                            getValues: () => values,
                        };
                    },
                }),
                createEvent: async (id, payload) => {
                    writes.push({ id, payload });
                    return { ok: true, json: async () => ({ data: {} }) };
                },
                updateEvent: async (id, eventId, payload) => {
                    assert.equal(eventId, "existing");
                    writes.push({ id, payload });
                    return { ok: true };
                },
            },
            getCalendars: () => [calendar],
            getSelectedCalendarId: () => calendar.id,
            getCurrentAccountId: () => "owner",
            getMeetingsAvailable: () => false,
            getCanInviteExternal: () => false,
            getEventsByCalendar: () => ({}),
            normalizeDateTimeInputValue: (value) => value,
            reloadState: async () => {},
            setSelectedCalendarId: (id) => assert.equal(id, calendar.id),
            setSelectedEventId: (id) => assert.equal(id, ""),
            syncRouteSelection: () => {},
            refreshComposer: () => {},
            showToast: () => {},
            openPopup: async (options) => {
                const overlay = createOverlay(values, options.body());
                overlays.push(overlay);
                options.onOpen(overlay);
                assert.equal(overlay.allDayRow.parentElement, overlay.form);
                assert.equal(
                    overlay.allDayRow.previousElementSibling,
                    overlay.inputs["#form-builder-endAt"].parentElement,
                );
                assert.equal(
                    getEventListeners(overlay.form, "input").length,
                    1,
                );
                assert.equal(
                    getEventListeners(overlay.participants, "keydown").length,
                    1,
                );
                if (action === "cancel") {
                    assert.equal(
                        await options.onAction("cancel", overlay),
                        true,
                    );
                    assert.equal(writes.length, 0);
                    return;
                }
                assert.equal(await options.onAction("save", overlay), false);
                assert.equal(writes.length, 0);
                formValid = true;
                overlay.participants.value = "unselected";
                assert.equal(await options.onAction("save", overlay), false);
                assert.equal(writes.length, 0);
                overlay.participants.value = "";
                assert.equal(await options.onAction("save", overlay), true);
            },
        });
        const args =
            mode === "edit"
                ? {
                      eventData: {
                          calendar,
                          event: {
                              ...values,
                              id: "existing",
                              attendees: [],
                              reminderOffsetsMinutes: [30, 90],
                          },
                      },
                  }
                : values;
        await manager.openEventComposerPopup(args);
        action = "save";
        await manager.openEventComposerPopup(args);
        assert.equal(writes.length, 1);
        const { id, payload } = writes[0];
        assert.equal(id, calendar.id);
        assert.equal(payload.title, values.title);
        assert.equal(payload.status, "free");
        assert.equal(payload.recurrence, "weekly");
        assert.equal(payload.startAt, new Date(values.startAt).toISOString());
        assert.equal(payload.endAt, new Date(values.endAt).toISOString());
        assert.deepEqual(Array.from(payload.reminderOffsetsMinutes), [30, 90]);
        if (mode === "edit") assert.equal(payload.updateAll, true);
        controller.abort();
        for (const overlay of overlays) {
            assert.equal(getEventListeners(overlay.form, "input").length, 0);
            assert.equal(getEventListeners(overlay.allDay, "change").length, 0);
            assert.equal(
                getEventListeners(overlay.participants, "keydown").length,
                0,
            );
        }
    });
}
