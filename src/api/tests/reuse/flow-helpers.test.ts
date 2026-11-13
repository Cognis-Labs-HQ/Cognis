import assert from "node:assert/strict";
import test from "node:test";
import {
    getFirstMatchingStageResult,
    getFirstStageResult,
} from "../../reuse/flow-helpers.js";

test("stage result helpers return null for absent results without invoking predicates", () => {
    let predicateCalls = 0;
    const predicate = (): boolean => {
        predicateCalls += 1;
        return true;
    };
    for (const stageResults of [
        undefined,
        {},
        { load: undefined },
        { load: [] },
    ]) {
        assert.equal(getFirstStageResult(stageResults, "load"), null);
        assert.equal(
            getFirstMatchingStageResult(stageResults, "load", predicate),
            null,
        );
    }
    assert.equal(predicateCalls, 0);
});

test("stage result helpers preserve first-value and first-match selection", () => {
    const first = { allowed: false };
    const second = { allowed: true };
    const stageResults = { load: [first, second, { allowed: true }] };
    assert.equal(getFirstStageResult(stageResults, "load"), first);
    assert.equal(
        getFirstMatchingStageResult(
            stageResults,
            "load",
            (result) => result === second,
        ),
        second,
    );
    assert.equal(
        getFirstMatchingStageResult(stageResults, "load", () => false),
        null,
    );
    assert.equal(getFirstStageResult({ load: [false, true] }, "load"), false);
});
