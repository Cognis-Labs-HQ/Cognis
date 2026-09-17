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
    assert.match(source, /registration-invite-tabs/);
    assert.match(source, /delivery === "manual"/);
    assert.doesNotMatch(
        source,
        /registrationGatewayActive && smtpAdapterActive\s*\?[^:]+users-invite-btn/,
    );
});

test("Registration invite UI loads gateway strings and component styles", async () => {
    const clientSource = await readFile(
        new URL("../../gateways/registration/ui/client.js", import.meta.url),
        "utf8",
    );
    const styles = await readFile(
        new URL("../../gateways/registration/ui/invite.css", import.meta.url),
        "utf8",
    );
    assert.match(clientSource, /gateways\/registration\/languages/);
    assert.match(clientSource, /gateways\/registration\/invite\.css/);
    assert.match(styles, /\.registration-invite-tab\.is-active/);
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
