import assert from "node:assert/strict";
import test from "node:test";
import { createExternalProfileRegistry } from "../external-profile.js";

test("external profile providers register through an owner-scoped resolver", async () => {
    const registry = createExternalProfileRegistry();
    const dispose = registry.register("x-sso", async ({ accountId }) => ({
        displayName: `Profile ${accountId}`,
        bio: "Imported biography",
        avatar: {
            content: new Uint8Array([1, 2, 3]),
            contentType: "image/png",
        },
    }));
    const profile = await registry.resolve({
        providerId: "x-sso",
        accountId: "account-1",
        externalUserId: "external-1",
        session: {},
    });
    assert.equal(profile?.displayName, "Profile account-1");
    assert.equal(profile?.bio, "Imported biography");
    assert.equal(dispose(), true);
    assert.equal(
        await registry.resolve({
            providerId: "x-sso",
            accountId: "account-1",
            externalUserId: "external-1",
            session: {},
        }),
        null,
    );
});

test("external profile providers cannot replace another provider registration", () => {
    const registry = createExternalProfileRegistry();
    registry.register("x-sso", async () => null);
    assert.throws(
        () => registry.register("x-sso", async () => null),
        /external_profile_provider_already_registered/,
    );
});
