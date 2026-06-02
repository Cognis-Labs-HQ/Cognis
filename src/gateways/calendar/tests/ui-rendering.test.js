import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../../../..");
const HELPERS_SOURCE = readFileSync(
    resolve(ROOT, "src/gateways/calendar/ui/calendar-ui-helpers.js"),
    "utf8",
);
const APP_SOURCE = readFileSync(
    resolve(ROOT, "src/gateways/calendar/ui/app/index.js"),
    "utf8",
);
const TIMED_GRID_SOURCE = readFileSync(
    resolve(ROOT, "src/gateways/calendar/ui/calendar-timed-grid.js"),
    "utf8",
);
const POPUP_MANAGER_SOURCE = readFileSync(
    resolve(ROOT, "src/gateways/calendar/ui/app/popup-manager.js"),
    "utf8",
);
const POPUP_MANAGER_ALL_DAY_SOURCE = readFileSync(
    resolve(ROOT, "src/gateways/calendar/ui/app/popup-manager-all-day.js"),
    "utf8",
);
const POPUP_MANAGER_CALENDAR_EDIT_SOURCE = readFileSync(
    resolve(
        ROOT,
        "src/gateways/calendar/ui/app/popup-manager-calendar-edit.js",
    ),
    "utf8",
);
const POPUP_MANAGER_RESPONSE_SOURCE = readFileSync(
    resolve(ROOT, "src/gateways/calendar/ui/app/popup-manager-response.js"),
    "utf8",
);
const POPUP_REMINDERS_SOURCE = readFileSync(
    resolve(ROOT, "src/gateways/calendar/ui/app/popup-manager-reminders.js"),
    "utf8",
);
const CSS_SOURCE = readFileSync(
    resolve(ROOT, "src/gateways/calendar/ui/calendar.css"),
    "utf8",
);
const TIMED_GRID_CSS_SOURCE = readFileSync(
    resolve(ROOT, "src/gateways/calendar/ui/calendar-timed-grid.css"),
    "utf8",
);

