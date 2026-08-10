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
const templateSource = await readFile(
    new URL("../ui/app/shares/templates.html", import.meta.url),
    "utf8",
);

test("Shares page composes sent and received share management", () => {
    assert.match(pageSource, /createPageComposer/);
    assert.match(pageSource, /allowCustomization:\s*false/);
    assert.match(pageSource, /fetchShareOverview/);
    assert.match(pageSource, /revokeShare/);
    assert.match(pageSource, /rejectShare/);
    assert.match(pageSource, /pageContext:[\s\S]*title:[\s\S]*subtitle:/);
    assert.match(pageSource, /export async function mount\(root, \{ signal \}/);
    assert.match(pageSource, /buildSharesElement/);
    assert.match(pageSource, /shares-title-link/);
    assert.match(pageSource, /data-share-manage/);
    assert.match(pageSource, /data-account-share-url/);
    assert.match(pageSource, /await navigateAccountShare/);
    assert.match(pageSource, /destructive \? "btn-cancel"/);
    assert.doesNotMatch(pageSource, /shares-icon-button--danger/);
    assert.match(pageSource, /activeFilter = filter\.dataset\.shareFilter/);
    assert.match(pageSource, /visibleShares\.length \+ 2/);
    assert.match(pageSource, /\[collection\]: overview\[collection\]\.filter/);
    assert.match(templateSource, /data-share-filter="all"/);
    assert.match(templateSource, /data-share-filter="sent"/);
    assert.match(templateSource, /data-share-filter="received"/);
    assert.match(pageSource, /share:openLinksPopup/);
    assert.match(pageSource, /initialEditingShareId/);
    assert.match(pageSource, /initialEditingShare: share/);
    assert.match(pageSource, /editOnly: true/);
    assert.match(pageSource, /buildShareTokenCallbacks/);
    assert.match(pageSource, /await mountWhenDirect\(mount\)/);
    assert.doesNotMatch(pageSource, /await mount\(document\.querySelector/);
    assert.doesNotMatch(pageSource, /share\.shares\.open/);
});

test("Share navbar plugin adds Shares to the user menu", () => {
    assert.match(navbarSource, /#profile-dropdown/);
    assert.match(navbarSource, /link\.href = "\/shares"/);
    assert.match(navbarSource, /#profile-logout/);
});
