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
    assert.ok(keys.includes("writebackEnabled"));
    assert.ok(keys.includes("writebackBaseDn"));
});

test("ldap adapter password reset is blocked when current-password validation is unavailable", async () => {
    const adapter = createAdapter() as {
        configure(config: Record<string, unknown>): void;
        setClient(client: {
            authenticate: (token: string) => Promise<null>;
            updatePassword: (
                accountId: string,
                nextPassword: string,
                options?: { baseDn?: string; userAttribute?: string },
            ) => Promise<boolean>;
        }): void;
        getPasswordResetSupport: () => { supported: boolean; reason?: string };
        resetPassword: (
            accountId: string,
            currentPassword: string,
            nextPassword: string,
        ) => Promise<{ updated: boolean; message?: string }>;
    };
    assert.equal(adapter.getPasswordResetSupport().supported, false);
    adapter.configure({
        writebackEnabled: true,
        writebackBaseDn: "ou=Users,dc=example,dc=org",
        writebackUserAttribute: "uid",
    });
    adapter.setClient({
        authenticate: async () => null,
        updatePassword: async (_accountId, _nextPassword, options) => {
            assert.equal(options?.baseDn, "ou=Users,dc=example,dc=org");
            assert.equal(options?.userAttribute, "uid");
            return true;
        },
    });
    const support = adapter.getPasswordResetSupport();
    assert.equal(support.supported, false);
    assert.match(support.reason ?? "", /cannot validate current password/i);
    const result = await adapter.resetPassword(
        "alice",
        "current-pass",
        "next-pass",
    );
    assert.equal(result.updated, false);
});