test("calendar timed views render positioned event cards instead of row spans", () => {
    assert.match(TIMED_GRID_SOURCE, /buildTimedEventLayout/);
    assert.match(TIMED_GRID_SOURCE, /calendar-timed-event-layer/);
    assert.match(TIMED_GRID_SOURCE, /calendar-timed-event-card/);
    assert.match(HELPERS_SOURCE, /calendar-week-day-columns/);
    assert.match(HELPERS_SOURCE, /calendar-day-timed-lane/);
    assert.match(
        TIMED_GRID_CSS_SOURCE,
        /\.calendar-timed-event-card\s*\{[\s\S]*z-index:\s*1;/,
    );
    assert.doesNotMatch(HELPERS_SOURCE, /rowspan="\$\{spanRows\}"/);
});

test("calendar composer keeps title counter without title criteria list", () => {
    assert.match(
        HELPERS_SOURCE,
        /name:\s*"title"[\s\S]*required:\s*true[\s\S]*maxCharacters:\s*120/,
    );
    assert.doesNotMatch(HELPERS_SOURCE, /event-title-required/);
    assert.doesNotMatch(HELPERS_SOURCE, /event-title-max/);
});

test("calendar slot clicks create events outside event buttons and empty slots omit add buttons", () => {
    assert.match(
        APP_SOURCE,
        /event\.target\.closest\(\s*"\[data-calendar-event\], \[data-timeslot-add\]"/,
    );
    assert.doesNotMatch(HELPERS_SOURCE, /data-timeslot-add/);
    assert.match(HELPERS_SOURCE, /calendar-day-all-day-slot/);
    assert.doesNotMatch(
        HELPERS_SOURCE,
        /<table class="calendar-timeslot-table" role="presentation">/,
    );
});

test("calendar conflict warning requires a second save to create anyway", () => {
    assert.match(POPUP_MANAGER_SOURCE, /overlap_warning_confirm/);
    assert.match(POPUP_MANAGER_SOURCE, /confirmedConflictCreateKey/);
    assert.match(POPUP_MANAGER_SOURCE, /allowConflict:/);
    assert.match(POPUP_MANAGER_SOURCE, /created === "conflict"/);
});

test("calendar CSS styles timed event lanes and current week highlights", () => {
    assert.match(CSS_SOURCE, /@import "\.\/calendar-timed-grid\.css";/);
    assert.match(TIMED_GRID_CSS_SOURCE, /\.calendar-timed-event-layer\s*\{/s);
    assert.match(
        TIMED_GRID_CSS_SOURCE,
        /\.calendar-week-day-header--current\s*\{/s,
    );
    assert.match(
        TIMED_GRID_CSS_SOURCE,
        /\.calendar-week-slot--current-time::after\s*\{[\s\S]*z-index:\s*3;/s,
    );
    assert.match(
        TIMED_GRID_CSS_SOURCE,
        /\.calendar-timeslot-events--click-add:hover\s*\{/s,
    );
    assert.match(
        TIMED_GRID_CSS_SOURCE,
        /\.calendar-slot-event-title\s*\{[\s\S]*position:\s*sticky;/s,
    );
    assert.match(
        TIMED_GRID_CSS_SOURCE,
        /\.calendar-slot-event-title\s*\{[\s\S]*inset-block-start:\s*var\(--calendar-title-sticky-offset\);/s,
    );
    assert.match(
        TIMED_GRID_CSS_SOURCE,
        /\.calendar-slot-event-title\s*\{[\s\S]*margin-top:\s*auto;/s,
    );
    assert.match(
        TIMED_GRID_CSS_SOURCE,
        /\.calendar-slot-event-title\s*\{[\s\S]*background:\s*color-mix\([\s\S]*--calendar-title-sticky-stripe-mix/s,
    );
    assert.match(
        TIMED_GRID_CSS_SOURCE,
        /\.calendar-day-view\s*\{[\s\S]*height:\s*100%;/s,
    );
    assert.match(
        TIMED_GRID_CSS_SOURCE,
        /\.calendar-slot-event--compact\s*\{[\s\S]*width:\s*100%;/s,
    );
    assert.match(
        CSS_SOURCE,
        /\.calendar-month-table\s*\{[\s\S]*table-layout:\s*fixed;/s,
    );
});

test("calendar composer supports multiple reminders and remembers selected view", () => {
    assert.match(POPUP_REMINDERS_SOURCE, /REMINDER_OFFSET_OPTIONS/);
    assert.match(
        POPUP_REMINDERS_SOURCE,
        /name="calendar-popup-reminder-offset"/,
    );
    assert.match(POPUP_MANAGER_SOURCE, /reminderOffsetsMinutes/);
    assert.match(APP_SOURCE, /SELECTED_VIEW_STORAGE_KEY/);
    assert.match(APP_SOURCE, /loadSelectedViewPreference/);
    assert.match(APP_SOURCE, /window\.localStorage\.setItem/);
});

test("calendar year view day dots inherit calendar event colors", () => {
    assert.match(HELPERS_SOURCE, /--calendar-day-color:/);
    assert.match(HELPERS_SOURCE, /dayEvents\[0\]\?\.calendarColor/);
    assert.match(
        CSS_SOURCE,
        /var\(--calendar-day-color,\s*var\(--btn-confirm-bg,\s*#1f8ceb\)\)/,
    );
});

test("calendar timed views auto-scroll to the current timeslot", () => {
    assert.match(APP_SOURCE, /scrollTimedViewsToCurrentSlot/);
    assert.match(
        APP_SOURCE,
        /requestAnimationFrame\(scrollTimedViewsToCurrentSlot\)/,
    );
    assert.match(APP_SOURCE, /calendar-week-slot--current-time/);
});

test("calendar toolbar includes pending quick responses and accept calendar picker", () => {
    assert.match(HELPERS_SOURCE, /collectPendingEvents/);
    assert.match(HELPERS_SOURCE, /data-calendar-pending-response/);
    assert.match(APP_SOURCE, /respondToEventSelection/);
    assert.match(POPUP_MANAGER_RESPONSE_SOURCE, /accept_calendar_title/);
    assert.match(POPUP_MANAGER_RESPONSE_SOURCE, /targetCalendarId/);
    assert.match(CSS_SOURCE, /\.calendar-pending-actions\s*\{/s);
    assert.doesNotMatch(
        POPUP_MANAGER_CALENDAR_EDIT_SOURCE,
        /calendar-share-generate/,
    );
});

test("calendar deep-link event popup does not block mount completion", () => {
    assert.match(
        APP_SOURCE,
        /if \(selectedCalendarId && selectedEventId\)\s*\{\s*void openEventPopup\(selectedCalendarId, selectedEventId\);/s,
    );
    assert.doesNotMatch(
        APP_SOURCE,
        /if \(selectedCalendarId && selectedEventId\)\s*\{\s*await openEventPopup\(selectedCalendarId, selectedEventId\);/s,
    );
});

test("calendar all-day toggle morphs datetime inputs to date inputs", () => {
    assert.doesNotMatch(POPUP_MANAGER_SOURCE, /calendar-popup-all-day-range/);
    assert.match(
        POPUP_MANAGER_ALL_DAY_SOURCE,
        /insertAdjacentElement\("afterend", allDayToggleRow\)/,
    );
    assert.match(POPUP_MANAGER_ALL_DAY_SOURCE, /startInput\.type = "date"/);
    assert.match(
        POPUP_MANAGER_ALL_DAY_SOURCE,
        /startInput\.type = "datetime-local"/,
    );
});
