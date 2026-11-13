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
        const readsBeforeAbort = harness.reached.filter((stage) =>
            ["locale", "calendars", "events", "invitations"].includes(stage),
        );
        controller.abort();
        release();
        await pending;
        assert.equal(harness.reached.includes("render"), false);
        assert.equal(harness.reached.includes("toast"), false);
        const reads = harness.reached.filter((stage) =>
            ["locale", "calendars", "events", "invitations"].includes(stage),
        );
        assert.deepEqual(reads, readsBeforeAbort);
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
        ["locale", "invitations", "calendars", "events", "render"],
    );
});

test("Calendar overlaps invitations with discovery and event reads while awaiting complete content", async () => {
    const controller = new AbortController();
    let releaseCalendars;
    let releaseInvitations;
    const calendars = new Promise((resolve) => {
        releaseCalendars = resolve;
    });
    const invitations = new Promise((resolve) => {
        releaseInvitations = resolve;
    });
    const harness = await loadCalendarMount({
        signal: controller.signal,
        hold: (stage) =>
            stage === "calendars"
                ? calendars
                : stage === "invitations"
                  ? invitations
                  : undefined,
    });
    const mounting = harness.run().catch((error) => error);
    await new Promise((resolve) => setImmediate(resolve));
    assert.ok(harness.reached.includes("calendars"));
    assert.ok(harness.reached.includes("invitations"));
    assert.equal(harness.reached.includes("events"), false);
    releaseCalendars();
    await new Promise((resolve) => setImmediate(resolve));
    assert.ok(harness.reached.includes("events"));
    assert.equal(harness.reached.includes("render"), false);
    releaseInvitations();
    assert.equal(await mounting, harness.renderBoundary);
});

test("an invitation failure retains Calendar content after the other required reads", async () => {
    const harness = await loadCalendarMount({
        signal: new AbortController().signal,
        hold: async (stage) => {
            if (stage === "invitations")
                throw new Error("synthetic invitation failure");
        },
    });
    await assert.rejects(
        harness.run(),
        (error) => error === harness.renderBoundary,
    );
    assert.ok(harness.reached.includes("events"));
    assert.ok(harness.reached.includes("render"));
});
