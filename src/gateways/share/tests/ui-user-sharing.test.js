import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const popupSource = await Promise.all(
    ["index.js", "implementation.js"].map((fileName) =>
        readFile(
            new URL(
                `../../../adapters/share/link/ui/share-links-popup/${fileName}`,
                import.meta.url,
            ),
            "utf8",
        ),
    ),
).then((sources) => sources.join("\n"));
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
const sessionFlowSource = await readFile(
    new URL("../ui/session-flow-hooks.js", import.meta.url),
    "utf8",
);
const receivedShareActionSource = await readFile(
    new URL("../ui/received-share-action.js", import.meta.url),
    "utf8",
);
const receivedShareSource = await readFile(
    new URL("../ui/received-share.js", import.meta.url),
    "utf8",
);
const shareAppSource = await readFile(
    new URL("../ui/app/index.js", import.meta.url),
    "utf8",
);
const shareButtonSource = await readFile(
    new URL("../ui/reuse/share-button.js", import.meta.url),
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
    assert.match(apiSource, /contentUrl/);
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
    assert.match(apiSource, /payload\?\.error\?\.code/);
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

test("share history supports email delivery and form-based update mode", () => {
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
    assert.match(popupSource, /renderSecretVisibilityField/);
    assert.match(popupSource, /bindSecretVisibilityToggles/);
    assert.match(popupSource, /createdAtLabel/);
    assert.doesNotMatch(popupSource, /data-share-recipient-permission/);
    assert.doesNotMatch(popupSource, /data-share-recipient-remove/);
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

test("selected recipient badges track the pending permission", () => {
    assert.match(
        popupSource,
        /state\.recipients = state\.recipients\.map\(\(recipient\) => \(\{[\s\S]*permissions:/,
    );
    assert.match(popupSource, /renderSelectedUsers\(\)/);
});

test("logged-in share recipients keep their account session", () => {
    assert.match(
        sessionFlowSource,
        /hasValidatedAccountSession &&\s*shareData\.directAccess === true/,
    );
    assert.match(
        sessionFlowSource,
        /guestAccessToken: shareData\.guestAccessToken/,
    );
    assert.match(shareAppSource, /import "\.\.\/session-flow-hooks\.js"/);
    assert.match(shareButtonSource, /accountId\.startsWith\("share:"\)/);
});

test("anonymous share guests activate a temporary unlocked keyring", () => {
    assert.match(
        sessionFlowSource,
        /capabilities\.contribute\("session:isGuest", isViewingAsGuest\)/,
    );
    assert.match(sessionFlowSource, /guestKeyring: shareData\.guestKeyring/);
    assert.match(sessionFlowSource, /keyring:activateTemporary/);
    assert.match(sessionFlowSource, /await activateGuestToken/);
    assert.match(sessionFlowSource, /activeGuestSession\?\.shareToken/);
    assert.match(
        sessionFlowSource,
        /activeGuestSession = \{ shareToken, session: guestSession \}/,
    );
    assert.match(sessionFlowSource, /guestSessionAlreadyActive/);
    assert.match(sessionFlowSource, /keyring:endTemporary/);
    assert.match(
        sessionFlowSource,
        /useAccountKeyring: hasValidatedAccountSession/,
    );
    assert.match(sessionFlowSource, /!isViewingAsGuest\(\)/);
    assert.match(sessionFlowSource, /!ownAccountId\.startsWith\("share:"\)/);
    assert.match(receivedShareSource, /if \(useAccountKeyring\)/);
    assert.match(
        receivedShareSource,
        /promptForPassword\(\{ allowSave: useAccountKeyring \}\)/,
    );
});

test("component page renderers receive the root used by meeting shares", () => {
    assert.match(shareAppSource, /root\.replaceChildren\(\)/);
    assert.match(shareAppSource, /mountSharedPage\(root/);
    assert.doesNotMatch(shareAppSource, /preserveShareShell/);
    assert.doesNotMatch(shareAppSource, /share-resource-mount-root/);
});

test("received user shares unlock in place and navigate to the component", () => {
    assert.match(receivedShareActionSource, /event\.preventDefault\(\)/);
    assert.match(receivedShareActionSource, /resolveReceivedShare/);
    assert.match(receivedShareActionSource, /useAccountKeyring/);
    assert.match(receivedShareActionSource, /payload\.data\.navigationUrl/);
    assert.match(receivedShareActionSource, /payload\.data\.guestAccessToken/);
    assert.match(receivedShareActionSource, /\? sharePath/);
    assert.match(
        receivedShareActionSource,
        /await navigateTo\(navigationUrl\)/,
    );
    assert.match(receivedShareSource, /response\.status !== 401/);
    assert.match(receivedShareSource, /await promptForPassword\(\)/);
    assert.match(receivedShareSource, /keyring:forComponent/);
    assert.match(receivedShareSource, /share\.unlock\.keyring_label/);
    assert.match(receivedShareSource, /"Share Gateway"/);
    assert.match(receivedShareSource, /share-unlock-save/);
    assert.match(receivedShareSource, /type="checkbox" checked/);
    assert.match(receivedShareSource, /saveToKeyring/);
    assert.match(
        receivedShareSource,
        /identifiers\.push\(`share:\$\{shareId\}`\)/,
    );
    assert.match(receivedShareActionSource, /payload\.data\.feedback/);
    assert.match(receivedShareActionSource, /variant: "success"/);
    assert.match(receivedShareSource, /share:fetchProtectedResource/);
    assert.match(receivedShareSource, /keyring:requestUnlock/);
    assert.match(
        receivedShareSource,
        /let response = await request\(null\);[\s\S]*if \(response\.status !== 401\) return response;[\s\S]*unlockKeyringForShare/,
    );
    assert.match(receivedShareActionSource, /response\.status === 404/);
    assert.match(receivedShareActionSource, /share\.error\.not_found/);
    assert.match(receivedShareSource, /share\.keyring\.request_component/);
    assert.match(receivedShareSource, /share\.keyring\.request_action_access/);
    assert.match(receivedShareSource, /share\.keyring\.request_process/);
});

test("share method adapters own localized display metadata", async () => {
    assert.match(userPageSource, /getMetadata/);
    assert.match(userPageSource, /adapter\.share\.user\.name/);
    const adapterSource = await readFile(
        new URL("../../../adapters/share/user/index.ts", import.meta.url),
        "utf8",
    );
    assert.match(adapterSource, /nameKey: "adapter\.share\.user\.name"/);
});
