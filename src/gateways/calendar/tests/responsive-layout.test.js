import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { loadTestModule } from "../../../tooling/reuse/test-module.ts";
import { loadPopupManager } from "./fixtures/popup-manager-loader.js";

const { createEventComposerBuilder } = loadTestModule(
    new URL("../ui/event-composer.js", import.meta.url),
    {
        "/static/reuse/form-builder.js": {
            createFormBuilder: (_context, options) => options,
        },
        "/static/reuse/escape-html.js": { escapeHtml: String },
    },
);
const createCalendarPopupManager = await loadPopupManager();
const calendar = {
    id: "personal",
    visibility: "private",
    name: "Personal",
    defaultReminderOffsetsMinutes: [5, 30],
};
const i18n = { t: (key) => key };
const escapeHtml = (value) =>
    String(value)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll('"', "&quot;");

for (const readOnly of [false, true]) {
    test(`responsive form preserves ordered fields, permissions and validation with readOnly=${readOnly}`, () => {
        const options = createEventComposerBuilder({
            i18n,
            readOnly,
            defaultValues: {
                title: "Event",
                description: "Notes",
                startAt: "2026-11-14T09:00",
                endAt: "2026-11-14T10:00",
                status: "free",
                recurrence: "weekly",
            },
            selectedCalendarId: "forbidden",
            calendars: [
                {
                    id: "forbidden",
                    visibility: "shared",
                    sharedPermission: "read",
                },
                calendar,
            ],
        });
        assert.deepEqual(
            Array.from(options.fields, (field) => field.name),
            [
                "title",
                "description",
                "startAt",
                "endAt",
                "status",
                "recurrence",
                "calendarId",
            ],
        );
        assert.equal(options.formClassName, "calendar-event-form-builder");
        assert.equal(options.includeSubmitButton, false);
        assert.deepEqual(
            Array.from(
                options.fields.filter(
                    (field) => field.className === "calendar-event-field--full",
                ),
                (field) => field.name,
            ),
            ["title", "description", "calendarId"],
        );
        assert.ok(options.fields.every((field) => field.disabled === readOnly));
        assert.equal(
            options.fields.find((field) => field.name === "status").value,
            "free",
        );
        assert.equal(
            options.fields.find((field) => field.name === "recurrence").value,
            "weekly",
        );
        const destination = options.fields.find(
            (field) => field.name === "calendarId",
        );
        assert.equal(destination.value, "personal");
        assert.deepEqual(
            Array.from(destination.options, (option) => option.value),
            ["personal"],
        );
        const range = options.fields.find((field) => field.name === "endAt")
            .criteria[0];
        assert.equal(
            range.test("2026-11-14T10:00", { startAt: "2026-11-14T09:00" }),
            true,
        );
        assert.equal(
            range.test("2026-11-14T08:00", { startAt: "2026-11-14T09:00" }),
            false,
        );
        assert.equal(range.test("2026-11-14", { startAt: "2026-11-14" }), true);
    });
}

for (const mode of ["create", "edit"]) {
    test(`${mode} popup uses the wide host contract and retains fields across cancel and reopen`, async () => {
        const popups = [];
        const event = {
            id: "existing",
            title: "Event",
            attendees: [],
            startAt: "2026-11-14T00:00",
            endAt: "2026-11-15T00:00",
            recurrence: "weekly",
            reminderOffsetsMinutes: [90],
        };
        const manager = createCalendarPopupManager({
            i18n,
            escapeHtml,
            calendarUi: {
                createEventComposerBuilder: () => ({
                    render: () => '<form id="calendar-event-form"></form>',
                }),
            },
            getCalendars: () => [calendar],
            getSelectedCalendarId: () => calendar.id,
            getCurrentAccountId: () => "owner",
            getMeetingsAvailable: () => true,
            normalizeDateTimeInputValue: (value) => value,
            openPopup: async (options) => {
                const markup = options.body();
                popups.push(markup);
                assert.equal(options.maxWidth, "56rem");
                assert.equal(options.closeProtection, true);
                assert.deepEqual(
                    Array.from(options.actions, (action) => action.id),
                    ["save", "cancel"],
                );
                assert.match(markup, /class="calendar-event-composer"/);
                assert.match(markup, /<form id="calendar-event-form">/);
                assert.match(markup, /for="calendar-popup-participant-search"/);
                assert.match(markup, /id="calendar-popup-participant-options"/);
                assert.match(markup, /id="calendar-popup-participant-chips"/);
                assert.match(markup, /id="calendar-popup-reminder-offsets"/);
                if (mode === "edit") {
                    assert.match(
                        markup,
                        /id="calendar-popup-all-day" type="checkbox" checked/,
                    );
                    assert.match(markup, /id="calendar-popup-update-all"/);
                    assert.match(markup, /value="90" checked/);
                    assert.doesNotMatch(
                        markup,
                        /id="calendar-popup-create-meeting"/,
                    );
                } else {
                    assert.match(markup, /id="calendar-popup-create-meeting"/);
                    assert.match(markup, /value="5" checked/);
                    assert.match(markup, /value="30" checked/);
                }
                assert.equal(await options.onAction("cancel"), true);
                assert.equal(await options.onAction(null), true);
                assert.equal(await options.onAction("save"), false);
            },
        });
        for (let index = 0; index < 3; index += 1) {
            await manager.openEventComposerPopup(
                mode === "edit"
                    ? { eventData: { calendar, event } }
                    : undefined,
            );
        }
        assert.equal(popups.length, 3);
        assert.ok(popups.every((markup) => markup === popups[0]));
    });
}

