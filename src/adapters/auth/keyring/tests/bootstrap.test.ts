import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { CapabilityStore, createCtx } from "@cognis/core";

test("keyring manifest declares the Authentication gateway as its parent", async () => {
    const manifest = JSON.parse(
        await readFile("src/adapters/auth/keyring/manifest.json", "utf8"),
    );

    assert.equal(manifest.gateway, "auth");
    assert.equal(manifest.name, "User Keyring");
});

test("keyring adapter purges a vault after every persisted user deletion", async () => {
    const { bootstrapAuthAdapter } = await import("../index.js");
    const commands: Array<Record<string, unknown>> = [];
    const capabilities = new CapabilityStore();
    capabilities.contribute("db:executor", {
        async ensureTable() {},
        async transaction(operation: (executor: unknown) => Promise<unknown>) {
            return operation(capabilities.get("db:executor"));
        },
        async executeCommand(command: Record<string, unknown>) {
            commands.push(command);
            return { rows: [] };
        },
    });
    const systemCtx = createCtx();
    systemCtx.registerFlow({
        id: "deprovision-user",
        stages: ["persist-state", "cleanup-dependencies"],
    });
    systemCtx.flow.extend(
        "deprovision-user",
        "persist-state",
        { id: "test:persist-user-deletion" },
        () => ({ persisted: true }),
    );
    await bootstrapAuthAdapter({
        adapterRoot: "src/adapters/auth/keyring",
        capabilities,
        flow: systemCtx.flow,
    });

    const results = [];
    for (let deletionAttempt = 0; deletionAttempt < 3; deletionAttempt += 1) {
        results.push(
            await systemCtx.flow.run("deprovision-user", {
                username: "LDAP.User",
                action: "delete",
            }),
        );
    }

    assert.equal(
        commands.filter(
            (command) =>
                command.option === "DELETE" &&
                command.table === "auth_keyring_vaults" &&
                JSON.stringify(command.where).includes("ldap.user"),
        ).length,
        3,
    );
    for (const result of results) {
        assert.ok(
            result.stageResults["cleanup-dependencies"].some(
                (entry) =>
                    entry !== null &&
                    typeof entry === "object" &&
                    "purged" in entry &&
                    entry.purged === true &&
                    "accountId" in entry &&
                    entry.accountId === "ldap.user",
            ),
        );
    }
});
