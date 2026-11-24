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
        "/static/reuse/timestamp.js": { formatMonthYear: unused },
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

function click(root, attribute, value) {
    const control = {
        closest: (selector) => (selector === `[${attribute}]` ? control : null),
        getAttribute: () => value,
    };
    const event = new Event("click", { cancelable: true });
    Object.defineProperty(event, "target", { value: control });
    root.dispatchEvent(event);
    return event.defaultPrevented;
}

test("Calendar period indicators navigate to the clicked month, week and day through one binding", () => {
    const root = new EventTarget();
    const changes = [];
    mountCalendarViewControls(root, {
        views: ["year", "month", "week", "day"],
        getActiveDate: () => new Date(2032, 11, 31),
        onViewChange: (view, date) => changes.push([view, date]),
    });
    assert.equal(click(root, "data-year-month-index", "1"), true);
    assert.equal(changes[0][0], "month");
    assert.deepEqual(
        [
            changes[0][1].getFullYear(),
            changes[0][1].getMonth(),
            changes[0][1].getDate(),
        ],
        [2032, 1, 1],
    );
    for (const [attribute, view] of [
        ["data-week-row-date", "week"],
        ["data-day-dot-date", "day"],
    ]) {
        const value = "2031-12-28T00:00:00.000Z";
        assert.equal(click(root, attribute, value), true);
        assert.equal(changes.at(-1)[0], view);
        assert.equal(changes.at(-1)[1].toISOString(), value);
    }
});

test("Calendar period navigation validates indicators and ends with its page lifetime", () => {
    const root = new EventTarget();
    const lifetime = new AbortController();
    const changes = [];
    mountCalendarViewControls(root, {
        views: ["month", "day"],
        getActiveDate: () => new Date(2032, 5, 1),
        onViewChange: (...args) => changes.push(args),
        signal: lifetime.signal,
    });
    for (const [attribute, values] of [
        ["data-year-month-index", ["", "-1", "12", "1x"]],
        ["data-day-dot-date", ["", "invalid"]],
        ["data-week-row-date", ["2032-01-01"]],
    ]) {
        for (const value of values)
            assert.equal(click(root, attribute, value), false);
    }
    assert.deepEqual(changes, []);
    lifetime.abort();
    assert.equal(click(root, "data-year-month-index", "1"), false);
    assert.equal(click(root, "data-day-dot-date", "2032-01-01"), false);
    assert.deepEqual(changes, []);
});

for (const view of ["day", "week", "month", "year"]) {
    test(`Calendar returns ${view} to the current date without changing its selected view`, () => {
        const root = new EventTarget();
        const lifetime = new AbortController();
        let activeDate = new Date(2032, 4, 6);
        const now = new Date(2026, 10, 24, 14, 30);
        mountCalendarViewControls(root, {
            views: ["day", "week", "month", "year"],
            getActiveDate: () => activeDate,
            getSelectedView: () => view,
            getCurrentDate: () => now,
            onDateChange: (date) => {
                activeDate = date;
            },
            onViewChange: () =>
                assert.fail(
                    "Returning to the current period must retain the view",
                ),
            signal: lifetime.signal,
        });
        assert.equal(click(root, "data-calendar-nav", "today"), true);
        assert.equal(activeDate.getTime(), now.getTime());
        lifetime.abort();
        activeDate = new Date(2032, 4, 6);
        assert.equal(click(root, "data-calendar-nav", "today"), false);
        assert.equal(activeDate.getFullYear(), 2032);
    });
}

test("Calendar period arrows honor month, leap-year and year boundaries", () => {
    for (const [view, start, direction, expected] of [
        ["day", [2032, 1, 28], "next", [2032, 1, 29]],
        ["week", [2032, 0, 2], "prev", [2031, 11, 26]],
        ["month", [2032, 0, 31], "next", [2032, 1, 1]],
        ["month", [2032, 0, 31], "prev", [2031, 11, 1]],
        ["year", [2032, 1, 29], "next", [2033, 0, 1]],
    ]) {
        const root = new EventTarget();
        let date = new Date(...start);
        mountCalendarViewControls(root, {
            views: [view],
            getActiveDate: () => date,
            getSelectedView: () => view,
            onDateChange: (next) => {
                date = next;
            },
        });
        assert.equal(click(root, "data-calendar-nav", direction), true);
        assert.deepEqual(
            [date.getFullYear(), date.getMonth(), date.getDate()],
            expected,
        );
        const previous = date.getTime();
        assert.equal(click(root, "data-calendar-nav", "unknown"), false);
        assert.equal(date.getTime(), previous);
    }
});
