import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("Users invitations use the mandatory registration token adapter", async () => {
    const source = await readFile(
        new URL("../app/users/index.js", import.meta.url),
        "utf8",
    );
    assert.match(source, /gateways\/registration\/client\.js/);
    assert.match(source, /href="\/invite"/);
    assert.doesNotMatch(
        source,
        /registrationGatewayActive && smtpAdapterActive\s*\?[^:]+users-invite-btn/,
    );
});

test("Registration invite UI uses the same shared tabs as Share", async () => {
    const clientSource = await readFile(
        new URL("../../gateways/registration/ui/client.js", import.meta.url),
        "utf8",
    );
    const styles = await readFile(
        new URL("../styles/reuse/method-tabs.css", import.meta.url),
        "utf8",
    );
    const shareSource = await readFile(
        new URL(
            "../../adapters/share/link/ui/share-links-popup/implementation.js",
            import.meta.url,
        ),
        "utf8",
    );
    assert.match(clientSource, /gateways\/registration\/languages/);
    assert.match(styles, /\.share-method-tab\.is-active/);
    assert.match(shareSource, /share-method-tabs/);
});

test("Registration token adapter owns the SSO authorization form", async () => {
    const source = await readFile(
        new URL(
            "../../adapters/registration/token/ui/authorization.js",
            import.meta.url,
        ),
        "utf8",
    );
    assert.match(source, /renderAccountCreationAuthorization/);
    assert.match(source, /authorizePendingAccountCreation/);
    assert.match(source, /cancelPendingAccountCreation/);
    assert.match(source, /persistLoginSession/);
    assert.match(source, /type: "password"/);
    assert.match(source, /adapter\.registration\.token\.created/);
    assert.match(source, /window\.location\.replace\("\/login"\)/);
});

test("Users invite control navigates to invite management", async () => {
    const source = await readFile(
        new URL("../app/users/index.js", import.meta.url),
        "utf8",
    );
    assert.match(source, /href="\/invite"/);
    assert.doesNotMatch(source, /triggerInviteFlow/);
});

test("Invite management uses explicit popup and token actions", async () => {
    const source = await readFile(
        new URL("../app/invite/index.js", import.meta.url),
        "utf8",
    );
    assert.match(source, /gateway\.registration\.send_invite_email/);
    assert.match(source, /gateway\.registration\.generate_registration_token/);
    assert.match(source, /openPopup/);
    assert.match(source, /registrationToken/);
    assert.match(source, /renderSecretVisibilityField/);
    assert.match(source, /copyTextToClipboard/);
    assert.match(source, /popup-action-btn--copied/);
    assert.match(source, /refreshElements\(\["invite-tokens"\]\)/);
    assert.match(source, /enableDomParking: false/);
    assert.match(source, /redeemedAccountId/);
    assert.match(source, /isPending \? \(issuedTokens\.get\(row\.id\)/);
    assert.match(source, /issuedTokens\.delete\(tokenId\)/);
    assert.doesNotMatch(source, /data-invite-delivery/);
});

test("Users page does not retain the old invite popup", async () => {
    const source = await readFile(
        new URL("../app/users/index.js", import.meta.url),
        "utf8",
    );
    assert.doesNotMatch(source, /async function triggerInviteFlow/);
    assert.doesNotMatch(source, /data-invite-delivery/);
});
