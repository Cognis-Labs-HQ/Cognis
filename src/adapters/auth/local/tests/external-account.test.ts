import test from "node:test";
import assert from "node:assert/strict";
import { DbLocalAccountStore } from "../store.js";

test("external account persistence creates the account before its identity", async () => {
    const commands: Array<Record<string, unknown>> = [];
    const executor = {
        async executeCommand(command: Record<string, unknown>) {
            commands.push(command);
            return { rows: [] };
        },
        async transaction(operation: (tx: unknown) => Promise<void>) {
            await operation(this);
        },
    };
    const store = new DbLocalAccountStore(executor as never);

    await store.ensureExternalAccount({
        accountId: "firehawk",
        provider: "ldap",
        externalUserId: "uid=firehawk,ou=People,dc=example,dc=org",
        email: "firehawk@example.org",
        displayName: "Fire Hawk",
        role: "teacher",
    });

    assert.deepEqual(
        commands.map((command) => command.table),
        ["accounts", "auth_identities"],
    );
    assert.deepEqual(commands[0]?.values, {
        id: "firehawk",
        email: "firehawk@example.org",
        display_name: "Fire Hawk",
        is_admin: false,
        role: "teacher",
        enabled: true,
        created_at: (commands[0]?.values as Record<string, unknown>).created_at,
        updated_at: (commands[0]?.values as Record<string, unknown>).updated_at,
    });
    assert.equal(
        (commands[1]?.values as Record<string, unknown>).account_id,
        "firehawk",
    );
});

test("local auth schema provisions external identities", async () => {
    const tables: Array<Record<string, unknown>> = [];
    const executor = {
        async ensureTable(table: Record<string, unknown>) {
            tables.push(table);
        },
    };
    const store = new DbLocalAccountStore(executor as never);

    await store.ensureSchema();

    assert.deepEqual(
        tables.map((table) => table.name),
        ["auth_identities", "local_auth_password_history"],
    );
    const identityTable = tables[0];
    assert.deepEqual(identityTable?.uniqueKeys, [
        ["provider", "external_user_id"],
    ]);
});

test("external account info qualifies account columns when joining identities", async () => {
    const commands: Array<Record<string, unknown>> = [];
    const executor = {
        async executeCommand(command: Record<string, unknown>) {
            commands.push(command);
            return {
                rows: [
                    {
                        id: "firehawk",
                        enabled: true,
                        is_founder: false,
                        role: "teacher",
                        provider: "ldap",
                    },
                ],
            };
        },
    };
    const store = new DbLocalAccountStore(executor as never);

    const info = await store.getInfo("firehawk");

    assert.equal(info?.provider, "ldap");
    assert.equal(commands[0]?.alias, "a");
    assert.deepEqual(commands[0]?.where, [
        { column: "a.id", value: "firehawk" },
    ]);
    assert.deepEqual(commands[0]?.columns, [
        { col: "a.id", as: "id" },
        { col: "a.created_at", as: "created_at" },
        { col: "a.last_login", as: "last_login" },
        { col: "a.enabled", as: "enabled" },
        { col: "a.is_admin", as: "is_admin" },
        { col: "a.is_founder", as: "is_founder" },
        { col: "a.role", as: "role" },
        { col: "i.provider", as: "provider" },
    ]);
});
