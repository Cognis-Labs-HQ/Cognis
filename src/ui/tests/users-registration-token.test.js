import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("Users invitations use the mandatory registration token adapter", async () => {
    const source = await readFile(
        new URL("../app/users/index.js", import.meta.url),
        "utf8",
    );
    assert.match(source, /entry\.id === "token"/);
    assert.match(source, /api\/v1\/registration\/tokens/);
    assert.match(source, /share-method-tabs/);
    assert.match(source, /delivery === "manual"/);
    assert.doesNotMatch(
        source,
        /registrationGatewayActive && smtpAdapterActive\s*\?[^:]+users-invite-btn/,
    );
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
