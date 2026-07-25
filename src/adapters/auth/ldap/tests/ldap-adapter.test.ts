import test from "node:test";
import assert from "node:assert/strict";
import { createAdapter } from "../index.js";
import type { LdapRuntimeOptions } from "../index.js";
import {
    isDirectoryGroupEntry,
    isDnWithinBase,
    resolveDirectorySearchBases,
} from "../client.js";

test("LDAP discovery uses focused user and group bases with base DN fallback", () => {
    const common = {
        baseDn: "dc=example,dc=org",
        userDn: "ou=People,dc=example,dc=org",
        groupDn: "ou=Groups,dc=example,dc=org",
    } as LdapRuntimeOptions;
    assert.deepEqual(resolveDirectorySearchBases(common), {
        users: "ou=People,dc=example,dc=org",
        groups: "ou=Groups,dc=example,dc=org",
    });
    assert.deepEqual(
        resolveDirectorySearchBases({
            ...common,
            userDn: " ",
            groupDn: "",
        }),
        {
            users: "dc=example,dc=org",
            groups: "dc=example,dc=org",
        },
    );
});

test("LDAP discovery excludes user objects from group results", () => {
    assert.equal(
        isDirectoryGroupEntry({
            objectClass: ["top", "person", "inetOrgPerson"],
            cn: "Alice",
        }),
        false,
    );
    assert.equal(
        isDirectoryGroupEntry({
            objectClass: ["top", "groupOfNames"],
            cn: "Teachers",
        }),
        true,
    );
});

test("LDAP discovery rejects entries returned outside the requested base", () => {
    assert.equal(
        isDnWithinBase(
            "cn=teachers,cn=groups,cn=accounts,dc=example,dc=org",
            "cn=groups,cn=accounts,dc=example,dc=org",
        ),
        true,
    );
    assert.equal(
        isDnWithinBase(
            "uid=alice,cn=users,cn=accounts,dc=example,dc=org",
            "cn=groups,cn=accounts,dc=example,dc=org",
        ),
        false,
    );
});

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
    assert.ok(keys.includes("userDn"));
    assert.ok(keys.includes("groupDn"));
    assert.ok(keys.includes("userAttribute"));
    assert.ok(keys.includes("writebackEnabled"));
    assert.ok(keys.includes("writebackBaseDn"));
});

test("ldap test configuration returns only client-discovered directory entries", async () => {
    const adapter = createAdapter() as {
        setClient(client: {
            authenticate: () => Promise<null>;
            discover: (options: Record<string, unknown>) => Promise<{
                users: never[];
                groups: Array<{ name: string; dn: string }>;
                supportsMemberOf: boolean;
                directoryFlavor: "freeipa";
            }>;
        }): void;
        testConfiguration(config: Record<string, unknown>): Promise<{
            groups: Array<{ name: string }>;
        }>;
    };
    adapter.setClient({
        authenticate: async () => null,
        discover: async (options) => {
            assert.equal(options.userAttribute, "employeeNumber");
            assert.equal(options.userDn, "ou=People,dc=example,dc=org");
            assert.equal(options.groupDn, "ou=Groups,dc=example,dc=org");
            return {
                users: [],
                groups: [
                    {
                        name: "real-directory-admins",
                        dn: "cn=real-directory-admins,cn=groups,dc=example,dc=org",
                    },
                ],
                supportsMemberOf: true,
                directoryFlavor: "freeipa",
            };
        },
    });
    const result = await adapter.testConfiguration({
        serverUrl: "ldaps://ldap.example.org",
        baseDn: "dc=example,dc=org",
        userDn: "ou=People,dc=example,dc=org",
        groupDn: "ou=Groups,dc=example,dc=org",
        bindDn: "uid=service,dc=example,dc=org",
        bindPassword: "secret",
        userAttribute: "employeeNumber",
    });
    assert.deepEqual(
        result.groups.map(({ name }) => name),
        ["real-directory-admins"],
    );
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
    assert.equal(
        support.reason,
        "gateway.auth.security.ldap.current_password_validation_unavailable",
    );
    const result = await adapter.resetPassword(
        "alice",
        "current-pass",
        "next-pass",
    );
    assert.equal(result.updated, false);
});
