import assert from "node:assert/strict";
import test from "node:test";
import { CapabilityStore, GatewayRegistry } from "@cognis/core";
import { createFlowContractFixture } from "../../../../tooling/reuse/flow-contract-fixture.js";
import type { DbExecutor } from "../../../../gateways/db/reuse/db-executor.js";
import type { StructuredDbCommand } from "../../../../gateways/db/reuse/db-command.js";
import { bootstrapStudyAdapter } from "../index.js";

test("classes cleanup uses only the committed outcome for its exact flow invocation", async () => {
    const fixture = await createFlowContractFixture({
        flow: {
            id: "deprovision-user",
            stages: ["persist-state", "cleanup-dependencies"],
        },
        captureStage: "persist-state",
        stageResult: { persisted: false },
        contractId: "auth:deprovisionOutcome",
        version: 1,
        members: ["read", "deletedAccount"],
        method: "deletedAccount",
    });
    const { root, setOutcome, calls } = fixture;
    const commands: StructuredDbCommand[] = [];
    const logs: Array<Record<string, unknown> | undefined> = [];
    const database: DbExecutor = {
        async ensureTable() {},
        async transaction(operation) {
            return operation(database);
        },
        async executeCommand(command) {
            commands.push(command);
            if (
                command.option === "SELECT" &&
                command.table === "study_classes" &&
                command.where?.some(
                    (clause) => clause.column === "teacher_account_id",
                )
            ) {
                return { rows: [{ id: "owned-class" }] };
            }
            return { rows: [] };
        },
    };
    const capabilities = new CapabilityStore();
    capabilities.contribute("system:ctx", root);
    capabilities.contribute("db:executor", database);
    await bootstrapStudyAdapter({
        capabilities,
        flow: root.flow,
        get gateway(): Parameters<typeof bootstrapStudyAdapter>[0]["gateway"] {
            throw new Error("Unexpected Study gateway implementation access");
        },
        adapterId: "classes",
        adapterRoot: "",
        gatewayRegistry: new GatewayRegistry(),
        registerRoute() {},
        registerNavbarPlugin() {},
        registerStaticDir() {},
        registerPageExtension() {},
        registerCapabilityProvider() {},
        onAvailabilityChange() {
            return () => {};
        },
        isAdapterEnabled: () => true,
        log(_level, _message, metadata) {
            logs.push(metadata);
        },
    });
    commands.length = 0;
    root.flow.extend(
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
                    (entry as { cleaned?: boolean } | undefined)?.cleaned ===
                    false,
            ),
        );
        assert.deepEqual(commands, []);
    }
    assert.equal(calls.length, 8);
    setOutcome("Committed.User");
    const input = { username: "committed.user", action: "delete" };
    const result = await root.flow.run("deprovision-user", input);
    assert.equal(calls.at(-1)?.input, input);
    assert.equal(calls.at(-1)?.stageResults, result.stageResults);
    assert.ok(
        result.stageResults["cleanup-dependencies"].some(
            (entry) =>
                (entry as { accountId?: string } | undefined)?.accountId ===
                "committed.user",
        ),
    );
    assert.deepEqual(
        commands
            .filter((command) => command.option === "DELETE")
            .map((command) => [
                command.table,
                command.where?.[0].column,
                command.where?.[0].value,
            ]),
        [
            ["class_memberships", "class_id", "owned-class"],
            ["classroom_state", "class_id", "owned-class"],
            ["class_memberships", "student_account_id", "committed.user"],
            ["teacher_requests", "account_id", "committed.user"],
            ["teacher_requests", "reviewed_by", "committed.user"],
            ["teacher_assignments", "account_id", "committed.user"],
            ["study_user_preferences", "account_id", "committed.user"],
            ["study_classes", "teacher_account_id", "committed.user"],
        ],
    );
    assert.ok(
        logs.some(
            (metadata) =>
                metadata?.accountId === "committed.user" &&
                metadata.operation === "delete_user_activity",
        ),
    );
    commands.length = 0;
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
