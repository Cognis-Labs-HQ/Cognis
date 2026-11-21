import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { CapabilityStore } from "@cognis/core";
import { createFlowContractFixture } from "../../../../tooling/reuse/flow-contract-fixture.js";

test("keyring manifest declares the Authentication gateway as its parent", async () => {
    const manifest = JSON.parse(
        await readFile("src/adapters/auth/keyring/manifest.json", "utf8"),
    );

    assert.equal(manifest.gateway, "auth");
    assert.equal(manifest.name, "User Keyring");
});

async function createKeyringFixture(version = 1) {
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
    const fixture = await createFlowContractFixture({
        flow: {
            id: "deprovision-user",
            stages: ["persist-state", "cleanup-dependencies"],
        },
        captureStage: "persist-state",
        stageResult: { persisted: false },
        contractId: "auth:deprovisionOutcome",
        version,
        members: ["read", "deletedAccount"],
        method: "deletedAccount",
    });
    const systemCtx = fixture.root;
    systemCtx.flow.extend(
        "deprovision-user",
        "cleanup-dependencies",
        { id: "test:forge-public-deletion", order: -1000 },
        (stage) => {
            Object.assign(stage.input as object, {
                username: "forged.target",
                action: "delete",
            });
            stage.stageResults["persist-state"] = [{ persisted: true }];
        },
    );
    await bootstrapAuthAdapter({
        adapterRoot: "src/adapters/auth/keyring",
        capabilities,
        flow: systemCtx.flow,
    });

    return { ...fixture, commands };
}

test("keyring adapter purges a vault after every committed user deletion", async () => {
    const {
        root: systemCtx,
        commands,
        setOutcome,
        calls,
    } = await createKeyringFixture();
    setOutcome("LDAP.User");
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
    assert.deepEqual(
        commands,
        Array.from({ length: 3 }, () =>
            ["auth_keyring_vault_parts", "auth_keyring_vaults"].map(
                (table) => ({
                    option: "DELETE",
                    table,
                    where: [{ column: "account_id", value: "ldap.user" }],
                }),
            ),
        ).flat(),
    );
    assert.equal(calls.length, 3);
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

test("keyring cleanup rejects forged persistence and unavailable outcome contracts", async () => {
    const { root, commands, setOutcome, calls } = await createKeyringFixture();
    for (const outcome of [
        undefined,
        null,
        false,
        true,
        42,
        "",
        "   ",
        { persisted: true },
    ]) {
        setOutcome(outcome);
        const result = await root.flow.run("deprovision-user", {
            username: "protected.user",
            action: "disable",
        });
        assert.ok(
            result.stageResults["cleanup-dependencies"].some(
                (entry) =>
                    (entry as { purged?: boolean } | undefined)?.purged ===
                    false,
            ),
        );
    }
    assert.equal(calls.length, 8);
    assert.deepEqual(commands, []);
    root.contributePublicCapability("auth:deprovisionOutcome", {
        read() {},
        deletedAccount: true,
    });
    await assert.rejects(
        root.flow.run("deprovision-user", {
            username: "protected.user",
            action: "delete",
        }),
        /capability_contract_mismatch/,
    );
    root.removeCapability("auth:deprovisionOutcome");
    await assert.rejects(
        root.flow.run("deprovision-user", {
            username: "protected.user",
            action: "delete",
        }),
        /capability_contract_unavailable/,
    );
    assert.deepEqual(commands, []);
});

test("keyring cleanup fails closed for an incompatible outcome contract version", async () => {
    const { root, commands, setOutcome } = await createKeyringFixture(2);
    setOutcome("protected.user");
    await assert.rejects(
        root.flow.run("deprovision-user", {
            username: "protected.user",
            action: "delete",
        }),
        /capability_contract_unavailable/,
    );
    assert.deepEqual(commands, []);
});
