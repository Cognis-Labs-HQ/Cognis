import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const dashboardPath = new URL("../app/dashboard/index.js", import.meta.url);

test("dashboard uses the Calendar gateway upcoming-events function", async () => {
    const source = await readFile(dashboardPath, "utf8");
    assert.match(source, /fetchUpcomingEvents\(5\)/);
    assert.doesNotMatch(source, /api\/v1\/calendar/);
    assert.doesNotMatch(source, /calendar\/calendars\"/);
    assert.doesNotMatch(source, /calendar\/invitations/);
});

test("dashboard renders before isolated optional hydration settles", async () => {
    const source = await readFile(dashboardPath, "utf8");
    const composerInitialization = source.indexOf("await composer.init()");
    assert.ok(composerInitialization > 0);
    assert.doesNotMatch(source, /await Promise\.allSettled/);
    assert.match(source, /void upcomingEventsPromise/);
    assert.match(source, /aria-busy="true"/);
});
