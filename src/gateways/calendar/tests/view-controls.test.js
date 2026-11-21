import test from "node:test";
import assert from "node:assert/strict";
import { loadTestModule } from "../../../tooling/reuse/test-module.ts";

const unused = () => {
    throw new Error("Rendering is outside the interaction test");
};
const { mountCalendarViewControls } = loadTestModule(
    new URL("../ui/calendar-view-controls.js", import.meta.url),
    {
        "./calendar-ui-helpers.js": { toDateTimeLocalValue: unused },
        "/static/reuse/escape-html.js": { escapeHtml: unused },
    },
);

function change(root, selector, value) {
    const control = {
        value,
        closest: (candidate) => (candidate === selector ? control : null),
    };
    const event = new Event("change");
    Object.defineProperty(event, "target", { value: control });
    root.dispatchEvent(event);
}

test("Calendar controls accept valid date jumps and configured view choices", () => {
    const root = new EventTarget();
    const changes = [];
    mountCalendarViewControls(root, {
        views: ["month", "day"],
        onDateChange: (date) => changes.push(["date", date]),
        onViewChange: (view) => changes.push(["view", view]),
    });
    change(root, "[data-calendar-date]", "2026-11-18");
    change(root, "[data-calendar-view-select]", "day");
    assert.equal(changes.length, 2);
    const date = changes[0][1];
    assert.equal(date.getFullYear(), 2026);
    assert.equal(date.getMonth(), 10);
    assert.equal(date.getDate(), 18);
    assert.equal(date.getHours(), 12);
    assert.deepEqual(changes[1], ["view", "day"]);
});

test("Calendar controls ignore empty dates, unsupported views and unrelated fields", () => {
    const root = new EventTarget();
    const changes = [];
    mountCalendarViewControls(root, {
        views: ["month"],
        onDateChange: (date) => changes.push(date),
        onViewChange: (view) => changes.push(view),
    });
    change(root, "[data-calendar-date]", "");
    change(root, "[data-calendar-date]", "invalid");
    change(root, "[data-calendar-view-select]", "unregistered");
    change(root, "[data-other-field]", "day");
    assert.deepEqual(changes, []);
});

test("Calendar control listeners end with their page lifetime", () => {
    for (const alreadyAborted of [false, true]) {
        const root = new EventTarget();
        const lifetime = new AbortController();
        const changes = [];
        if (alreadyAborted) lifetime.abort();
        mountCalendarViewControls(root, {
            views: ["month"],
            signal: lifetime.signal,
            onDateChange: (date) => changes.push(date),
            onViewChange: (view) => changes.push(view),
        });
        lifetime.abort();
        change(root, "[data-calendar-date]", "2026-11-18");
        change(root, "[data-calendar-view-select]", "month");
        assert.deepEqual(changes, []);
    }
});
