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
const sharePageSource = await readFile(
    new URL("../ui/app/index.js", import.meta.url),
    "utf8",
);
const accountShareAppSource = await readFile(
    new URL("../ui/app/account-share/index.js", import.meta.url),
    "utf8",
);
const accountShareHtmlSource = await readFile(
    new URL("../ui/user-share.html", import.meta.url),
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
const statusMonitorSource = await readFile(
    new URL("../ui/status-monitor.js", import.meta.url),
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

test("public Share page disables page layout editing", () => {
    assert.match(shareAppSource, /allowCustomization:\s*false/);
    assert.match(shareAppSource, /enableAccountEnhancements:\s*false/);
    assert.match(shareAppSource, /shareContext: routedShareContext/);
    assert.match(shareAppSource, /routedShareContext\s*\? null/);
    assert.match(
        shareAppSource,
        /authenticated: true, shareContext: routedShareContext/,
    );
});

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
    assert.match(
        popupSource,
        /state\.editingShareId &&[\s\S]*selectedMethodId !== state\.activeMethodId[\s\S]*clearEditMode\(\)/,
    );
    assert.match(popupSource, /await updateLink/);
    assert.match(
        popupSource,
        /updateButton\?\.classList\.add\("btn-confirm"\)/,
    );
    assert.match(apiSource, /expiresAt: String\(expiresAt \?\? ""\)\.trim\(\)/);
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
    const existingShare = {
        id: "share-1",
        label: "Planning",
        expiresAt: "2030-01-01T00:00:00.000Z",
        accessControls: {
            permissions: ["read"],
            recipients: [{ type: "user", id: "bob" }],
        },
    };
    assert.equal(
        userPageModule.findExistingShare([existingShare], baseInput),
        existingShare,
    );
    assert.equal(
        userPageModule.hasShareChanges(existingShare, {
            label: "Planning",
            expiresAt: "2030-01-01T00:00:00.000Z",
            accessControls: { permissions: ["read"] },
        }),
        false,
    );
    assert.equal(
        userPageModule.hasShareChanges(existingShare, {
            label: "Updated Planning",
            expiresAt: "2030-01-01T00:00:00.000Z",
            accessControls: { permissions: ["read"] },
        }),
        true,
    );
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
    assert.match(userPageSource, /state\.supportsReadOnly \?/);
    assert.match(popupSource, /hidePermissionLabels: !state\.supportsReadOnly/);
    assert.match(
        popupSource,
        /state\.supportsReadOnly[\s\S]*\? selectedShare\.accessControls/,
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
    assert.match(sessionFlowSource, /if \(shareData\.directAccess === true\)/);
    assert.match(
        sessionFlowSource,
        /guestAccessToken: shareData\.guestAccessToken/,
    );
    assert.match(shareAppSource, /import "\.\.\/session-flow-hooks\.js"/);
    assert.match(shareButtonSource, /accountId\.startsWith\("share:"\)/);
    assert.match(
        sessionFlowSource,
        /isUserShare && shareData\.directAccess !== true[\s\S]*recipient_restricted/,
    );
    assert.match(
        sessionFlowSource,
        /resolveActiveShareContentSession\(activeShareSession\)/,
    );
    assert.match(
        sessionFlowSource,
        /if \(isViewingAsGuest\(\)\) restoreGuestToken\(\)/,
    );
    assert.match(
        sessionFlowSource,
        /"validate-stored-token"[\s\S]*restore-account-session[\s\S]*order: -100[\s\S]*shareToken\.startsWith\("shr_"\)[\s\S]*restoreGuestToken\(\)/,
    );
    assert.match(
        sessionFlowSource,
        /if \(!shareToken\.startsWith\("shr_"\)\)[\s\S]*recipient_restricted[\s\S]*await activateGuestToken/,
    );
    assert.match(
        sessionFlowSource,
        /session\.isGuestSession === true[\s\S]*shareContext: null/,
    );
});

test("share buttons use the neutral consequence style", () => {
    assert.match(shareButtonSource, /\[\.\.\.classes, "btn-neutral"\]/);
    assert.match(shareButtonSource, /"btn-confirm", "btn-neutral"/);
});

test("anonymous share guests activate a temporary unlocked keyring", () => {
    assert.match(
        sessionFlowSource,
        /import "\/static\/reuse\/account-context\.js"/,
    );
    assert.match(sessionFlowSource, /guestKeyring: shareData\.guestKeyring/);
    assert.match(
        sessionFlowSource,
        /directAccess: shareData\.directAccess === true/,
    );
    assert.match(
        sessionFlowSource,
        /ACCESS_DENIED_TOKEN_KEY\) === shareToken[\s\S]*share_access_denied/,
    );
    assert.match(sessionFlowSource, /keyring:activateTemporary/);
    assert.match(sessionFlowSource, /await activateGuestToken/);
    assert.match(
        sessionFlowSource,
        /const hasAccountSession = hasStoredAccountSession\(\)[\s\S]*!guestSessionAlreadyActive \|\| hasAccountSession/,
    );
    assert.match(
        sessionFlowSource,
        /hasStoredAccountSession\(\)[\s\S]*discardStaleGuestMarkers\(\)[\s\S]*restoreGuestToken\(\)/,
    );
    assert.match(
        sessionFlowSource,
        /isViewingAsGuest\(\) && hasAccountSession[\s\S]*discardStaleGuestMarkers\(\)[\s\S]*shareToken\.startsWith\("shr_"\)/,
    );
    assert.match(
        sessionFlowSource,
        /document\.body\.dataset\.shareGuest = "true"/,
    );
    assert.match(
        sessionFlowSource,
        /delete document\.body\.dataset\.shareGuest/,
    );
    assert.match(
        sessionFlowSource,
        /sessionStorage\.setItem\(ACCESS_DENIED_TOKEN_KEY, shareToken\);[\s\S]*restoreGuestToken\(\);[\s\S]*capabilities\.get\("ui:navigate"\)/,
    );
    assert.doesNotMatch(
        sessionFlowSource,
        /import\("\/static\/reuse\/app-router\.js"\)/,
    );
    assert.match(sessionFlowSource, /activeShareSession\?\.shareToken/);
    assert.match(
        sessionFlowSource,
        /activeShareSession\?\.shareToken === shareToken[\s\S]*return activeShareSession\.session/,
    );
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
    assert.match(sessionFlowSource, /if \(shareData\.directAccess === true\)/);
    assert.doesNotMatch(
        sessionFlowSource,
        /hasValidatedAccountSession && shareData\.directAccess === true/,
    );
    assert.match(sessionFlowSource, /!isViewingAsGuest\(\)/);
    assert.match(sessionFlowSource, /!ownAccountId\.startsWith\("share:"\)/);
    assert.match(receivedShareSource, /if \(useAccountKeyring\)/);
    assert.match(
        receivedShareSource,
        /allowSave: useAccountKeyring && keyringUnlocked/,
    );
});

