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
const linkPageSource = await readFile(
    new URL("../../../adapters/share/link/page.js", import.meta.url),
    "utf8",
);
const userPageSource = await readFile(
    new URL("../../../adapters/share/user/page.js", import.meta.url),
    "utf8",
);

test("share popup owns user recipient search and selection", () => {
    assert.match(popupSource, /share-links-user-search/);
    assert.match(popupSource, /data-share-user-id/);
    assert.match(popupSource, /state\.activeMethodId === "user"/);
    assert.match(popupSource, /data-share-recipient-remove/);
    assert.match(popupSource, /share-method-tabs/);
    assert.match(popupSource, /methodModule\.buildCreateOptions/);
    assert.match(popupSource, /methodModule\.renderPage/);
    assert.match(popupSource, /methodPage\.innerHTML/);
    assert.match(popupSource, /state\.visibleLinks/);
    assert.match(linkPageSource, /data-share-page="link"/);
    assert.match(linkPageSource, /share-links-label/);
    assert.match(linkPageSource, /type="datetime-local"/);
    assert.match(linkPageSource, /share-links-access-mode/);
    assert.match(linkPageSource, /gatewayFields\.password/);
    assert.doesNotMatch(linkPageSource, /share-links-user-search/);
    assert.match(userPageSource, /data-share-page="user"/);
    assert.match(userPageSource, /share-links-user-search/);
    assert.match(userPageSource, /share-links-user-permission/);
    assert.match(userPageSource, /type="datetime-local"/);
    assert.match(userPageSource, /gatewayFields\.password/);
    assert.doesNotMatch(userPageSource, /share-links-label/);
});

test("share popup callbacks use only share gateway recipient and token routes", () => {
    assert.match(apiSource, /\/api\/v1\/share\/recipients\/users/);
    assert.match(apiSource, /method: "PATCH"/);
    assert.match(apiSource, /password: String\(password/);
    assert.match(apiSource, /String\(expiresAt/);
    assert.match(popupSource, /renderPasswordProtectionField/);
    assert.doesNotMatch(apiSource, /\/api\/v1\/calendar/);
});

test("share popup renders link variants and profile-backed user cards", () => {
    assert.match(popupSource, /link\?\.variants/);
    assert.match(popupSource, /variant\.url/);
    assert.match(popupSource, /buildProfileAvatarMarkup/);
    assert.match(popupSource, /data-share-user-avatar-key/);
    assert.match(popupSource, /profileHandle/);
});
