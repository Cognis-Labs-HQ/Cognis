import assert from "node:assert/strict";
import test from "node:test";
import { isExpired } from "../gateway/store.js";
import { createHost } from "./reuse/grant-host.js";

test("registered Share grants enforce expiration without losing recipient, password or adapter checks", async (context) => {
    const host = await createHost(context);
    const share = await host.issue({
        expiresAt: new Date(Date.now() + 60_000).toISOString(),
        password: "synthetic-fixture-password",
    });
    await assert.rejects(host.read(), /resource_access_denied/);
    const unlock = host.capabilities.require("share:unlockUserAccess");
    const unlockInput = {
        shareId: share.id,
        accountId: "recipient",
        resourceType: "fixture",
        resourceId: "resource-1",
        requiredCapability: "read",
    };
    assert.equal(await unlock({ ...unlockInput, password: "wrong" }), false);
    assert.equal(
        await unlock({
            ...unlockInput,
            password: "synthetic-fixture-password",
        }),
        true,
    );
    await host.read();
    await assert.rejects(
        host.read({ accountId: "stranger" }),
        /resource_access_denied/,
    );
    await assert.rejects(
        host.read({ requiredCapability: "write" }),
        /resource_access_denied/,
    );
    await assert.rejects(
        host.read({ resourceId: "missing" }),
        /resource_access_denied/,
    );
    const stored = host.database.tables
        .get("share_tokens")
        .find((row) => row.id === share.id);
    stored.expires_at = new Date(Date.now() - 60_000).toISOString();
    await assert.rejects(host.read(), /resource_access_denied/);
    assert.ok(
        await host.capabilities.require("share:getTokenById")(share.id),
        "Expired history remains retained",
    );
    stored.password_hash = null;
    await assert.rejects(host.read(), /resource_access_denied/);
    stored.expires_at = "not-a-date";
    await assert.rejects(host.read(), /resource_access_denied/);
    stored.expires_at = "";
    await host.read();
    const disabled = await host.dispatch(
        "POST",
        "owner-token",
        "/api/v1/gateways/share/adapters/user/disable",
    );
    assert.equal(disabled.statusCode, 200);
    await assert.rejects(host.read(), /resource_access_denied/);
    const enabled = await host.dispatch(
        "POST",
        "owner-token",
        "/api/v1/gateways/share/adapters/user/enable",
    );
    assert.equal(enabled.statusCode, 200);
    await host.read();
    stored.metadata = JSON.stringify({ adapterId: "unavailable" });
    await assert.rejects(host.read(), /resource_access_denied/);
});

test("PATCH replaces empty grants, preserves omitted grants and enforces subsequent access", async (context) => {
    const host = await createHost(context);
    const share = await host.issue();
    const endpoint = `/api/v1/share/tokens/${share.id}`;
    await host.read();
    const denied = await host.dispatch("PATCH", "recipient-token", endpoint, {
        grantedCapabilities: [],
    });
    assert.equal(denied.statusCode, 404);
    await host.read();
    const omitted = await host.dispatch("PATCH", "owner-token", endpoint, {
        label: "Renamed",
    });
    assert.equal(omitted.statusCode, 200);
    assert.deepEqual(omitted.body.data.grantedCapabilities, ["read"]);
    await host.read();
    const replaced = await host.dispatch("PATCH", "owner-token", endpoint, {
        grantedCapabilities: ["write"],
    });
    assert.equal(replaced.statusCode, 200);
    assert.deepEqual(replaced.body.data.grantedCapabilities, ["write"]);
    await assert.rejects(host.read(), /resource_access_denied/);
    await host.read({ requiredCapability: "write" });
    const revoked = await host.dispatch("PATCH", "owner-token", endpoint, {
        grantedCapabilities: [],
    });
    assert.equal(revoked.statusCode, 200);
    assert.deepEqual(revoked.body.data.grantedCapabilities, []);
    const stored = await host.capabilities.require("share:getTokenById")(
        share.id,
    );
    assert.deepEqual(stored.grantedCapabilities, []);
    await assert.rejects(
        host.read({ requiredCapability: "write" }),
        /resource_access_denied/,
    );
    await assert.rejects(host.read(), /resource_access_denied/);
});

test("expiry policy preserves only the empty sentinel and rejects elapsed or malformed dates", (context) => {
    const now = Date.parse("2026-11-13T12:00:00.000Z");
    context.mock.method(Date, "now", () => now);
    assert.equal(isExpired(""), false);
    assert.equal(isExpired(new Date(now + 1).toISOString()), false);
    assert.equal(isExpired(new Date(now).toISOString()), true);
    assert.equal(isExpired(new Date(now - 1).toISOString()), true);
    assert.equal(isExpired("not-a-date"), true);
    assert.equal(isExpired(" "), true);
});
