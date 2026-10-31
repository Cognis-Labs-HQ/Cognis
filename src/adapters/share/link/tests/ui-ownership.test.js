import assert from "node:assert/strict";

import { readFile } from "node:fs/promises";

import test from "node:test";

const popupSource = await Promise.all(
    ["index.js", "implementation.js", "rendering.js"].map((fileName) =>
        readFile(
            new URL(`../ui/share-links-popup/${fileName}`, import.meta.url),
            "utf8",
        ),
    ),
).then((sources) => sources.join("\n"));

const linkPageSource = await readFile(
    new URL("../page.js", import.meta.url),
    "utf8",
);

test("share popup owns user recipient search and selection", () => {
    assert.match(popupSource, /share-links-user-search/);
    assert.match(popupSource, /data-share-user-id/);
    assert.match(popupSource, /state\.activeMethodId === "user"/);
    assert.match(popupSource, /data-selected-recipient-remove/);
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
    assert.match(
        popupSource,
        /defaultGrantedCapabilities: grantedCapabilities/,
    );
});

test("share popup callbacks use only share gateway recipient and token routes", () => {
    assert.match(popupSource, /renderPasswordProtectionField/);
    assert.match(popupSource, /createFormBuilder/);
    assert.match(popupSource, /required: state\.passwordRequired/);
    assert.match(popupSource, /passwordForm\.reportValidity\(\)/);
    assert.match(popupSource, /renderInfoTooltip/);
    assert.match(popupSource, /data-share-generate-password/);
    assert.match(popupSource, /crypto\.getRandomValues/);
    assert.match(popupSource, /duplicate_user_share/);
    assert.match(popupSource, /labels\.duplicateUserShare/);
});

test("share popup renders link variants with optional avatar capabilities", () => {
    assert.match(popupSource, /link\?\.variants/);
    assert.match(popupSource, /variant\.url/);
    assert.match(popupSource, /ui:profileAvatarRenderer/);
    assert.doesNotMatch(popupSource, /static\/gateways\/social/);
    assert.match(popupSource, /data-share-user-avatar-key/);
    assert.match(popupSource, /profileHandle/);
});

test("share popup adds a created token to history before refetching", () => {
    assert.match(popupSource, /state\.links = \[/);
    assert.match(popupSource, /String\(link\.id\).*String\(result\.id\)/s);
    assert.match(popupSource, /renderMethodPage\(\);\s*await refreshLinks\(\)/);
    assert.match(popupSource, /pendingLinks: new Map\(\)/);
    assert.match(
        popupSource,
        /state\.pendingLinks\.set\(String\(result\.id\), result\)/,
    );
    assert.match(popupSource, /\.\.\.state\.pendingLinks\.values\(\)/);
});

test("share history supports email delivery and form-based update mode", () => {
    assert.match(popupSource, /data-share-email/);
    assert.match(popupSource, /editingShareId/);
    assert.match(
        popupSource,
        /state\.editingShareId &&[\s\S]*selectedMethodId !== state\.activeMethodId[\s\S]*clearEditMode\(\)/,
    );
    assert.match(popupSource, /await updateLink/);
    assert.match(
        popupSource,
        /updateButton\?\.classList\.add\("btn-confirm"\)/,
    );
    assert.match(linkPageSource, /Create Link Share/);
    assert.match(linkPageSource, /Update Link Share/);
    assert.match(linkPageSource, /openEmailPopup/);
    assert.match(linkPageSource, /await openPopup/);
    assert.match(linkPageSource, /labels\.emailRecipientsRequired/);
    assert.match(linkPageSource, /variant: "warning"/);
    assert.match(linkPageSource, /label: labels\.send/);
    assert.match(popupSource, /data-share-cancel-edit/);
    assert.match(popupSource, /clearEditMode/);
    assert.match(popupSource, /renderSecretVisibilityField/);
    assert.match(popupSource, /bindSecretVisibilityToggles/);
    assert.match(popupSource, /createdAtLabel/);
    assert.doesNotMatch(popupSource, /data-share-recipient-permission/);
    assert.doesNotMatch(popupSource, /data-share-recipient-remove/);
    assert.doesNotMatch(popupSource, /variant\.access === "write"/);
});

test("selected users retain lookup-card placement without visible handles", () => {
    assert.match(popupSource, /profileHandle: recipient\.handle/);
    assert.doesNotMatch(popupSource, /recipient\.handle \? `<small>@/);
});

test("share popup reuses an existing user share after duplicate rejection", () => {
    assert.match(
        popupSource,
        /duplicate_user_share[\s\S]*findExistingShare[\s\S]*updateLink/,
    );
});

test("share popup uses neutral close and destructive revoke actions", () => {
    assert.match(
        popupSource,
        /label: labels\.close \|\| labels\.done \|\| "Close",[\s\S]*variant: "neutral"/,
    );
    assert.match(
        popupSource,
        /label: labels\.confirm \|\| labels\.revoke,[\s\S]*variant: "cancel"/,
    );
});

test("share origins can suppress read-only choices", async () => {
    assert.match(popupSource, /supportsReadOnly = false/);
    assert.match(
        popupSource,
        /supportsReadOnly \|\|\s*option\?\.permissions\?\.includes\("write"\)/,
    );
    assert.match(popupSource, /hidePermissionLabels: !state\.supportsReadOnly/);
    assert.match(
        popupSource,
        /state\.supportsReadOnly[\s\S]*state\.allowedPermissions\.includes\("write"\)[\s\S]*selectedShare\.accessControls/,
    );
});

test("selected recipient badges track the pending permission", () => {
    assert.match(
        popupSource,
        /state\.recipients = state\.recipients\.map\(\(recipient\) => \(\{[\s\S]*permissions:/,
    );
    assert.match(popupSource, /renderSelectedUsers\(\)/);
});
