import test from "node:test";
import assert from "node:assert/strict";
import { createAdapter } from "../index.js";

test("oidc adapter returns null when no client set", async () => {
    const adapter = createAdapter();
    const ctx = await adapter.authenticate({ accessToken: "token" });
    assert.equal(ctx, null);
});

test("oidc adapter config schema has required fields", () => {
    const adapter = createAdapter();
    const schema = adapter.getConfigSchema();
    const keys = schema.map((f) => f.key);
    assert.ok(keys.includes("clientId"));
    assert.ok(keys.includes("discoveryUrl"));
});

test("oidc adapter password reset remains provider-managed", () => {
    const adapter = createAdapter();
    const support = adapter.getPasswordResetSupport?.();
    assert.equal(support?.supported, false);
    assert.match(support?.reason ?? "", /OIDC identity provider/i);
});
