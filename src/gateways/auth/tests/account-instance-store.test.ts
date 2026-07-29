import test from "node:test";
import assert from "node:assert/strict";
import { AccountInstanceStore } from "../account-instance-store.js";

test("account instances persist per lifecycle and rotate after deletion", async () => {
    const instances = new Map<string, string>();
    const store = new AccountInstanceStore({
        async ensureTable() {},
        async executeCommand(command: Record<string, any>) {
            const accountId = String(
                command.values?.account_id ?? command.where?.[0]?.value ?? "",
            );
            if (command.option === "SELECT") {
                const instanceId = instances.get(accountId);
                return {
                    rows: instanceId ? [{ instance_id: instanceId }] : [],
                };
            }
            if (command.option === "INSERT" && !instances.has(accountId)) {
                instances.set(accountId, String(command.values.instance_id));
            }
            if (command.option === "DELETE") instances.delete(accountId);
            return { rows: [] };
        },
    } as any);

    const firstInstanceId = await store.getOrCreate("LDAP.User");
    assert.equal(await store.getOrCreate("ldap.user"), firstInstanceId);
    await store.delete("LDAP.User");
    assert.notEqual(await store.getOrCreate("ldap.user"), firstInstanceId);
});
