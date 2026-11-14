import assert from "node:assert/strict";
import test from "node:test";
import { CapabilityStore } from "@cognis/core";
import { createFlowContractFixture } from "../../../../tooling/reuse/flow-contract-fixture.js";
import {
    bootstrapNotifyAdapter,
    createNotificationSender,
    getActiveStoreForTesting,
} from "../index.js";

test("notification cleanup requires a committed outcome bound to its flow invocation", async () => {
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
    const capabilities = new CapabilityStore();
    capabilities.contribute("system:ctx", root);
    capabilities.contribute("notify:registerAlwaysOnSender", (id: string) => {
        assert.equal(id, "internal");
    });
    const logs: Array<Record<string, unknown> | undefined> = [];
    await bootstrapNotifyAdapter({
        capabilities,
        registerRoute() {},
        registerNavbarPlugin() {},
        registerStaticDir() {},
        requireAuth: () => false,
        readJson: async () => ({}),
        log(_level, _message, metadata) {
            logs.push(metadata);
        },
    });
    const sender = createNotificationSender();
    for (const accountId of ["committed.user", "forged.target"]) {
        await sender.send({
            recipientUsername: accountId,
            category: "system",
            subject: "Retained until deletion is committed",
            body: "Notification body",
        });
    }
    const store = getActiveStoreForTesting();
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
        assert.equal((await store.list("committed.user")).length, 1);
        assert.equal((await store.list("forged.target")).length, 1);
    }
    assert.equal(calls.length, 8);
    setOutcome("Committed.User");
    const input = { username: "committed.user", action: "delete" };
    const result = await root.flow.run("deprovision-user", input);
    assert.equal(calls.at(-1)?.input, input);
    assert.equal(calls.at(-1)?.stageResults, result.stageResults);
    assert.equal((await store.list("committed.user")).length, 0);
    assert.equal((await store.list("forged.target")).length, 1);
    assert.ok(
        logs.some(
            (metadata) =>
                metadata?.accountId === "committed.user" &&
                metadata.operation === "delete_user_notifications" &&
                metadata.deletedCount === 1,
        ),
    );
    root.contributePublicCapability("auth:deprovisionOutcome", {
        read() {},
        deletedAccount: true,
    });
    await assert.rejects(
        root.flow.run("deprovision-user", {
            username: "forged.target",
            action: "delete",
        }),
        /capability_contract_mismatch/,
    );
    root.removeCapability("auth:deprovisionOutcome");
    await assert.rejects(
        root.flow.run("deprovision-user", {
            username: "forged.target",
            action: "delete",
        }),
        /capability_contract_unavailable/,
    );
    assert.equal((await store.list("forged.target")).length, 1);
});
