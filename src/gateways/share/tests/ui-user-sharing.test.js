import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const popupSource = await readFile(
    new URL("../ui/reuse/share-links-popup.js", import.meta.url),
    "utf8",
);
const apiSource = await readFile(
    new URL("../ui/reuse/share-api.js", import.meta.url),
    "utf8",
);

test("share popup owns user recipient search and selection", () => {
    assert.match(popupSource, /share-links-user-search/);
    assert.match(popupSource, /data-share-user-id/);
    assert.match(popupSource, /state\.activeMethodId === "user"/);
    assert.match(popupSource, /data-share-recipient-remove/);
    assert.match(popupSource, /share-method-tabs/);
    assert.match(popupSource, /methodModule\.buildCreateOptions/);
});

test("share popup callbacks use only share gateway recipient and token routes", () => {
    assert.match(apiSource, /\/api\/v1\/share\/recipients\/users/);
    assert.match(apiSource, /method: "PATCH"/);
    assert.doesNotMatch(apiSource, /\/api\/v1\/calendar/);
});