function stylesheet(name) {
    return readFileSync(new URL(`../ui/${name}.css`, import.meta.url), "utf8");
}

function declarations(source, selector) {
    const start = source.indexOf(`${selector} {`);
    assert.notEqual(start, -1, `Missing selector: ${selector}`);
    return source.slice(start, source.indexOf("}", start));
}

test("Calendar CSS keeps compact and pending declarations at the scoped event specificity", () => {
    const timed = stylesheet("calendar-timed-grid");
    const details = stylesheet("calendar-event-details");
    const status = stylesheet("calendar-status");
    const compact = declarations(
        timed,
        ".calendar-view-canvas .calendar-slot-event--compact",
    );
    assert.match(compact, /padding: 0\.22rem 0\.38rem;/);
    assert.match(compact, /border-radius: 8px;/);
    assert.match(compact, /justify-items: stretch;/);
    const pending = declarations(
        details,
        ".calendar-view-canvas .calendar-slot-event--pending",
    );
    assert.match(pending, /--calendar-pending-opacity: 0\.55;/);
    assert.match(
        pending,
        /--calendar-pending-background: repeating-linear-gradient/,
    );
    assert.match(pending, /border-style: dashed;/);
    assert.match(
        status,
        /var\(\s*--calendar-pending-background,[\s\S]*var\(--calendar-status-background, transparent\) !important;/,
    );
    assert.match(
        status,
        /opacity: var\(--calendar-pending-opacity, var\(--calendar-status-opacity, 1\)\);/,
    );
    assert.match(status, /--calendar-status-background: transparent;/);
    assert.match(status, /--calendar-status-background: color-mix/);
    assert.match(
        status,
        /--calendar-status-background:\s*repeating-linear-gradient/,
    );
});

test("Calendar sizing contracts share day heights and wrap actual header and form space", () => {
    const timed = stylesheet("calendar-timed-grid");
    assert.match(
        declarations(timed, ".calendar-day-view"),
        /--calendar-day-slot-height: 2\.8rem;/,
    );
    for (const selector of [
        ".calendar-day-all-day-label",
        ".calendar-day-all-day-row .calendar-day-all-day-slot",
    ]) {
        assert.match(
            declarations(timed, selector),
            /min-height: var\(--calendar-day-slot-height\);/,
        );
    }
    assert.match(
        declarations(timed, ".calendar-week-view"),
        /container: calendar-week \/ inline-size;/,
    );
    assert.match(
        declarations(timed, ".calendar-week-day-header"),
        /flex-wrap: wrap;/,
    );
    assert.match(timed, /overflow-wrap: anywhere;\s*white-space: normal;/);
    assert.match(timed, /@container calendar-week \(max-width: 700px\)/);
    const composer = stylesheet("event-composer");
    assert.match(
        composer,
        /repeat\(auto-fit, minmax\(min\(100%, 18rem\), 1fr\)\)/,
    );
    assert.match(
        declarations(
            composer,
            ".calendar-event-form-builder .calendar-all-day-toggle",
        ),
        /grid-column: 1 \/ -1;/,
    );
    assert.match(
        composer,
        /min-width: 0;[\s\S]*max-width: 100%;[\s\S]*overflow-wrap: anywhere;/,
    );
});
