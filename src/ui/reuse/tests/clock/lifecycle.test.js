import assert from "node:assert/strict";
import test from "node:test";
import { createClockRuntime } from "./fixtures/runtime.js";

function mountFixture() {
    const runtime = createClockRuntime();
    const display = runtime.insert("clock");
    const label = runtime.insert("timezone");
    const controller = new AbortController();
    const options = {
        root: runtime.root,
        displayId: "clock",
        tzId: "timezone",
        renderClock: runtime.buildDigitalClockMarkup,
        signal: controller.signal,
    };
    const dispose = runtime.mountLiveClock(options);
    return { ...runtime, display, label, controller, options, dispose };
}

function assertReleased(fixture) {
    assert.equal(fixture.timers.size, 0);
    assert.equal(fixture.observers.size, 0);
    assert.equal(fixture.pagehideListeners.size, 0);
}

test("repeated render mounts share one timer and cleanup", () => {
    const fixture = mountFixture();
    assert.equal(fixture.mountLiveClock(fixture.options), fixture.dispose);
    assert.equal(fixture.timers.size, 1);
    assert.equal(fixture.observers.size, 1);
    assert.equal(fixture.pagehideListeners.size, 1);
    fixture.dispose();
    fixture.dispose();
    assertReleased(fixture);
});

test("replacing a display releases its timer before mounting the successor", () => {
    const fixture = mountFixture();
    const oldTick = [...fixture.timers.values()][0];
    const previousMarkup = fixture.display.innerHTML;
    const replacement = fixture.insert("clock");
    const disposeReplacement = fixture.mountLiveClock(fixture.options);
    assert.equal(fixture.timers.size, 1);
    assert.notEqual(replacement.innerHTML, "");
    oldTick();
    fixture.dispose();
    assert.equal(fixture.display.innerHTML, previousMarkup);
    assert.equal(fixture.timers.size, 1);
    disposeReplacement();
    assertReleased(fixture);
});

test("hiding a clock releases detached resources and showing it starts a new clock", () => {
    const fixture = mountFixture();
    const oldTick = [...fixture.timers.values()][0];
    fixture.remove("clock");
    const previousMarkup = fixture.display.innerHTML;
    oldTick();
    fixture.flushMutations();
    assert.equal(fixture.display.innerHTML, previousMarkup);
    assertReleased(fixture);
    fixture.insert("clock");
    fixture.mountLiveClock(fixture.options);
    assert.equal(fixture.timers.size, 1);
    fixture.controller.abort();
    assertReleased(fixture);
});

test("DOM removal and pagehide release timers without waiting for a tick", () => {
    const fixture = mountFixture();
    fixture.remove("clock");
    fixture.flushMutations();
    assertReleased(fixture);
    fixture.insert("clock");
    fixture.mountLiveClock(fixture.options);
    fixture.pagehide();
    assertReleased(fixture);
});

test("aborted mounts cannot create a clock or stop a newer live owner", () => {
    const fixture = mountFixture();
    const cancelled = new AbortController();
    cancelled.abort();
    fixture.mountLiveClock({ ...fixture.options, signal: cancelled.signal });
    assert.equal(fixture.timers.size, 1);
    fixture.controller.abort();
    assertReleased(fixture);
    fixture.mountLiveClock(fixture.options);
    assertReleased(fixture);
});

test("digital and analogue clocks have independent lifetimes and reflect preferences", () => {
    const fixture = mountFixture();
    const analogue = fixture.insert("analogue");
    const analogueLabel = fixture.insert("analogue-timezone");
    const disposeAnalogue = fixture.mountLiveClock({
        root: fixture.root,
        displayId: "analogue",
        tzId: "analogue-timezone",
        renderClock: fixture.buildAnalogueClockMarkup,
    });
    assert.equal(fixture.timers.size, 2);
    assert.match(fixture.display.innerHTML, /clock-digital-time/);
    assert.match(analogue.innerHTML, /clock-hand-second/);
    assert.match(analogue.innerHTML, /aria-hidden="true"/);
    fixture.preferences.set("cognis_timezone", "Asia/Tokyo");
    fixture.tick();
    assert.equal(fixture.label.textContent, "Asia/Tokyo");
    assert.equal(analogueLabel.textContent, "Asia/Tokyo");
    fixture.controller.abort();
    assert.equal(fixture.timers.size, 1);
    disposeAnalogue();
    assertReleased(fixture);
});

test("clock formatting retains 12-hour and 24-hour preferences and analogue geometry", () => {
    const fixture = createClockRuntime();
    const now = new Date("2026-11-14T15:04:05.000Z");
    for (const [preference, hour12] of [
        ["12h", true],
        ["24h", false],
    ]) {
        fixture.preferences.set("cognis_time_format", preference);
        const expected = now.toLocaleTimeString(undefined, {
            hour: "numeric",
            minute: "2-digit",
            second: "2-digit",
            timeZone: "UTC",
            hour12,
        });
        assert.ok(
            fixture.buildDigitalClockMarkup(now, "UTC").includes(expected),
        );
    }
    const analogue = fixture.buildAnalogueClockMarkup(now, "UTC");
    assert.equal(
        (analogue.match(/class="clock-analogue-tick/g) ?? []).length,
        60,
    );
    assert.match(analogue, /viewBox="0 0 108 108"/);
});

test("identical display IDs in different roots keep independent ownership", () => {
    const fixture = mountFixture();
    const otherDisplay = { isConnected: true, innerHTML: "" };
    const otherRoot = {
        ...fixture.root,
        nodes: new Map([["#clock", otherDisplay]]),
    };
    const disposeOther = fixture.mountLiveClock({
        ...fixture.options,
        root: otherRoot,
    });
    assert.equal(fixture.timers.size, 2);
    fixture.dispose();
    assert.equal(fixture.timers.size, 1);
    fixture.tick();
    assert.match(otherDisplay.innerHTML, /clock-digital-time/);
    disposeOther();
    assertReleased(fixture);
});

test("cancellation during initial rendering creates no timer or detached writes", () => {
    const fixture = createClockRuntime();
    const display = fixture.insert("clock");
    const controller = new AbortController();
    fixture.mountLiveClock({
        root: fixture.root,
        displayId: "clock",
        signal: controller.signal,
        renderClock: () => {
            controller.abort();
            return "cancelled";
        },
    });
    assert.equal(display.innerHTML, "");
    assertReleased(fixture);
});
