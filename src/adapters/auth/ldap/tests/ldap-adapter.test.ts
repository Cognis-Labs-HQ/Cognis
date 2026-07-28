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

test("ldap adapter forwards every user-bound email for provisioning", async () => {
    const adapter = createAdapter() as ReturnType<typeof createAdapter> & {
        setClient(client: {
            authenticate: () => Promise<{
                id: string;
                email: string;
                emails: string[];
            }>;
        }): void;
    };
    adapter.setClient({
        authenticate: async () => ({
            id: "alice",
            email: "alice@example.org",
            emails: ["alice@example.org", "a.smith@example.org"],
        }),
    });

    const context = (await adapter.authenticate({
        username: "alice",
        password: "secret",
    })) as { email?: string; emails?: string[] } | null;

    assert.equal(context?.email, "alice@example.org");
    assert.deepEqual(context?.emails, [
        "alice@example.org",
        "a.smith@example.org",
    ]);
});

test("LDAP password confirmation preserves a separately namespaced source", async () => {
    const adapter = createAdapter() as ReturnType<typeof createAdapter> & {
        setClient(client: {
            authenticate: (
                username: string,
                password: string,
                options: LdapRuntimeOptions,
            ) => Promise<{ id: string; groups: string[] }>;
        }): void;
    };
    adapter.configure({
        unify: false,
        servers: [
            {
                identifier: "Faculty",
                serverUrl: "ldap://faculty",
                roleMappings: { staff: "user" },
            },
        ],
    });
    adapter.setClient({
        authenticate: async (username, password, options) => {
            assert.equal(username, "alice");
            assert.equal(password, "directory-password");
            assert.equal(options.identifier, "Faculty");
            return { id: "alice", groups: ["staff"] };
        },
    });

    assert.equal(
        await adapter.confirmPassword?.(
            "ldap:Faculty:alice",
            "directory-password",
            "ldap:Faculty",
        ),
        true,
    );
});

test("LDAP user-group mapping rejects authenticated users outside the group", async () => {
    const adapter = createAdapter() as ReturnType<typeof createAdapter> & {
        setClient(client: {
            authenticate: () => Promise<{ id: string; groups: string[] }>;
        }): void;
    };
    adapter.configure({
        serverUrl: "ldaps://directory.example.org",
        roleMappings: { "approved-users": "user" },
    });
    adapter.setClient({
        authenticate: async () => ({ id: "outsider", groups: ["staff"] }),
    });

    assert.equal(
        await adapter.authenticate({ username: "outsider", password: "valid" }),
        null,
    );
});

test("LDAP sources are exposed separately or unified and tried in saved order", async () => {
    const attempts: string[] = [];
    const adapter = createAdapter() as ReturnType<typeof createAdapter> & {
        getLoginMethods(): Array<{ id: string; name: string }>;
        setClient(client: {
            authenticate: (
                username: string,
                password: string,
                options: LdapRuntimeOptions,
            ) => Promise<{ id: string } | null>;
        }): void;
    };
    const servers = [
        {
            identifier: "Faculty",
            serverUrl: "ldap://faculty",
            roleMappings: {},
        },
        {
            identifier: "Students",
            serverUrl: "ldap://students",
            roleMappings: {},
        },
    ];
    adapter.configure({ unify: false, servers });
    assert.deepEqual(adapter.getLoginMethods(), [
        { id: "ldap:Faculty", name: "Faculty", credential: true },
        { id: "ldap:Students", name: "Students", credential: true },
    ]);
    adapter.setClient({
        authenticate: async (_username, _password, options) => {
            attempts.push(String(options.identifier));
            return options.identifier === "Students" ? { id: "alice" } : null;
        },
    });
    assert.ok(
        await adapter.authenticate({
            username: "alice",
            password: "valid",
            authSourceId: "ldap:Students",
        }),
    );
    assert.deepEqual(attempts, ["Students"]);

    attempts.length = 0;
    adapter.configure({ unify: true, servers });
    assert.deepEqual(adapter.getLoginMethods(), [
        { id: "ldap", name: "LDAP", credential: true },
    ]);
    assert.ok(
        await adapter.authenticate({ username: "alice", password: "valid" }),
    );
    assert.deepEqual(attempts, ["Faculty", "Students"]);
});

test("separate LDAP sources namespace accounts while unified sources share them", async () => {
    const adapter = createAdapter() as ReturnType<typeof createAdapter> & {
        setClient(client: {
            authenticate: () => Promise<{ id: string; dn: string }>;
        }): void;
    };
    const servers = [
        { identifier: "Faculty", serverUrl: "ldap://faculty" },
        { identifier: "Students", serverUrl: "ldap://students" },
    ];
    adapter.setClient({
        authenticate: async () => ({ id: "alice", dn: "uid=alice,dc=example" }),
    });
    adapter.configure({ unify: false, servers });
    const separate = await adapter.authenticate({
        username: "alice",
        password: "valid",
        authSourceId: "ldap:Students",
    });
    assert.equal(separate?.accountId, "ldap:Students:alice");
    assert.equal(
        separate?.externalUserId,
        "ldap:Students:uid=alice,dc=example",
    );

    adapter.configure({ unify: true, servers });
    const unified = await adapter.authenticate({
        username: "alice",
        password: "valid",
    });
    assert.equal(unified?.accountId, "alice");
});

