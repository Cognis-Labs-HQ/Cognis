import test from "node:test";
import assert from "node:assert/strict";
import { formatCountdown } from "../countdown.js";

test("countdown formats remaining time with unbounded hours", () => {
    assert.equal(formatCountdown(3_661_000), "01:01:01");
    assert.equal(formatCountdown(90_061_000), "25:01:01");
    assert.equal(formatCountdown(0), "00:00:00");
});
