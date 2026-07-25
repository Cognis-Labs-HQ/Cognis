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
