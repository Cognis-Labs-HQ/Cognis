import test from "node:test";
import assert from "node:assert/strict";
import { loadCalendarMount } from "./fixtures/calendar-mount-loader.js";

for (const boundary of ["locale", "calendars", "events", "invitations"]) {
    test(`Calendar stops an obsolete mount after ${boundary}`, async () => {
        const controller = new AbortController();
        let release;
        let announce;
        const started = new Promise((resolve) => {
            announce = resolve;
        });
        const held = new Promise((resolve) => {
            release = resolve;
        });
        const harness = await loadCalendarMount({
            signal: controller.signal,
            hold: async (stage) => {
                if (stage === boundary) {
                    announce();
                    await held;
                }
            },
        });
        const pending = harness.run();
        await started;
        controller.abort();
        release();
        await pending;
        assert.equal(harness.reached.includes("render"), false);
        assert.equal(harness.reached.includes("toast"), false);
        const reads = harness.reached.filter((stage) =>
            ["locale", "calendars", "events", "invitations"].includes(stage),
        );
        assert.equal(reads.at(-1), boundary);
    });
}

test("an active Calendar mount reaches page setup after its required reads", async () => {
    const controller = new AbortController();
    const harness = await loadCalendarMount({
        signal: controller.signal,
        hold: async () => {},
    });
    await assert.rejects(
        harness.run(),
        (error) => error === harness.renderBoundary,
    );
    assert.deepEqual(
        harness.reached.filter((stage) =>
            ["locale", "calendars", "events", "invitations", "render"].includes(
                stage,
            ),
        ),
        ["locale", "calendars", "events", "invitations", "render"],
    );
});
