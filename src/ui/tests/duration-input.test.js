import test from "node:test";
import assert from "node:assert/strict";
import {
    joinDurationMinutes,
    splitDurationMinutes,
} from "../reuse/duration-input.js";
import { normalizeLoginSessionTimeoutMinutes } from "../../api/reuse/security-settings.ts";

test("duration input uses the largest exact unit", () => {
    assert.deepEqual(splitDurationMinutes(120), { value: 2, unit: "hours" });
    assert.deepEqual(splitDurationMinutes(90), { value: 90, unit: "minutes" });
    assert.deepEqual(splitDurationMinutes(20160), {
        value: 2,
        unit: "weeks",
    });
});

test("duration input converts supported units to minutes", () => {
    assert.equal(joinDurationMinutes("2", "days"), 2880);
    assert.ok(Number.isNaN(joinDurationMinutes("1.5", "hours")));
    assert.ok(Number.isNaN(joinDurationMinutes("2", "years")));
});

test("a zero-minute security timeout represents no expiry", () => {
    assert.equal(normalizeLoginSessionTimeoutMinutes(0), 0);
});

test("duration limits exclude oversized units and calculate whole maxima", async () => {
    const { getDurationUnitLimits } =
        await import("../reuse/duration-input.js");

    assert.deepEqual(getDurationUnitLimits(3 * 1440), [
        { unit: "minutes", max: 4320 },
        { unit: "hours", max: 72 },
        { unit: "days", max: 3 },
    ]);
    assert.deepEqual(getDurationUnitLimits(10 * 1440).at(-1), {
        unit: "weeks",
        max: 1,
    });
});
