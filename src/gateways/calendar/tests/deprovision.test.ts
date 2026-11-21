import assert from "node:assert/strict";
import test from "node:test";
import {
    CapabilityStore,
    GatewayRegistry,
    runBootstrapScope,
} from "@cognis/core";
import { createFlowContractFixture } from "../../../tooling/reuse/flow-contract-fixture.js";
import { RouteRegistry } from "../../../api/reuse/route-registry.js";
import type { DbExecutor } from "../../db/reuse/db-executor.js";
import type { StructuredDbCommand } from "../../db/reuse/db-command.js";
import { bootstrap } from "../bootstrap.js";

test("calendar cleanup uses only the committed outcome for its exact flow invocation", async () => {
    const { root, calls, setOutcome } = await createFlowContractFixture({
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
    const commands: StructuredDbCommand[] = [];
    const logs: Array<Record<string, unknown> | undefined> = [];
    const database: DbExecutor = {
        async ensureTable() {},
        async transaction(operation) {
            return operation(database);
        },
        async executeCommand(command) {
            commands.push(command);
            if (command.option === "SELECT") {
                if (
                    command.table === "calendar_calendars" &&
                    command.where?.some(
                        (clause) => clause.column === "owner_account_id",
                    )
                ) {
                    return { rows: [{ id: "owned-calendar" }] };
                }
                if (
                    command.table === "calendar_events" &&
                    command.where?.some(
                        (clause) => clause.column === "calendar_id",
                    )
                ) {
                    return { rows: [{ id: "owned-event" }] };
                }
            }
            return { rows: [] };
        },
    };
    const capabilities = new CapabilityStore();
    capabilities.contribute("system:ctx", root);
    capabilities.contribute("db:executor", database);
    await runBootstrapScope(root, "gateway:calendar", async () =>
        bootstrap({
            capabilities,
            flow: root.flow,
            adaptersRoot: "/nonexistent",
            routeRegistry: new RouteRegistry(),
            gatewayRegistry: new GatewayRegistry(),
            log(_level, _message, metadata) {
                logs.push(metadata);
            },
        }),
    );
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
            ["calendar_event_responses", "account_id", "committed.user"],
            ["calendar_event_responses", "root_event_id", "owned-event"],
            ["calendar_events", "id", "owned-event"],
            ["calendar_calendars", "id", "owned-calendar"],
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
