import assert from "node:assert/strict";
import test from "node:test";
import { createHost } from "./reuse/grant-host.js";
import { resolveShareGuestId } from "../reuse/share-guest.js";

async function guestHost(context) {
    const credentials = new Map();
    const host = await createHost(context, ({ capabilities }) => {
        capabilities.require("auth:routeContext").getCapability =
            capabilities.get.bind(capabilities);
        capabilities.contribute(
            "auth:readCredentialClaims",
            (request, purpose) => {
                const claims = credentials.get(
                    request.headers.authorization.replace(/^Bearer /, ""),
                );
                return claims?.purpose === purpose ? claims : null;
            },
        );
    });
    const share = await host.issue({
        metadata: { adapterId: "link" },
        accessControls: { recipients: [] },
    });
    const guestId = "synthetic-guest";
    host.database.tables.get("share_guest_profiles").push({
        guest_id: guestId,
        share_id: share.id,
        display_name: "Synthetic Guest",
        avatar_key: null,
        created_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + 60_000).toISOString(),
    });
    credentials.set("synthetic-credential", {
        sub: `share:${share.id}:${guestId}`,
        role: "user",
        providerId: "share",
        purpose: "share",
        setupPending: false,
    });
    const request = { headers: { authorization: "synthetic-credential" } };
    return {
        ...host,
        credentials,
        share,
        request,
        authenticate: () =>
            host.capabilities.require("share:getGuestClaims")(request),
        record: host.database.tables
            .get("share_tokens")
            .find((row) => row.id === share.id),
    };
}

test("registered guest admission binds verified purpose to a live grant and guest profile", async (context) => {
    const host = await guestHost(context);
    const claims = await host.authenticate();
    assert.equal(claims.purpose, "share");
    assert.equal(
        (
            await host.dispatch(
                "GET",
                "synthetic-credential",
                `/api/v1/share/status/${host.share.id}`,
            )
        ).statusCode,
        200,
    );

    const resolve = host.capabilities.require("share:resolveGuestAccess");
    const target = {
        claims,
        resourceType: "fixture",
        resourceId: "resource-1",
        requiredCapability: "read",
    };
    assert.equal((await resolve(target)).authorized, true);
    assert.equal(
        (await resolve({ ...target, resourceId: "unrelated" })).authorized,
        false,
    );
    assert.equal(
        (await resolve({ ...target, requiredCapability: "write" })).authorized,
        false,
    );
    assert.equal(resolveShareGuestId({ ...claims, purpose: "session" }), "");
    host.credentials.set("synthetic-credential", {
        ...claims,
        purpose: "session",
    });
    assert.equal(await host.authenticate(), null);
    host.credentials.delete("synthetic-credential");
    assert.equal(await host.authenticate(), null);
});

test("guest admission observes expiry, grant revocation, recipient changes and deletion", async (context) => {
    const host = await guestHost(context);
    const original = { ...host.record };
    for (const change of [
        { expires_at: new Date(Date.now() - 1_000).toISOString() },
        { expires_at: "invalid-date" },
        { granted_capabilities: "[]" },
        {
            access_controls: JSON.stringify({
                recipients: [{ type: "user", id: "other" }],
            }),
        },
    ]) {
        Object.assign(host.record, original, change);
        assert.equal(await host.authenticate(), null);
    }
    Object.assign(host.record, original);
    assert.ok(await host.authenticate());
    const profile = host.database.tables.get("share_guest_profiles")[0];
    profile.share_id = "different-share";
    assert.equal(await host.authenticate(), null);
    profile.share_id = host.share.id;
    profile.expires_at = new Date(Date.now() - 1_000).toISOString();
    assert.equal(await host.authenticate(), null);
    profile.expires_at = new Date(Date.now() + 60_000).toISOString();
    await host.capabilities.require("share:deleteToken")({
        shareId: host.share.id,
    });
    assert.equal(await host.authenticate(), null);
});
