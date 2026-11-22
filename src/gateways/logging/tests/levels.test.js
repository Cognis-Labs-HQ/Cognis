import test from "node:test";
import assert from "node:assert/strict";
import { SUPPORTED_LOG_LEVELS as bootstrapLevels } from "../bootstrap.ts";
import {
    CONSOLE_LEVELS,
    LEVEL_PRIORITY,
    SUPPORTED_LOG_LEVELS,
    isLogLevel,
} from "../ui/reuse/levels.js";
import { normalizeDiagnostic } from "../ui/entry.js";

test("server and browser logging consume the same level catalog and aliases", () => {
    assert.equal(bootstrapLevels, SUPPORTED_LOG_LEVELS);
    assert.deepEqual(SUPPORTED_LOG_LEVELS, Object.keys(LEVEL_PRIORITY));
    for (const level of SUPPORTED_LOG_LEVELS) {
        assert.equal(isLogLevel(level), true);
        assert.equal(
            normalizeDiagnostic({ level, message: "event" }).level,
            level,
        );
        assert.ok(Number.isFinite(LEVEL_PRIORITY[level]));
    }
    for (const level of Object.values(CONSOLE_LEVELS))
        assert.equal(isLogLevel(level), true);
    assert.equal(isLogLevel("unsupported"), false);
});
