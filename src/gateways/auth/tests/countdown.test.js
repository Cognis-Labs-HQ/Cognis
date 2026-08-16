import test from "node:test";
import assert from "node:assert/strict";
import {
    formatCountdownClock,
    getCountdownParts,
    getCountdownUrgency,
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

test("countdown urgency changes at the live session thresholds", () => {
    assert.equal(getCountdownUrgency(10_000, 100_000), "normal");
    assert.equal(getCountdownUrgency(9_999, 100_000), "warning");
    assert.equal(getCountdownUrgency(2_001, 100_000), "warning");
    assert.equal(getCountdownUrgency(2_000, 100_000), "danger");
});