test("unified LDAP authentication continues after a source error", async () => {
    const adapter = createAdapter() as ReturnType<typeof createAdapter> & {
        setClient(client: {
            authenticate: (
                _u: string,
                _p: string,
                options: LdapRuntimeOptions,
            ) => Promise<{ id: string } | null>;
        }): void;
    };
    adapter.configure({
        unify: true,
        servers: [
            { identifier: "Offline", serverUrl: "ldap://offline" },
            { identifier: "Online", serverUrl: "ldap://online" },
        ],
    });
    adapter.setClient({
        authenticate: async (_u, _p, options) => {
            if (options.identifier === "Offline")
                throw new Error("unavailable");
            return { id: "alice" };
        },
    });
    const result = await adapter.authenticate({
        username: "alice",
        password: "valid",
    });
    assert.equal(result?.accountId, "alice");
    assert.equal(result?.provider, "ldap:Online");
});

test("ldap adapter forwards display names and reconstructs legacy host URLs", async () => {
    let configuredUrl = "";
    const adapter = createAdapter() as ReturnType<typeof createAdapter> & {
        setClient(client: {
            authenticate: (
                username: string,
                password: string,
                options: LdapRuntimeOptions,
            ) => Promise<{ id: string; displayName: string }>;
        }): void;
    };
    adapter.configure({ host: "ldap.example.org", port: 636 });
    adapter.setClient({
        authenticate: async (_username, _password, options) => {
            configuredUrl = options.serverUrl;
            return { id: "alice", displayName: "Alice Smith" };
        },
    });

    const context = (await adapter.authenticate({
        username: "alice",
        password: "secret",
    })) as { displayName?: string } | null;

    assert.equal(configuredUrl, "ldaps://ldap.example.org:636");
    assert.equal(context?.displayName, "Alice Smith");
});

test("ldap adapter config schema has required fields", () => {
    const adapter = createAdapter();
    assert.equal(
        adapter.configPopupScriptUrl,
        "/static/adapters/auth/ldap/config-popup.js",
    );
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

test("LDAP setup credential test returns user details and mapped role", async () => {
    const adapter = createAdapter() as {
        setClient(client: {
            authenticate: () => Promise<{
                id: string;
                dn: string;
                email: string;
                displayName: string;
                groups: string[];
            }>;
        }): void;
        testConfiguration(config: Record<string, unknown>): Promise<{
            credentialTest: {
                accountId: string;
                role: string;
                groups: string[];
            };
        }>;
    };
    adapter.setClient({
        authenticate: async () => ({
            id: "alice",
            dn: "uid=alice,ou=people,dc=example,dc=org",
            email: "alice@example.org",
            displayName: "Alice Example",
            groups: ["teachers"],
        }),
    });
    const result = await adapter.testConfiguration({
        serverUrl: "ldaps://ldap.example.org",
        baseDn: "dc=example,dc=org",
        bindDn: "uid=service,dc=example,dc=org",
        bindPassword: "service-secret",
        userAttribute: "uid",
        roleMappings: { teachers: "teacher" },
        testUsername: "alice",
        testPassword: "user-secret",
    });
    assert.deepEqual(result.credentialTest, {
        accountId: "alice",
        dn: "uid=alice,ou=people,dc=example,dc=org",
        email: "alice@example.org",
        displayName: "Alice Example",
        groups: ["teachers"],
        role: "teacher",
    });
});

test("LDAP setup credential test rejects a user outside the mapped user group", async () => {
    const adapter = createAdapter() as {
        setClient(client: {
            authenticate: () => Promise<{ id: string; groups: string[] }>;
        }): void;
        testConfiguration(config: Record<string, unknown>): Promise<unknown>;
    };
    adapter.setClient({
        authenticate: async () => ({ id: "outsider", groups: ["staff"] }),
    });
    await assert.rejects(
        adapter.testConfiguration({
            serverUrl: "ldaps://ldap.example.org",
            baseDn: "dc=example,dc=org",
            bindDn: "uid=service,dc=example,dc=org",
            bindPassword: "service-secret",
            roleMappings: { approved: "user" },
            testUsername: "outsider",
            testPassword: "valid-secret",
        }),
        /not eligible/,
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

test("LDAP password writeback uses the source persisted in the provider", async () => {
    const adapter = createAdapter() as {
        configure(config: Record<string, unknown>): void;
        setClient(client: {
            authenticate: () => Promise<null>;
            validatePassword: (
                accountId: string,
                password: string,
                options: LdapRuntimeOptions,
            ) => Promise<boolean>;
            updatePassword: (
                accountId: string,
                password: string,
                options: LdapRuntimeOptions,
            ) => Promise<boolean>;
        }): void;
        resetPassword(
            accountId: string,
            currentPassword: string,
            nextPassword: string,
            providerId: string,
        ): Promise<{ updated: boolean }>;
    };
    adapter.configure({
        unify: true,
        servers: [
            {
                identifier: "Faculty",
                serverUrl: "ldap://faculty",
                writebackEnabled: true,
                writebackBaseDn: "ou=Faculty,dc=example",
            },
            {
                identifier: "Students",
                serverUrl: "ldap://students",
                writebackEnabled: true,
                writebackBaseDn: "ou=Students,dc=example",
            },
        ],
    });
    adapter.setClient({
        authenticate: async () => null,
        validatePassword: async (accountId, _password, options) => {
            assert.equal(accountId, "alice");
            assert.equal(options.serverUrl, "ldap://students");
            return true;
        },
        updatePassword: async (_accountId, _password, options) => {
            assert.equal(options.baseDn, "ou=Students,dc=example");
            return true;
        },
    });
    assert.equal(
        (
            await adapter.resetPassword(
                "alice",
                "current-pass",
                "next-pass",
                "ldap:Students",
            )
        ).updated,
        true,
    );
});
