import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const dashboardPath = new URL("../app/dashboard/index.js", import.meta.url);

test("dashboard upcoming events use one bounded projection request", async () => {
    const source = await readFile(dashboardPath, "utf8");
    assert.match(source, /calendar\/upcoming-events\?limit=5/);
    assert.doesNotMatch(source, /calendar\/calendars\"/);
    assert.doesNotMatch(source, /calendar\/invitations/);
});

test("dashboard renders before isolated optional hydration settles", async () => {
    const source = await readFile(dashboardPath, "utf8");
    const composerInitialization = source.indexOf("await composer.init()");
    const isolatedSettlement = source.indexOf("await Promise.allSettled");
    assert.ok(composerInitialization > 0);
    assert.ok(isolatedSettlement > composerInitialization);
    assert.match(source, /aria-busy="true"/);
});
