import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const pageSource = await readFile(
    new URL("../ui/app/shares/index.js", import.meta.url),
    "utf8",
);
const navbarSource = await readFile(
    new URL("../ui/navbar.js", import.meta.url),
    "utf8",
);

test("Shares page composes sent and received share management", () => {
    assert.match(pageSource, /createPageComposer/);
    assert.match(pageSource, /fetchShareOverview/);
    assert.match(pageSource, /revokeShare/);
    assert.match(pageSource, /rejectShare/);
    assert.match(pageSource, /pageContext:[\s\S]*title:[\s\S]*subtitle:/);
    assert.match(pageSource, /export async function mount\(root, \{ signal \}/);
});

test("Share navbar plugin adds Shares to the user menu", () => {
    assert.match(navbarSource, /#profile-dropdown/);
    assert.match(navbarSource, /link\.href = "\/shares"/);
    assert.match(navbarSource, /#profile-logout/);
});
