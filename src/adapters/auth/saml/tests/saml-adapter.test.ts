import test from "node:test";
import assert from "node:assert/strict";
import { createAdapter } from "../index.js";

test("saml adapter returns null when no client set", async () => {
    const adapter = createAdapter();
    const ctx = await adapter.authenticate({ assertion: "abc" });
    assert.equal(ctx, null);
});

test("saml adapter config schema has required fields", () => {
    const adapter = createAdapter();
    const schema = adapter.getConfigSchema();
    const keys = schema.map((f) => f.key);
    assert.ok(keys.includes("entryPoint"));
    assert.ok(keys.includes("certificate"));
});
