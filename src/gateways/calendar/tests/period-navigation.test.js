import assert from "node:assert/strict";
import test from "node:test";
import {
    calendarDate,
    isCurrentPeriod,
    nextDateChange,
    bindCurrentPeriod,
} from "../ui/app/period-navigation.js";

const selected = (year, month, day) => new Date(year, month - 1, day);

for (const [view, date, expected] of [
    ["day", selected(2026, 1, 1), true],
    ["day", selected(2025, 12, 31), false],
    ["week", selected(2025, 12, 28), true],
    ["week", selected(2026, 1, 3), true],
    ["week", selected(2026, 1, 4), false],
    ["month", selected(2026, 1, 31), true],
    ["month", selected(2025, 12, 31), false],
    ["year", selected(2026, 12, 31), true],
    ["year", selected(2025, 12, 31), false],
]) {
    test(`${view} compares selected civil period ${date.toDateString()}`, () => {
        assert.equal(
            isCurrentPeriod(
                date,
                view,
                new Date("2026-01-01T12:00:00Z"),
                "UTC",
            ),
            expected,
        );
    });
}

test("current date follows configured timezone across day and year boundaries", () => {
    const now = new Date("2026-01-01T00:30:00Z");
    assert.equal(
        calendarDate(now, "America/Los_Angeles").getTime(),
        selected(2025, 12, 31).getTime(),
    );
    assert.equal(
        calendarDate(now, "Asia/Tokyo").getTime(),
        selected(2026, 1, 1).getTime(),
    );
    assert.equal(
        isCurrentPeriod(
            selected(2025, 12, 31),
            "year",
            now,
            "America/Los_Angeles",
        ),
        true,
    );
    assert.equal(
        isCurrentPeriod(selected(2025, 12, 31), "year", now, "Asia/Tokyo"),
        false,
    );
});

test("week boundaries follow the supplied first weekday", () => {
    const sunday = new Date("2026-01-04T12:00:00Z");
    assert.equal(
        isCurrentPeriod(selected(2026, 1, 3), "week", sunday, "UTC", 0),
        false,
    );
    assert.equal(
        isCurrentPeriod(selected(2026, 1, 3), "week", sunday, "UTC", 1),
        true,
    );
});

for (const [instant, zone, hours] of [
    ["2026-03-08T05:00:00Z", "America/New_York", 23],
    ["2026-11-01T04:00:00Z", "America/New_York", 25],
    ["2024-02-29T00:00:00Z", "UTC", 24],
    ["2026-12-31T15:00:00Z", "Asia/Tokyo", 24],
]) {
    test(`date rollover at ${instant} in ${zone}`, () => {
        assert.equal(
            nextDateChange(new Date(instant), zone),
            hours * 60 * 60 * 1000,
        );
    });
}

test("period control refreshes at midnight and cleans up on navigation", (context) => {
    context.mock.timers.enable({
        apis: ["Date"],
        now: Date.parse("2026-01-01T23:59:59Z"),
    });
    const previousWindow = globalThis.window;
    const previousDocument = globalThis.document;
    const timers = new Map();
    let nextTimer = 0;
    const attributes = new Map();
    const classes = new Set();
    const button = {
        classList: {
            toggle: (name, active) =>
                active ? classes.add(name) : classes.delete(name),
        },
        setAttribute: (name, value) => attributes.set(name, value),
    };
    globalThis.window = Object.assign(new EventTarget(), {
        setTimeout: (callback, delay) => {
            timers.set(++nextTimer, { callback, delay });
            return nextTimer;
        },
        clearTimeout: (timer) => timers.delete(timer),
    });
    globalThis.document = new EventTarget();
    context.after(() => {
        globalThis.window = previousWindow;
        globalThis.document = previousDocument;
    });
    const controller = new AbortController();
    let date = selected(2026, 1, 1);
    const refresh = bindCurrentPeriod({
        root: { querySelector: () => button },
        getDate: () => date,
        getView: () => "day",
        getTimeZone: () => "UTC",
        signal: controller.signal,
    });
    refresh();
    refresh();
    assert.equal(timers.size, 1);
    assert.equal(attributes.get("aria-pressed"), "true");
    assert.equal(classes.has("active"), true);
    const timer = [...timers.values()][0];
    assert.equal(timer.delay, 1000);
    context.mock.timers.tick(1000);
    timer.callback();
    assert.equal(attributes.get("aria-pressed"), "false");
    assert.equal(classes.has("active"), false);
    date = selected(2026, 1, 2);
    window.dispatchEvent(new Event("focus"));
    assert.equal(attributes.get("aria-pressed"), "true");
    controller.abort();
    assert.equal(timers.size, 0);
    document.dispatchEvent(new Event("visibilitychange"));
    window.dispatchEvent(new Event("focus"));
    assert.equal(timers.size, 0);
});
