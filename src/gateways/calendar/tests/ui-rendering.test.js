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
const CSS_SOURCE = readFileSync(
    resolve(ROOT, "src/gateways/calendar/ui/calendar.css"),
    "utf8",
);

test("calendar week view renders stacked event cards with row spans", () => {
    assert.match(HELPERS_SOURCE, /calendar-slot-event-stack/);
    assert.match(HELPERS_SOURCE, /occupiedRowsRemaining = days\.map\(\(\) => 0\)/);
    assert.match(HELPERS_SOURCE, /rowspan="\$\{spanRows\}"/);
    assert.match(HELPERS_SOURCE, /showTime:\s*true/);
});

test("calendar slot clicks create events outside event buttons and add buttons", () => {
    assert.match(
        APP_SOURCE,
        /event\.target\.closest\(\s*"\[data-calendar-event\], \[data-timeslot-add\]"/,
    );
});

test("calendar CSS fixes week-slot height and anchors the add button", () => {
    assert.match(CSS_SOURCE, /\.calendar-week-timeslot-row\s*\{[^}]*height:\s*4\.8rem;/s);
    assert.match(CSS_SOURCE, /\.calendar-week-slot\s*\{[^}]*height:\s*4\.8rem;/s);
    assert.match(CSS_SOURCE, /\.calendar-timeslot-hover-add\s*\{[^}]*right:\s*0\.35rem;[^}]*bottom:\s*0\.35rem;/s);
});
