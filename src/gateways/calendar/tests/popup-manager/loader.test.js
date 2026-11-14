import assert from "node:assert/strict";
import filesystem from "node:fs/promises";
import { syncBuiltinESMExports } from "node:module";
import test from "node:test";
import { setImmediate } from "node:timers/promises";
import { loadPopupManager } from "../fixtures/popup-manager-loader.js";

test("popup loader links overlapping imports before evaluating their graph", async (context) => {
    const readFile = filesystem.readFile;
    const allDayGate = Promise.withResolvers();
    const eventUtilsReady = Promise.withResolvers();
    const submitReady = Promise.withResolvers();
    const reads = new Map();
    context.mock.method(filesystem, "readFile", async (url, ...options) => {
        const source = await readFile(url, ...options);
        const name = new URL(url).pathname.split("/").at(-1);
        reads.set(name, (reads.get(name) ?? 0) + 1);
        if (name === "popup-manager-all-day.js") await allDayGate.promise;
        if (name === "popup-manager-event-utils.js") eventUtilsReady.resolve();
        if (name === "submit-event.js") {
            await eventUtilsReady.promise;
            // Drain linking microtasks while the shared all-day read is pending.
            await setImmediate();
            submitReady.resolve();
        }
        return source;
    });
    syncBuiltinESMExports();

    let outcome;
    const loading = loadPopupManager().then(
        (value) => {
            outcome = { value };
        },
        (error) => {
            outcome = { error };
        },
    );
    try {
        await submitReady.promise;
        await setImmediate();
        assert.equal(outcome, undefined, outcome?.error?.stack);
        allDayGate.resolve();
        await loading;
        assert.equal(typeof outcome.value, "function", outcome.error?.stack);
        assert.equal(reads.get("popup-manager-all-day.js"), 1);
        assert.equal(reads.get("popup-manager-event-utils.js"), 1);
        assert.equal(reads.get("popup-manager-reminders.js"), 1);
    } finally {
        allDayGate.resolve();
        await loading;
        context.mock.restoreAll();
        syncBuiltinESMExports();
    }
});
