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
    assert.match(userPageSource, /defaultGrantedCapabilities/);
    assert.match(userPageSource, /endsWith\(":write"\)/);
    assert.match(
        popupSource,
        /defaultGrantedCapabilities: grantedCapabilities/,
    );
    assert.doesNotMatch(userPageSource, /share-links-label/);
});

test("share popup callbacks use only share gateway recipient and token routes", () => {
    assert.match(apiSource, /\/api\/v1\/share\/recipients\/users/);
    assert.match(apiSource, /method: "PATCH"/);
    assert.match(apiSource, /password: String\(password/);
    assert.match(apiSource, /String\(expiresAt/);
    assert.match(popupSource, /renderPasswordProtectionField/);
    assert.match(popupSource, /createFormBuilder/);
    assert.match(popupSource, /required: state\.passwordRequired/);
    assert.match(popupSource, /passwordForm\.reportValidity\(\)/);
    assert.match(popupSource, /renderInfoTooltip/);
    assert.match(popupSource, /data-share-generate-password/);
    assert.match(popupSource, /crypto\.getRandomValues/);
    assert.doesNotMatch(apiSource, /\/api\/v1\/calendar/);
});

test("share popup renders link variants and profile-backed user cards", () => {
    assert.match(popupSource, /link\?\.variants/);
    assert.match(popupSource, /variant\.url/);
    assert.match(popupSource, /buildProfileAvatarMarkup/);
    assert.match(popupSource, /data-share-user-avatar-key/);
    assert.match(popupSource, /profileHandle/);
});

test("share popup adds a created token to history before refetching", () => {
    assert.match(popupSource, /state\.links = \[/);
    assert.match(popupSource, /String\(link\.id\).*String\(result\.id\)/s);
    assert.match(popupSource, /renderMethodPage\(\);\s*await refreshLinks\(\)/);
    assert.match(
        apiSource,
        /if \(!response\.ok\) throw new Error\("links_failed"\)/,
    );
    assert.match(popupSource, /pendingLinks: new Map\(\)/);
    assert.match(
        popupSource,
        /state\.pendingLinks\.set\(String\(result\.id\), result\)/,
    );
    assert.match(popupSource, /\.\.\.state\.pendingLinks\.values\(\)/);
});

test("share history supports email delivery and in-place update mode", () => {
    assert.match(popupSource, /data-share-email/);
    assert.match(popupSource, /editingShareId/);
    assert.match(popupSource, /await updateLink/);
    assert.match(linkPageSource, /Create Link Share/);
    assert.match(linkPageSource, /Update Link Share/);
    assert.match(userPageSource, /state\.recipients\.length/);
    assert.match(userPageSource, /Update User Share/);
    assert.match(linkPageSource, /openEmailPopup/);
    assert.match(linkPageSource, /await openPopup/);
    assert.match(linkPageSource, /labels\.emailRecipientsRequired/);
    assert.match(linkPageSource, /variant: "warning"/);
    assert.match(linkPageSource, /label: labels\.send/);
    assert.match(popupSource, /data-share-cancel-edit/);
    assert.match(popupSource, /clearEditMode/);
    assert.doesNotMatch(popupSource, /variant\.access === "write"/);
});

test("selected users retain lookup-card placement without visible handles", () => {
    assert.match(
        userPageSource,
        /share-links-user-results[\s\S]*share-links-selected-users/,
    );
    assert.match(popupSource, /profileHandle: recipient\.handle/);
    assert.doesNotMatch(popupSource, /recipient\.handle \? `<small>@/);
});

test("user share permissions constrain granted capabilities", async () => {
    const userPageModule = await import(
        new URL("../../../adapters/share/user/page.js", import.meta.url)
    );
    const baseInput = {
        recipients: [{ type: "user", id: "bob" }],
        defaultGrantedCapabilities: ["calendar:read", "calendar:write"],
    };
    assert.deepEqual(
        userPageModule.buildCreateOptions({
            ...baseInput,
            permission: "read",
        }).grantedCapabilities,
        ["calendar:read"],
    );
    assert.deepEqual(
        userPageModule.buildCreateOptions({
            ...baseInput,
            permission: "write",
        }).grantedCapabilities,
        ["calendar:read", "calendar:write"],
    );
});
