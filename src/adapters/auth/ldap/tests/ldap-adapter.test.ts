import test from "node:test";
import assert from "node:assert/strict";
import { createAdapter } from "../index.js";

test("ldap adapter returns null when no client set", async () => {
    const adapter = createAdapter();
    const ctx = await adapter.authenticate({ accessToken: "token" });
    assert.equal(ctx, null);
});

test("ldap adapter config schema has required fields", () => {
    const adapter = createAdapter();
    const schema = adapter.getConfigSchema();
    const keys = schema.map((f) => f.key);
    assert.ok(keys.includes("host"));
    assert.ok(keys.includes("bindDn"));
    assert.ok(keys.includes("baseDn"));
});
