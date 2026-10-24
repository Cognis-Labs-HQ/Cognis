import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../../../..");
const HELPERS_SOURCE = ["calendar-ui-helpers.js", "event-composer.js"]
    .map((fileName) =>
        readFileSync(
            resolve(ROOT, `src/gateways/calendar/ui/${fileName}`),
            "utf8",
        ),
    )
    .join("\n");
const EVENT_COMPOSER_SOURCE = readFileSync(
    resolve(ROOT, "src/gateways/calendar/ui/event-composer.js"),
    "utf8",
);
const PENDING_RENDER_SOURCE = readFileSync(
    resolve(ROOT, "src/gateways/calendar/ui/calendar-pending-render.js"),
    "utf8",
);
const APP_SOURCE = readFileSync(
    resolve(ROOT, "src/gateways/calendar/ui/app/index.js"),
    "utf8",
);
const CALENDAR_API_SOURCE = readFileSync(
    resolve(ROOT, "src/gateways/calendar/ui/calendar-api.js"),
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
const BIND_VIEW_INTERACTIONS_SOURCE = readFileSync(
    resolve(ROOT, "src/gateways/calendar/ui/app/bind-view-interactions.js"),
    "utf8",
);
const SUBMIT_EVENT_SOURCE = readFileSync(
    resolve(ROOT, "src/gateways/calendar/ui/app/submit-event.js"),
    "utf8",
);
const POPUP_MANAGER_ALL_DAY_SOURCE = readFileSync(
    resolve(ROOT, "src/gateways/calendar/ui/app/popup-manager-all-day.js"),
    "utf8",
);
const POPUP_MANAGER_PARTICIPANT_UTILS_SOURCE = readFileSync(
    resolve(
        ROOT,
        "src/gateways/calendar/ui/app/popup-manager-participant-utils.js",
    ),
    "utf8",
);
const POPUP_MANAGER_READ_ONLY_SOURCE = readFileSync(
    resolve(
        ROOT,
        "src/gateways/calendar/ui/app/popup-manager-read-only-render.js",
    ),
    "utf8",
);
const POPUP_MANAGER_CALENDAR_EDIT_SOURCE = readFileSync(
    resolve(
        ROOT,
        "src/gateways/calendar/ui/app/popup-manager-calendar-edit.js",
    ),
    "utf8",
);
const SHARE_RENDERER_SOURCE = readFileSync(
    resolve(ROOT, "src/gateways/calendar/ui/share-renderer.js"),
    "utf8",
);
const SHARE_RENDERER_CSS_SOURCE = readFileSync(
    resolve(ROOT, "src/gateways/calendar/ui/share-renderer.css"),
    "utf8",
);
const BOOTSTRAP_SOURCE = readFileSync(
    resolve(ROOT, "src/gateways/calendar/bootstrap/index.ts"),
    "utf8",
);
const POPUP_MANAGER_RESPONSE_SOURCE = readFileSync(
    resolve(ROOT, "src/gateways/calendar/ui/app/popup-manager-response.js"),
    "utf8",
);
const BOOTSTRAP_HELPERS_SOURCE = readFileSync(
    resolve(ROOT, "src/gateways/calendar/bootstrap/helpers.ts"),
    "utf8",
);
const CALENDAR_ROUTES_SOURCE = readFileSync(
    resolve(ROOT, "src/gateways/calendar/bootstrap/calendar-routes.ts"),
    "utf8",
);

test("calendar event composer imports its HTML escaping dependency", () => {
    assert.match(
        EVENT_COMPOSER_SOURCE,
        /import \{ escapeHtml \} from "\/static\/reuse\/escape-html\.js";/,
    );
    assert.match(EVENT_COMPOSER_SOURCE, /createFormBuilder\([\s\S]*escapeHtml/);
});
const SHARED_PASSWORD_SOURCE = readFileSync(
    resolve(ROOT, "src/gateways/calendar/bootstrap/shared-password.ts"),
    "utf8",
);
const POPUP_MANAGER_PENDING_RESPONSE_SOURCE = readFileSync(
    resolve(
        ROOT,
        "src/gateways/calendar/ui/app/popup-manager-pending-response.js",
    ),
    "utf8",
);
const POPUP_REMINDERS_SOURCE = readFileSync(
    resolve(ROOT, "src/gateways/calendar/ui/app/popup-manager-reminders.js"),
    "utf8",
);
const CSS_SOURCE = ["calendar.css", "calendar-event-details.css"]
    .map((fileName) =>
        readFileSync(
            resolve(ROOT, `src/gateways/calendar/ui/${fileName}`),
            "utf8",
        ),
    )
    .join("\n");
const TIMED_GRID_CSS_SOURCE = readFileSync(
    resolve(ROOT, "src/gateways/calendar/ui/calendar-timed-grid.css"),
    "utf8",
);
const STATUS_CSS_SOURCE = readFileSync(
    resolve(ROOT, "src/gateways/calendar/ui/calendar-status.css"),
    "utf8",
);
const DASHBOARD_SOURCE = readFileSync(
    resolve(ROOT, "src/ui/app/dashboard/index.js"),
    "utf8",
);
const SHARE_REMINDER_CSS_SOURCE = readFileSync(
    resolve(ROOT, "src/gateways/calendar/ui/calendar-share-reminder.css"),
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
        /event\.target\.closest\("\[data-calendar-event\]"\)/,
    );
    assert.match(
        APP_SOURCE,
        /event\.target\.closest\(\s*"\[data-timeslot-add\]"/,
    );
    assert.doesNotMatch(HELPERS_SOURCE, /data-timeslot-add/);
    assert.match(HELPERS_SOURCE, /calendar-day-all-day-slot/);
    assert.doesNotMatch(
        HELPERS_SOURCE,
        /<table class="calendar-timeslot-table" role="presentation">/,
    );
});

test("calendar conflict warning requires a second save to create anyway", () => {
    assert.match(SUBMIT_EVENT_SOURCE, /overlap_warning_confirm/);
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
        /\.calendar-view-canvas\s+\.calendar-slot-event\s*\{[\s\S]*background:\s*color-mix\(/s,
    );
    assert.doesNotMatch(
        TIMED_GRID_CSS_SOURCE,
        /(?:^|\n)\.calendar-slot-event\s*\{[\s\S]*background:\s*color-mix\(/s,
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
        /\.calendar-slot-event-title\s*\{[\s\S]*background:\s*var\(--surface/s,
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

test("event status backgrounds cover calendar cards and dashboard summaries", () => {
    assert.match(CALENDAR_API_SOURCE, /calendarEventStatusClasses/);
    assert.match(
        CALENDAR_API_SOURCE,
        /loadCalendarEventStatusStyles[\s\S]*\/static\/gateways\/calendar\/ui\/calendar-status\.css/,
    );
    assert.doesNotMatch(
        CALENDAR_API_SOURCE,
        /const statusStylesheet = document\.createElement/,
    );
    assert.match(CSS_SOURCE, /@import "\.\/calendar-status\.css";/);
    assert.match(
        HELPERS_SOURCE,
        /calendar-slot-event \$\{calendarEventStatusClasses\(event\.status\)\}/,
    );
    assert.match(
        HELPERS_SOURCE,
        /calendar-upcoming-button \$\{calendarEventStatusClasses\(event\.status\)\}/,
    );
    assert.match(
        PENDING_RENDER_SOURCE,
        /calendar-upcoming-button \$\{calendarEventStatusClasses\(event\.status\)\}/,
    );
    assert.match(
        DASHBOARD_SOURCE,
        /calendarEvents\?\.eventStatusClasses\(event\.status\)/,
    );
    assert.match(
        DASHBOARD_SOURCE,
        /calendarEvents\?\.loadEventStatusStyles\(\)/,
    );
    for (const status of ["busy", "free", "tentative"]) {
        assert.match(
            STATUS_CSS_SOURCE,
            new RegExp(`calendar-event-status--${status}`),
        );
    }
    assert.match(
        STATUS_CSS_SOURCE,
        /calendar-view-canvas \.calendar-event-status--free,[\s\S]*background:\s*transparent !important;/,
    );
    assert.match(
        STATUS_CSS_SOURCE,
        /calendar-view-canvas \.calendar-event-status--tentative,[\s\S]*repeating-linear-gradient\(/,
    );
    assert.doesNotMatch(STATUS_CSS_SOURCE, /border-style:\s*dashed/);
    for (const status of ["busy", "free", "tentative"]) {
        assert.match(
            STATUS_CSS_SOURCE,
            new RegExp(
                `app-shell \\.calendar-view-canvas \\.calendar-event-status--${status}:hover`,
            ),
        );
    }
    for (const status of ["busy", "free", "tentative"]) {
        assert.match(
            STATUS_CSS_SOURCE,
            new RegExp(
                `calendar-upcoming-button\\.calendar-event-status--${status}:hover`,
            ),
        );
    }
    assert.match(
        STATUS_CSS_SOURCE,
        /calendar-events-list \.calendar-upcoming-item\s*\{[\s\S]*padding:\s*0;[\s\S]*border:\s*0;[\s\S]*background:\s*transparent;/,
    );
    assert.match(
        STATUS_CSS_SOURCE,
        /calendar-upcoming-button\.calendar-event-status\s*\{[\s\S]*border-radius:\s*10px;/,
    );
    assert.match(
        STATUS_CSS_SOURCE,
        /calendar-slot-event\.calendar-event-status:hover\s*\{[\s\S]*border-color:[\s\S]*field-border[\s\S]*border-left-color:[\s\S]*75%[\s\S]*transform:\s*none;/,
    );
    assert.match(
        STATUS_CSS_SOURCE,
        /calendar-upcoming-button\.calendar-event-status:hover\s*\{[\s\S]*border-color:\s*var\(--field-border\)[\s\S]*border-left-color:[\s\S]*75%[\s\S]*transform:\s*none;/,
    );
});

test("successful event updates refresh availability through ui ctx", () => {
    assert.match(
        CALENDAR_API_SOURCE,
        /refreshUserAvailability[\s\S]*ui:availabilityRenderer[\s\S]*\.refresh\?\.\(document\)/,
    );
    assert.match(
        CALENDAR_API_SOURCE,
        /async function updateEvent[\s\S]*response\.ok[\s\S]*await refreshUserAvailability\(\)/,
    );
});

test("active event creation and event boundaries refresh availability", () => {
    assert.match(
        CALENDAR_API_SOURCE,
        /async function createEvent[\s\S]*Date\.parse\(payload\.startAt\) <= now[\s\S]*Date\.parse\(payload\.endAt\) > now[\s\S]*await refreshUserAvailability\(\)/,
    );
    assert.match(
        APP_SOURCE,
        /scheduleAvailabilityBoundaryRefresh[\s\S]*event\.startAt[\s\S]*event\.endAt[\s\S]*calendarUi\.refreshUserAvailability\(\)/,
    );
    assert.match(
        APP_SOURCE,
        /signal\?\.addEventListener\([\s\S]*"abort"[\s\S]*clearTimeout\(availabilityBoundaryTimer\)/,
    );
});

test("calendar upcoming events moved to toolbar", () => {
    assert.match(APP_SOURCE, /id:\s*"upcoming-events"/);
    assert.match(APP_SOURCE, /renderToolbarSummary[\s\S]*allUpcomingEvents/);
    assert.doesNotMatch(
        APP_SOURCE,
        /id:\s*"upcoming-events"[\s\S]*gridSize:\s*\{\s*default:\s*\[12,\s*4\]/,
    );
});

test("calendar composer supports multiple reminders and remembers selected view", () => {
    assert.match(POPUP_REMINDERS_SOURCE, /REMINDER_OFFSET_OPTIONS/);
    assert.match(
        POPUP_REMINDERS_SOURCE,
        /name="calendar-popup-reminder-offset"/,
    );
    assert.doesNotMatch(POPUP_REMINDERS_SOURCE, /calendar-popup-reminder-menu/);
    assert.match(POPUP_REMINDERS_SOURCE, /calendar-reminder-option-check/);
    assert.match(
        POPUP_REMINDERS_SOURCE,
        /gateway\.calendar\.reminders_default_tooltip/,
    );
    assert.match(POPUP_MANAGER_SOURCE, /reminderOffsetsMinutes/);
    assert.match(APP_SOURCE, /SELECTED_VIEW_STORAGE_KEY/);
    assert.match(APP_SOURCE, /loadSelectedViewPreference/);
    assert.match(APP_SOURCE, /window\.localStorage\.setItem/);
});

test("calendar navigation and event creation use a persistent delegated boundary", () => {
    assert.match(APP_SOURCE, /root\.addEventListener\(/);
    assert.match(
        APP_SOURCE,
        /event\.target\.closest\("\[data-calendar-view\]"\)/,
    );
    assert.match(APP_SOURCE, /"\[data-calendar-nav\]"/);
    assert.match(APP_SOURCE, /"\[data-timeslot-add\]"/);
    assert.match(APP_SOURCE, /void openEventComposerPopup/);
});

test("event composer refuses to open without a writable calendar", () => {
    assert.match(
        POPUP_MANAGER_SOURCE,
        /const writableCalendars = getCalendars\(\)\.filter/,
    );
    assert.match(
        POPUP_MANAGER_SOURCE,
        /writableCalendars\.length === 0[\s\S]*no_writable_calendars_found[\s\S]*return/,
    );
    assert.match(POPUP_MANAGER_SOURCE, /calendars: writableCalendars/);
});

test("calendar year view day dots inherit calendar event colors", () => {
    assert.match(HELPERS_SOURCE, /--calendar-day-color:/);
    assert.match(HELPERS_SOURCE, /collectDayPaletteColors/);
    assert.match(HELPERS_SOURCE, /--calendar-day-background:/);
    assert.match(HELPERS_SOURCE, /conic-gradient/);
    assert.match(
        CSS_SOURCE,
        /\.calendar-view-canvas\s+\.calendar-year-day-dot\s*\{[\s\S]*background:\s*var\(\s*--calendar-day-background,/s,
    );
    assert.doesNotMatch(
        CSS_SOURCE,
        /(?:^|\n)\.calendar-year-day-dot\s*\{[\s\S]*background:\s*var\(\s*--calendar-day-background,/s,
    );
    assert.match(
        CSS_SOURCE,
        /var\(--calendar-day-color,\s*var\(--btn-confirm-bg,\s*#1f8ceb\)\)/,
    );
    assert.match(
        CSS_SOURCE,
        /background:\s*var\(\s*--calendar-day-background,/s,
    );
});

test("calendar mobile headers render compactly on narrow viewports", () => {
    assert.match(
        CSS_SOURCE,
        /@media \(max-width:\s*700px\)[\s\S]*\.calendar-week-day-header\s*\{[\s\S]*flex-direction:\s*column;/s,
    );
    assert.match(
        CSS_SOURCE,
        /@media \(max-width:\s*700px\)[\s\S]*\.calendar-month-header-day\s*\{[\s\S]*font-size:\s*0\.68rem;/s,
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

test("calendar toolbar includes pending quick responses with shared-calendar target exemption", () => {
    assert.match(HELPERS_SOURCE, /collectPendingEvents/);
    assert.match(HELPERS_SOURCE, /const dedupedByRoot = new Map\(\);/);
    assert.match(PENDING_RENDER_SOURCE, /data-calendar-pending-response/);
    assert.match(PENDING_RENDER_SOURCE, /btn-animated calendar-pending-action/);
    assert.match(PENDING_RENDER_SOURCE, /btn-confirm/);
    assert.match(PENDING_RENDER_SOURCE, /btn-cancel/);
    assert.match(PENDING_RENDER_SOURCE, /popup-action-btn--neutral/);
    assert.match(POPUP_MANAGER_SOURCE, /respondToEventSelection/);
    assert.match(POPUP_MANAGER_SOURCE, /handlePendingResponseClick/);
    assert.match(
        BIND_VIEW_INTERACTIONS_SOURCE,
        /handlePendingResponseClick\([\s\S]*reloadState/,
    );
    assert.match(POPUP_MANAGER_SOURCE, /popup-manager-pending-response/);
    assert.match(
        POPUP_MANAGER_PENDING_RESPONSE_SOURCE,
        /calendar-upcoming-item.*remove/s,
    );
    assert.match(
        POPUP_MANAGER_PENDING_RESPONSE_SOURCE,
        /if \(!success\)[\s\S]*reloadState/s,
    );
    assert.match(
        POPUP_MANAGER_PENDING_RESPONSE_SOURCE,
        /\.catch\(\(\) => \{[\s\S]*reloadState/s,
    );
    assert.match(
        POPUP_MANAGER_RESPONSE_SOURCE,
        /calendar\?\.visibility === "shared"/,
    );
    assert.match(
        POPUP_MANAGER_RESPONSE_SOURCE,
        /calendar-response-target-calendar/,
    );
    assert.match(
        POPUP_MANAGER_RESPONSE_SOURCE,
        /gateway\.calendar\.accept_calendar_title/,
    );
    assert.match(POPUP_MANAGER_RESPONSE_SOURCE, /targetCalendarId/);
    assert.match(POPUP_MANAGER_RESPONSE_SOURCE, /getSelectedCalendarId/);
    assert.match(CSS_SOURCE, /\.calendar-pending-actions\s*\{/s);
    assert.match(
        CSS_SOURCE,
        /\.calendar-response-calendar-picker select\s*\{/s,
    );
    assert.match(POPUP_MANAGER_CALENDAR_EDIT_SOURCE, /openSharePopup/);
    assert.match(
        POPUP_MANAGER_CALENDAR_EDIT_SOURCE,
        /resourceType: "calendar"/,
    );
    assert.match(
        POPUP_MANAGER_CALENDAR_EDIT_SOURCE,
        /passwordRequired: calendar\.visibility === "private"/,
    );
    assert.match(POPUP_MANAGER_CALENDAR_EDIT_SOURCE, /linkAccessOptions: \[/);
    assert.match(
        POPUP_MANAGER_CALENDAR_EDIT_SOURCE,
        /grantedCapabilities: \["calendar:read"\]/,
    );
    assert.match(
        POPUP_MANAGER_CALENDAR_EDIT_SOURCE,
        /calendar-open-share-popup/,
    );
    assert.match(
        POPUP_MANAGER_CALENDAR_EDIT_SOURCE,
        /gateway\.calendar\.share_users_heading/,
    );
    assert.doesNotMatch(
        POPUP_MANAGER_CALENDAR_EDIT_SOURCE,
        /\/api\/v1\/calendar\/calendars\/.*\/share/,
    );
    assert.match(
        POPUP_MANAGER_CALENDAR_EDIT_SOURCE,
        /const name = calendar\.isDefault\s*\?\s*undefined/,
    );
});

test("calendar main view and summaries aggregate events across calendars", () => {
    assert.match(
        APP_SOURCE,
        /function allCalendarEvents\(\)\s*\{[\s\S]*Object\.entries\(eventsByCalendar\)[\s\S]*\.sort\(\(left, right\) => left\.startAt\.localeCompare\(right\.startAt\)\);/s,
    );
    assert.doesNotMatch(
        APP_SOURCE,
        /function allCalendarEvents\(\)\s*\{[\s\S]*event\.calendarId === selectedCalendarId[\s\S]*\}/s,
    );
    assert.match(
        APP_SOURCE,
        /function allUpcomingEvents\(\)\s*\{[\s\S]*collectUpcomingEvents\(\s*eventsByCalendar,\s*calendars,\s*"",\s*currentAccountId,/s,
    );
    assert.match(
        APP_SOURCE,
        /function allPendingEvents\(\)\s*\{[\s\S]*collectPendingEvents\(\s*eventsByCalendar,\s*calendars,\s*"",\s*currentAccountId,\s*pendingInvitations,\s*\);/s,
    );
});

test("calendar app reads jitsi availability from calendar metadata", () => {
    assert.match(APP_SOURCE, /calendarState\.meta\?\.jitsiAvailable/);
    assert.doesNotMatch(APP_SOURCE, /probeJitsiAvailability/);
});

test("calendar toolbar shows shared visibility icon", () => {
    assert.match(
        HELPERS_SOURCE,
        /visibility === "shared" && sharedPermission === "read"/,
    );
    assert.match(HELPERS_SOURCE, /calendar-visibility-icon--read-only/);
    assert.match(HELPERS_SOURCE, /read_only_tooltip/);
    assert.match(HELPERS_SOURCE, /calendar-visibility-icon--private/);
    assert.match(HELPERS_SOURCE, /visibility_private/);
    assert.match(CSS_SOURCE, /view-eye-light\.svg/);
    assert.match(CSS_SOURCE, /view-eye-dark\.svg/);
    assert.match(CSS_SOURCE, /secure-light\.svg/);
    assert.match(CSS_SOURCE, /secure-dark\.svg/);
    assert.match(HELPERS_SOURCE, /calendar-visibility-icon--shared/);
    assert.match(CSS_SOURCE, /share-light\.svg/);
    assert.match(CSS_SOURCE, /share-dark\.svg/);
    assert.doesNotMatch(HELPERS_SOURCE, /🤝/);
});

test("calendar toolbar uses a larger localized new-calendar action", () => {
    assert.match(APP_SOURCE, /gateway\.calendar\.new_calendar_short/);
    assert.match(CSS_SOURCE, /\.calendar-toolbar-add[\s\S]*height:\s*2\.25rem/);
    assert.match(
        CSS_SOURCE,
        /\.calendar-toolbar-add[\s\S]*padding:\s*0 0\.65rem/,
    );
});

test("event composer excludes read-only shared calendars", () => {
    assert.match(
        HELPERS_SOURCE,
        /calendar\?\.visibility !== "shared"[\s\S]*calendar\?\.sharedPermission === "write"/,
    );
    assert.match(HELPERS_SOURCE, /selectedWritableCalendarId/);
});

test("calendar deep-link event popup does not block mount completion", () => {
    assert.match(
        APP_SOURCE,
        /if \(routeCalendarId && routeEventId\)\s*\{\s*void openEventPopup\(routeCalendarId, routeEventId\);/s,
    );
    assert.doesNotMatch(
        APP_SOURCE,
        /if \(routeCalendarId && routeEventId\)\s*\{\s*await openEventPopup\(routeCalendarId, routeEventId\);/s,
    );
});

test("calendar event popup polls participant response updates", () => {
    assert.match(POPUP_MANAGER_SOURCE, /window\.setInterval\(async \(\) => \{/);
    assert.match(
        POPUP_MANAGER_SOURCE,
        /calendarUi\.fetchEvent\(calendarId, eventId\)/,
    );
    assert.match(
        POPUP_MANAGER_SOURCE,
        /popupBody\.innerHTML = renderEventPopupBody\(\);/,
    );
    assert.match(
        POPUP_MANAGER_SOURCE,
        /window\.clearInterval\(responsePoll\);/,
    );
    assert.match(POPUP_MANAGER_SOURCE, /\}, 60000\);/);
});

test("calendar participant remove control is a visible cancel action link", () => {
    assert.match(
        POPUP_MANAGER_PARTICIPANT_UTILS_SOURCE,
        /<a href="#" role="button" class="calendar-participant-card-remove btn-cancel"/,
    );
    assert.match(POPUP_MANAGER_SOURCE, /event\.preventDefault\(\);/);
});

test("calendar event popup combines participants and responses", () => {
    assert.match(
        POPUP_MANAGER_READ_ONLY_SOURCE,
        /const participantIds = Array\.from\([\s\S]*Object\.keys\(eventData\.event\.responses \?\? \{\}\)/s,
    );
    assert.match(
        POPUP_MANAGER_READ_ONLY_SOURCE,
        /calendar-participant-response \$\{responseClass\}/,
    );
    assert.match(POPUP_MANAGER_READ_ONLY_SOURCE, /accepted: "btn-confirm"/);
    assert.match(POPUP_MANAGER_READ_ONLY_SOURCE, /declined: "btn-cancel"/);
    assert.doesNotMatch(
        POPUP_MANAGER_READ_ONLY_SOURCE,
        /gateway\.calendar\.responses_title/,
    );
});

test("calendar all-day toggle morphs datetime inputs to date inputs", () => {
    assert.doesNotMatch(POPUP_MANAGER_SOURCE, /calendar-popup-all-day-range/);
    assert.match(
        POPUP_MANAGER_ALL_DAY_SOURCE,
        /insertAdjacentElement\("afterend", allDayToggleRow\)/,
    );
    assert.match(
        POPUP_MANAGER_ALL_DAY_SOURCE,
        /startInput\.value = "";[\s\S]*startInput\.type = "date"/,
    );
    assert.match(
        POPUP_MANAGER_ALL_DAY_SOURCE,
        /endInput\.value = "";[\s\S]*endInput\.type = "date"/,
    );
    assert.match(
        POPUP_MANAGER_ALL_DAY_SOURCE,
        /startInput\.type = "datetime-local"/,
    );
});

test("calendar participant picker renders user cards and excludes current user", () => {
    assert.match(POPUP_MANAGER_SOURCE, /buildParticipantOptionHtml/);
    assert.match(POPUP_MANAGER_SOURCE, /getCurrentAccountId/);
    assert.match(
        POPUP_MANAGER_SOURCE,
        /userIdentifier === currentUserIdentifier/,
    );
    assert.doesNotMatch(
        POPUP_MANAGER_PARTICIPANT_UTILS_SOURCE,
        /href="\/profile\//,
    );
    assert.match(
        POPUP_MANAGER_PARTICIPANT_UTILS_SOURCE,
        /<div class="calendar-participant-card-profile">/,
    );
});

test("calendar read-only all-day details keep start and end date fields", () => {
    assert.match(POPUP_MANAGER_READ_ONLY_SOURCE, /formatDate/);
    assert.match(
        POPUP_MANAGER_READ_ONLY_SOURCE,
        /gateway\.calendar\.event_start/,
    );
    assert.match(
        POPUP_MANAGER_READ_ONLY_SOURCE,
        /gateway\.calendar\.event_end/,
    );
});

test("calendar upcoming and pending event helpers exclude past events via endAt filter", () => {
    assert.match(
        HELPERS_SOURCE,
        /function collectUpcomingEvents[\s\S]*\.filter\(\(event\) => new Date\(event\.endAt\)\.getTime\(\) >= Date\.now\(\)\)/s,
    );
    assert.match(
        HELPERS_SOURCE,
        /function collectPendingEvents[\s\S]*\.filter\(\(event\) => new Date\(event\.endAt\)\.getTime\(\) >= Date\.now\(\)\)/s,
    );
});

test("shared events stay visible in Upcoming and calendar layout is fixed", () => {
    assert.match(
        HELPERS_SOURCE,
        /event\.calendarVisibility === "shared"\) return true/,
    );
    assert.match(APP_SOURCE, /allowCustomization:\s*false/);
    assert.match(
        CSS_SOURCE,
        /\.calendar-toolbar-heading h3\s*\{[\s\S]*text-align:\s*center/,
    );
    assert.match(
        CSS_SOURCE,
        /\.calendar-toolbar-heading\s*\{[\s\S]*grid-template-columns:\s*minmax\(0, 1fr\) auto/,
    );
    assert.doesNotMatch(
        CSS_SOURCE,
        /\.toolbar \.calendar-toolbar-add\s*\{[^}]*position:\s*absolute/,
    );
    assert.match(
        CSS_SOURCE,
        /\.calendar-toolbar-subsection h4\s*\{[\s\S]*text-align:\s*center/,
    );
});

test("calendar link guests can inspect events and writable guests can open empty slots", () => {
    assert.match(
        SHARE_RENDERER_SOURCE,
        /canWrite\s*\? "\[data-calendar-event\], \[data-timeslot-add\]"\s*:\s*"\[data-calendar-event\]"/,
    );
    assert.match(SHARE_RENDERER_SOURCE, /if \(!canWrite\)/);
    assert.match(
        SHARE_RENDERER_SOURCE,
        /querySelectorAll\("input, textarea, select"\)/,
    );
    assert.match(SHARE_RENDERER_SOURCE, /id:\s*"close"/);
});

test("calendar share renderer displays one calendar and enables scoped writes", () => {
    assert.match(SHARE_RENDERER_SOURCE, /export async function mount/);
    assert.match(SHARE_RENDERER_SOURCE, /createPageComposer/);
    assert.match(SHARE_RENDERER_SOURCE, /await composer\.init\(\)/);
    assert.match(SHARE_RENDERER_SOURCE, /requireAccountSession:\s*false/);
    assert.match(SHARE_RENDERER_SOURCE, /enableAccountEnhancements:\s*false/);
    assert.match(SHARE_RENDERER_SOURCE, /enableDomParking:\s*false/);
    assert.match(SHARE_RENDERER_SOURCE, /showNavbar:\s*false/);
    assert.match(SHARE_RENDERER_SOURCE, /function renderCalendar\(\)/);
    assert.match(
        SHARE_RENDERER_SOURCE,
        /querySelector\("\.calendar-view-canvas"\)[\s\S]*canvas\.innerHTML = renderCalendarView/,
    );
    assert.match(SHARE_RENDERER_SOURCE, /button\.classList\.toggle/);
    assert.match(SHARE_RENDERER_SOURCE, /renderCalendarView/);
    assert.match(SHARE_RENDERER_SOURCE, /let selectedView = "month"/);
    assert.match(
        SHARE_RENDERER_SOURCE,
        /root\.addEventListener\([\s\S]*data-shared-calendar-id[\s\S]*data-calendar-view[\s\S]*data-calendar-nav/,
    );
    assert.match(SHARE_RENDERER_SOURCE, /CALENDAR_VIEWS/);
    assert.match(SHARE_RENDERER_SOURCE, /calendar-view-switcher/);
    assert.match(SHARE_RENDERER_SOURCE, /data-calendar-nav/);
    assert.match(SHARE_RENDERER_SOURCE, /shiftActiveDate/);
    assert.match(SHARE_RENDERER_SOURCE, /scrollTimedViewsToCurrentSlot/);
    assert.match(SHARE_RENDERER_SOURCE, /requestAnimationFrame/);
    assert.match(SHARE_RENDERER_SOURCE, /\{ signal \}/);
    assert.match(SHARE_RENDERER_SOURCE, /CALENDAR_VIEWS\.includes/);
    assert.match(SHARE_RENDERER_SOURCE, /data-timeslot-add/);
    assert.match(SHARE_RENDERER_SOURCE, /calendar:write/);
    assert.match(SHARE_RENDERER_SOURCE, /\/api\/v1\/calendar\/shared\//);
    assert.match(SHARE_RENDERER_SOURCE, /shared-calendar-event-form/);
    assert.match(SHARE_RENDERER_SOURCE, /guestAccessToken/);
    assert.match(SHARE_RENDERER_SOURCE, /authorization: `Bearer/);
    assert.doesNotMatch(SHARE_RENDERER_SOURCE, /apiFetch/);
    assert.match(
        BOOTSTRAP_SOURCE,
        /mountScriptUrl:\s*"\/static\/gateways\/calendar\/ui\/share-renderer\.js"/,
    );
    assert.doesNotMatch(BOOTSTRAP_SOURCE, /preserveShareShell/);
    assert.match(BOOTSTRAP_SOURCE, /share-renderer\.css/);
    assert.match(BOOTSTRAP_SOURCE, /calendar\.css/);
    assert.match(BOOTSTRAP_SOURCE, /share_import_success/);
    assert.match(
        SHARE_RENDERER_CSS_SOURCE,
        /\.calendar-share-page \.calendar-timeslot-grid\s*\{[\s\S]*overflow-y:\s*auto/,
    );
    assert.match(
        SHARE_RENDERER_CSS_SOURCE,
        /\.widget-card:has\(\.calendar-share-page\)\s*\{[\s\S]*overflow-y:\s*hidden/,
    );
});

test("calendar page prompts to unlock received calendar shares while loading", () => {
    assert.match(
        APP_SOURCE,
        /fetchEvents\(calendar\.id, calendar, \{\s*promptWhenLocked:\s*true/,
    );
});

test("shared calendar settings expose recipient-local name and color", () => {
    assert.match(APP_SOURCE, /openCalendarEditPopup\(calendar\)/);
    assert.match(
        POPUP_MANAGER_CALENDAR_EDIT_SOURCE,
        /isShared\s*\? \{ name, color \}/,
    );
    assert.match(
        POPUP_MANAGER_CALENDAR_EDIT_SOURCE,
        /gateway\.calendar\.shared_calendar_local_color/,
    );
    assert.match(POPUP_MANAGER_CALENDAR_EDIT_SOURCE, /renderInfoTooltip/);
    assert.match(POPUP_MANAGER_CALENDAR_EDIT_SOURCE, /maxlength="30"/);
    assert.match(POPUP_MANAGER_CALENDAR_EDIT_SOURCE, /immutableSharedSuffix/);
    assert.match(
        POPUP_MANAGER_CALENDAR_EDIT_SOURCE,
        /\.\.\.\(!calendar\.isDefault/,
    );
    assert.match(
        POPUP_MANAGER_CALENDAR_EDIT_SOURCE,
        /delete_calendar_confirm_title/,
    );
    assert.match(
        POPUP_MANAGER_CALENDAR_EDIT_SOURCE,
        /delete_shared_calendar_confirm/,
    );
    assert.match(POPUP_MANAGER_CALENDAR_EDIT_SOURCE, /confirmed !== "delete"/);
    assert.doesNotMatch(
        POPUP_MANAGER_CALENDAR_EDIT_SOURCE,
        /calendar-delete-zone/,
    );
});

test("calendar visibility uses theme-aware SVG icons", () => {
    assert.match(HELPERS_SOURCE, /calendar-visibility-icon--public/);
    assert.doesNotMatch(HELPERS_SOURCE, /🌐|🌍|🌎|🌏/);
    assert.match(CSS_SOURCE, /globe-light\.svg/);
    assert.match(CSS_SOURCE, /globe-dark\.svg/);
    assert.match(
        CSS_SOURCE,
        /calendar-visibility-icon--shared[\s\S]*width:\s*1\.1rem;[\s\S]*height:\s*1\.1rem;/,
    );
});

test("shared calendar events are excluded from quick response controls", () => {
    assert.match(HELPERS_SOURCE, /calendarVisibility/);
    assert.match(HELPERS_SOURCE, /event\.calendarVisibility !== "shared"/);
    assert.match(HELPERS_SOURCE, /sharedEventRootIds/);
});

test("responses for globally stored events bypass calendar import", () => {
    assert.match(
        POPUP_MANAGER_RESPONSE_SOURCE,
        /responseUpdatesExistingEvent !== true/,
    );
    assert.match(BOOTSTRAP_HELPERS_SOURCE, /responseUpdatesExistingEvent:/);
});

test("shared calendar event loading resolves password protection through keyring", () => {
    assert.match(
        APP_SOURCE,
        /fetchEvents\(calendar\.id, calendar, \{\s*promptWhenLocked:\s*true/,
    );
    assert.match(CALENDAR_API_SOURCE, /share:fetchProtectedResource/);
    assert.match(CALENDAR_API_SOURCE, /x-cognis-share-password/);
    assert.match(CALENDAR_API_SOURCE, /sharePasswordProtected/);
    assert.match(CALENDAR_ROUTES_SOURCE, /requireSharedCalendarPassword/);
    assert.match(SHARED_PASSWORD_SOURCE, /share_password_required/);
    assert.match(SHARED_PASSWORD_SOURCE, /share:unlockUserAccess/);
    assert.match(CALENDAR_API_SOURCE, /calendar_share_secrets_refused/);
    assert.match(APP_SOURCE, /secretsUnavailable/);
    assert.match(HELPERS_SOURCE, /calendar-item-btn--locked/);
    assert.match(HELPERS_SOURCE, /share_secrets_not_provided/);
    assert.match(CSS_SOURCE, /calendar-item-btn--locked/);
    assert.match(
        APP_SOURCE,
        /calendar\.secretsUnavailable[\s\S]*openCalendarEditPopup\(calendar\)/,
    );
    assert.match(CALENDAR_API_SOURCE, /promptWhenLocked/);
    assert.match(CALENDAR_API_SOURCE, /promptWhenLocked,/);
    assert.doesNotMatch(CALENDAR_API_SOURCE, /"Calendar Gateway"/);
});

test("calendar shares provide a Cognis content route", () => {
    assert.match(
        POPUP_MANAGER_CALENDAR_EDIT_SOURCE,
        /contentUrl: `\/calendar\?calendarId=/,
    );
});