test("component page renderers receive the root used by meeting shares", () => {
    assert.match(shareAppSource, /navigateTo\(shareContext\.contentUrl\)/);
    assert.match(
        shareAppSource,
        /shareContext\.contentUrl && shareContext\.directAccess === true/,
    );
    assert.match(shareAppSource, /if \(navigated\) return/);
    assert.match(shareAppSource, /root\.replaceChildren\(\)/);
    assert.match(shareAppSource, /mountSharedPage\(root/);
    assert.doesNotMatch(shareAppSource, /preserveShareShell/);
    assert.doesNotMatch(shareAppSource, /share-resource-mount-root/);
});

test("received user shares navigate once through the share session flow", () => {
    assert.match(receivedShareActionSource, /event\.defaultPrevented/);
    assert.match(receivedShareActionSource, /event\.preventDefault\(\)/);
    assert.match(receivedShareActionSource, /navigateTo\(sharePath\)/);
    assert.doesNotMatch(receivedShareActionSource, /resolveReceivedShare/);
    assert.doesNotMatch(receivedShareActionSource, /invalid_token/);
    assert.match(receivedShareSource, /response\.status !== 401/);
    assert.match(receivedShareSource, /await promptForPassword\(\{/);
    assert.match(receivedShareSource, /while \(response\.status === 401\)/);
    assert.match(receivedShareSource, /share\.error\.invalid_password/);
    assert.match(statusMonitorSource, /ACTIVE_POLL_INTERVAL_MS = 5_000/);
    assert.match(statusMonitorSource, /document\.hidden/);
    assert.match(statusMonitorSource, /visibilitychange/);
    assert.match(receivedShareActionSource, /watchShareStatus/);
    assert.match(sessionFlowSource, /watchShareStatus/);
    assert.match(receivedShareSource, /keyring:forComponent/);
    assert.match(receivedShareSource, /share\.unlock\.keyring_label/);
    assert.match(receivedShareSource, /"Share Gateway"/);
    assert.match(receivedShareSource, /share-unlock-save/);
    assert.match(receivedShareSource, /cognis-icon\.png/);
    assert.match(receivedShareSource, /share-unlock-brand/);
    assert.match(receivedShareSource, /type="checkbox" checked/);
    assert.match(receivedShareSource, /saveToKeyring/);
    assert.match(
        receivedShareSource,
        /identifiers\.push\(`share:\$\{shareId\}`\)/,
    );
    assert.match(receivedShareSource, /share:fetchProtectedResource/);
    assert.match(
        receivedShareSource,
        /resolveAccountShare[\s\S]*keyringId = `share:\$\{normalizedShareId\}`/,
    );
    assert.match(receivedShareActionSource, /passwordProtected:/);
    assert.match(
        receivedShareSource,
        /passwordProtected \? null : await request\(null\)/,
    );
    assert.match(
        receivedShareSource,
        /let response = await request\(null\);[\s\S]*response\.status !== 401[\s\S]*unlockKeyringForShare/,
    );
    assert.match(
        receivedShareSource,
        /storedPassword = keyring\?\.get\(keyringId\)[\s\S]*request\(storedPassword\)/,
    );
    assert.match(
        receivedShareSource,
        /response\.ok && entered\.saveToKeyring[\s\S]*keyring\?\.set\(keyringId/,
    );
    assert.match(receivedShareSource, /keyring:requestUnlock/);
    assert.match(receivedShareSource, /promptWhenLocked = true/);
    assert.match(
        receivedShareSource,
        /response.status !== 401 \|\| !promptWhenLocked/,
    );
    assert.match(
        receivedShareSource,
        /allowSave: useAccountKeyring && keyringUnlocked/,
    );
    assert.match(
        receivedShareSource,
        /promptForPassword\(\{ allowSave: keyringUnlocked \}\)/,
    );
    assert.match(
        sessionFlowSource,
        /useAccountKeyring: hasValidatedAccountSession/,
    );
    assert.match(
        receivedShareSource,
        /let response = await request\(null\);[\s\S]*if \(response\.status !== 401\) return response;[\s\S]*unlockKeyringForShare/,
    );
    assert.match(receivedShareSource, /share\.keyring\.request_component/);
    assert.match(receivedShareSource, /share\.keyring\.request_action_access/);
    assert.match(receivedShareSource, /share\.keyring\.request_process/);
});

test("account shares use an authenticated page without guest-session bootstrap", () => {
    assert.doesNotMatch(sessionFlowSource, /resolveAccountShare|usr_/);
    assert.match(accountShareAppSource, /resolveAccountShare/);
    assert.match(accountShareAppSource, /requireAccountSession:\s*true/);
    assert.match(accountShareHtmlSource, /app\/account-share\/index\.js/);
    assert.doesNotMatch(accountShareHtmlSource, /session-flow-hooks\.js/);
});

test("account-share password prompts omit public Share branding", () => {
    assert.match(
        receivedShareSource,
        /resolveAccountShare[\s\S]*promptForPassword\(\{[\s\S]*showBrand:\s*false/,
    );
});

test("share owners bypass recipient password prompting", () => {
    assert.match(receivedShareActionSource, /ownedByCurrentAccount/);
    assert.match(
        receivedShareActionSource,
        /share\?\.passwordProtected === true && !ownedByCurrentAccount/,
    );
});

test("share resolution uses the authenticated API client without treating password challenges as session failures", () => {
    assert.match(receivedShareSource, /import \{ apiFetch \}/);
    assert.match(receivedShareSource, /suppressAccessDeniedEvent: true/);
    assert.doesNotMatch(sessionFlowSource, /authorization: "Bearer "/);
    assert.match(sessionFlowSource, /errorCode === "recipient_restricted"/);
    assert.match(
        sessionFlowSource,
        /resolveShareTokenFromRoute\(\s*stageCtx\.input\?\.routePath/,
    );
    assert.match(
        sessionFlowSource,
        /isViewingAsGuest\(\)[\s\S]*PREV_ACCESS_TOKEN_KEY[\s\S]*restoreGuestToken\(\)/,
    );
    assert.match(sessionFlowSource, /listenForShareRevocation/);
    assert.match(sessionFlowSource, /shareId: String\(shareData\.shareId/);
    assert.match(statusMonitorSource, /\/api\/v1\/share\/status\//);
    assert.match(sessionFlowSource, /startShareStatusMonitor/);
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

test("guest sessions can re-assert their disposable keyring without prompting", () => {
    assert.match(sessionFlowSource, /session:ensureGuestKeyring/);
    assert.match(sessionFlowSource, /activeGuestKeyring/);
    assert.match(sessionFlowSource, /keyring:activateTemporary/);
});

test("unavailable share links navigate to the native error page", () => {
    assert.match(sessionFlowSource, /response\.status === 404/);
    assert.match(
        sharePageSource,
        /function navigateToShareError\(i18n, reason\)/,
    );
    assert.match(sharePageSource, /const code = notFound \? "404" : "410"/);
    assert.match(
        sharePageSource,
        /\/error\?code=\$\{code\}&message=\$\{encodeURIComponent\(message\)\}/,
    );
    assert.match(sharePageSource, /window\.location\.replace\(destination\)/);
});
