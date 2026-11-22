import test from "node:test";
import assert from "node:assert/strict";
import { log, subscribeDiagnostics } from "../diagnostics.js";

test("startup diagnostics are bounded, drained once and released by their gateway consumer", async () => {
    for (let i = 0; i < 140; i++) await log("info", "startup", { index: i });
    const entries = [];
    const release = subscribeDiagnostics(async (entry) => {
        entries.push(entry);
        return true;
    });
    assert.equal(entries.length, 128);
    assert.equal(entries[0].meta.index, 12);
    assert.throws(
        () => subscribeDiagnostics(async () => true),
        /diagnostic_consumer_already_registered/,
    );
    assert.equal(await log("error", "connection_failed"), true);
    release();
    await log("info", "provider_remounted");
    const later = [];
    const dispose = subscribeDiagnostics(async (entry) => {
        later.push(entry);
        return true;
    });
    release();
    assert.equal(await log("info", "still_owned"), true);
    dispose();
    assert.deepEqual(
        later.map((entry) => entry.message),
        ["provider_remounted", "still_owned"],
    );
});
