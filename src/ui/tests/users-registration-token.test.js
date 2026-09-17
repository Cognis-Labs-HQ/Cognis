import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("Users invitations use the mandatory registration token adapter", async () => {
    const source = await readFile(
        new URL("../app/users/index.js", import.meta.url),
        "utf8",
    );
    assert.match(source, /gateways\/registration\/client\.js/);
    assert.match(source, /createRegistrationToken/);
    assert.match(source, /share-method-tabs/);
    assert.match(source, /delivery === "manual"/);
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

test("Invite popup creates a manual invite only after confirmation", async () => {
    const source = await readFile(
        new URL("../app/users/index.js", import.meta.url),
        "utf8",
    );
    assert.match(source, /createRegistrationToken\(\s*apiFetch,\s*\{/);
    assert.match(source, /delivery === "manual"/);
    assert.match(source, /payload\?\.data\?\.inviteUrl/);
    assert.match(source, /data-invite-method-panel/);
    assert.doesNotMatch(source, /data-invite-token-result/);
    assert.doesNotMatch(source, /generateManualToken/);
});

test("Users invite popup does not depend on a selected table user", async () => {
    const source = await readFile(
        new URL("../app/users/index.js", import.meta.url),
        "utf8",
    );
    const triggerInviteFlow = source.match(
        /async function triggerInviteFlow\(\) \{[\s\S]*?\n\}/,
    )?.[0];
    assert.ok(triggerInviteFlow);
    assert.doesNotMatch(triggerInviteFlow, /\buser\?\./);
    assert.match(triggerInviteFlow, /id: "create"/);
});
