import test from "node:test";
import assert from "node:assert/strict";
import {
    formatCountdownClock,
    getCountdownParts,
    getCountdownUrgency,
    getCountdownUrgencyThresholds,
} from "../ui/countdown.js";

test("countdown formats remaining time with unbounded hours", () => {
    assert.equal(formatCountdownClock(3_661_000), "01:01:01");
    assert.equal(formatCountdownClock(90_061_000), "25:01:01");
    assert.equal(formatCountdownClock(0), "00:00:00");
});

test("countdown splits remaining session time into readable units", () => {
    assert.deepEqual(getCountdownParts(694_861_000), [
        { unit: "weeks", value: 1 },
        { unit: "days", value: 1 },
        { unit: "hours", value: 1 },
        { unit: "minutes", value: 1 },
        { unit: "seconds", value: 1 },
    ]);
    assert.deepEqual(getCountdownParts(0), [{ unit: "seconds", value: 0 }]);
});

test("countdown urgency balances short and long sessions", () => {
    assert.deepEqual(getCountdownUrgencyThresholds(60_000), {
        warningMilliseconds: 30_000,
        dangerMilliseconds: 10_000,
    });
    assert.deepEqual(getCountdownUrgencyThresholds(28 * 86_400_000), {
        warningMilliseconds: 86_400_000,
        dangerMilliseconds: 3_600_000,
    });
    assert.equal(getCountdownUrgency(30_001, 60_000), "normal");
    assert.equal(getCountdownUrgency(30_000, 60_000), "warning");
    assert.equal(getCountdownUrgency(10_000, 60_000), "danger");
});
