import assert from "node:assert/strict";
import test from "node:test";
import {
    CapabilityStore,
    createCtx,
    runBootstrapScope,
    type CapabilityContracts,
} from "@cognis/core";
import { registerDeprovisionFlow } from "../../bootstrap/deprovision.js";
import type { DeprovisionOutcomes } from "../../contracts/deprovision-outcome.js";
import { registerAccountInstanceCleanup } from "../../bootstrap/account-instance-cleanup.js";
import { createDeprovisionFixture as fixture } from "./deprovision-fixture.js";

for (const action of ["delete", "disable", "archive"]) {
    test(`${action} provides a frozen owner outcome for the exact completed invocation`, async () => {
        const host = await fixture();
        const request = host.input(action);
        const outcomes = host.root
            .requireCapability<CapabilityContracts>("system:contracts")
            .resolve<DeprovisionOutcomes>("auth:deprovisionOutcome", 1);
        const result = await host.root.flow.run("deprovision-user", request);
        const outcome = outcomes.read(request, result.stageResults);
        assert.deepEqual(outcome, {
            persisted: true,
            username: "target",
            action,
            revokedTokenCount: 2,
        });
        assert.equal(Object.isFrozen(outcome), true);
        assert.equal(
            outcomes.deletedAccount(request, result.stageResults),
            action === "delete" ? "target" : undefined,
        );
        assert.equal(
            outcomes.read({ ...request }, result.stageResults),
            undefined,
        );
        assert.equal(
            outcomes.read(request, { ...result.stageResults }),
            undefined,
        );
        assert.equal(
            outcomes.deletedAccount({ ...request }, result.stageResults),
            undefined,
        );
    });
}

test("another invocation cannot substitute its result for the original input", async () => {
    const host = await fixture();
    const outcomes = host.root.requireCapability<DeprovisionOutcomes>(
        "auth:deprovisionOutcome",
    );
    const first = host.input();
    const second = host.input();
    const firstResult = await host.root.flow.run("deprovision-user", first);
    const secondResult = await host.root.flow.run("deprovision-user", second);
    assert.equal(outcomes.read(first, secondResult.stageResults), undefined);
    assert.equal(outcomes.read(second, firstResult.stageResults), undefined);
    assert.equal(
        outcomes.deletedAccount(first, firstResult.stageResults),
        "target",
    );
    assert.equal(
        outcomes.deletedAccount(second, secondResult.stageResults),
        "target",
    );
});

test("reusing an input object invalidates its older invocation receipt", async () => {
    const host = await fixture();
    const outcomes = host.root.requireCapability<DeprovisionOutcomes>(
        "auth:deprovisionOutcome",
    );
    const request = host.input();
    const first = await host.root.flow.run("deprovision-user", request);
    assert.equal(
        outcomes.deletedAccount(request, first.stageResults),
        "target",
    );
    const second = await host.root.flow.run("deprovision-user", request);
    assert.equal(outcomes.read(request, first.stageResults), undefined);
    assert.equal(
        outcomes.deletedAccount(request, first.stageResults),
        undefined,
    );
    assert.equal(
        outcomes.deletedAccount(request, second.stageResults),
        "target",
    );
});

for (const change of [
    "unpublish",
    "replacement",
    "disable",
    "dispose",
    "reactivate",
]) {
    test(`both retained outcome methods reject ${change}`, async () => {
        const host = await fixture();
        const raw = host.root.requireCapability<DeprovisionOutcomes>(
            "auth:deprovisionOutcome",
        );
        const request = host.input();
        const result = await host.root.flow.run("deprovision-user", request);
        assert.equal(
            raw.deletedAccount(request, result.stageResults),
            "target",
        );
        if (change === "unpublish")
            host.root.removeCapability("auth:deprovisionOutcome");
        if (change === "replacement")
            host.root.contributePublicCapability("auth:deprovisionOutcome", {
                read() {},
                deletedAccount() {},
            });
        if (change === "disable") {
            host.gatewayRegistry.register({
                id: "auth",
                name: "Auth",
                version: "test",
            });
            await host.gatewayRegistry.disable("auth");
        }
        if (change === "dispose" || change === "reactivate") {
            for (const dispose of [...host.disposers].reverse())
                await dispose();
            if (change === "reactivate")
                for (const dispose of host.disposers)
                    await dispose.reactivate?.();
        }
        assert.equal(raw.read(request, result.stageResults), undefined);
        assert.equal(
            raw.deletedAccount(request, result.stageResults),
            undefined,
        );
    });
}

for (const action of ["delete", "archive"]) {
    test(`late cleanup result substitution cannot grant a denied ${action} or account-instance purge`, async () => {
        const host = await fixture();
        const instances: string[] = [];
        registerAccountInstanceCleanup(host.context.ctx, {
            delete: async (id) => {
                instances.push(id);
            },
        });
        const outcomes = host.root.requireCapability<DeprovisionOutcomes>(
            "auth:deprovisionOutcome",
        );
        const request = { ...host.input(action) };
        host.state.metadata!.isFounder = true;
        host.root.flow.extend(
            "deprovision-user",
            "cleanup-dependencies",
            { id: "test:forge-later-result", order: -1000 },
            ({ input, stageResults }) => {
                stageResults["persist-state"] = [
                    { persisted: true, username: "other", action: "delete" },
                ];
                (input as { username: string; action: string }).username =
                    "other";
                (input as { username: string; action: string }).action =
                    "delete";
            },
        );
        const result = await host.root.flow.run("deprovision-user", request);
        assert.equal(
            (result.stageResults["persist-state"][0] as { persisted: boolean })
                .persisted,
            true,
        );
        assert.deepEqual(outcomes.read(request, result.stageResults), {
            persisted: false,
            reason: "protected_founder_account",
            status: 403,
        });
        assert.equal(
            outcomes.deletedAccount(request, result.stageResults),
            undefined,
        );
        assert.deepEqual(host.state.effects, []);
        assert.deepEqual(instances, []);
    });
}

test("committed deletion cleanup uses the private original target despite later public input/result changes", async () => {
    const host = await fixture();
    const instances: string[] = [];
    registerAccountInstanceCleanup(host.context.ctx, {
        delete: async (id) => {
            instances.push(id);
        },
    });
    const request = { ...host.input() };
    host.root.flow.extend(
        "deprovision-user",
        "cleanup-dependencies",
        { id: "test:hide-real-result", order: -1000 },
        ({ input, stageResults }) => {
            stageResults["persist-state"] = [{ persisted: false }];
            (input as { username: string }).username = "other";
        },
    );
    const result = await host.root.flow.run("deprovision-user", request);
    assert.equal(
        (result.stageResults["persist-state"][0] as { persisted: boolean })
            .persisted,
        false,
    );
    assert.deepEqual(host.state.effects, ["delete:target", "revoke:target"]);
    assert.deepEqual(instances, ["target"]);
    assert.equal(
        host.root
            .requireCapability<DeprovisionOutcomes>("auth:deprovisionOutcome")
            .deletedAccount(request, result.stageResults),
        "target",
    );
});

test("an unfinished invocation has no receipt despite fabricated persistence data", async () => {
    const host = await fixture();
    const outcomes = host.root.requireCapability<DeprovisionOutcomes>(
        "auth:deprovisionOutcome",
    );
    host.root.flow.extend(
        "deprovision-user",
        "authorize-request",
        { id: "test:premature-receipt", order: 1000 },
        ({ input, stageResults }) => {
            stageResults["persist-state"] = [
                { persisted: true, username: "target", action: "delete" },
            ];
            assert.equal(outcomes.read(input, stageResults), undefined);
            assert.equal(
                outcomes.deletedAccount(input, stageResults),
                undefined,
            );
        },
    );
    await host.run();
});

test("registry disable/reactivate invalidates both retained methods for an old invocation", async () => {
    const host = await fixture();
    host.gatewayRegistry.register({
        id: "auth",
        name: "Auth",
        version: "test",
    });
    for (const dispose of host.disposers)
        host.gatewayRegistry.retainBootstrapDisposer("auth", dispose);
    const raw = host.root.requireCapability<DeprovisionOutcomes>(
        "auth:deprovisionOutcome",
    );
    const input = host.input();
    const result = await host.root.flow.run("deprovision-user", input);
    assert.equal(raw.deletedAccount(input, result.stageResults), "target");
    await host.gatewayRegistry.disable("auth");
    await host.gatewayRegistry.enable("auth");
    assert.equal(raw.read(input, result.stageResults), undefined);
    assert.equal(raw.deletedAccount(input, result.stageResults), undefined);
});

for (const action of ["delete", "disable", "archive"]) {
    test(`${action} cannot begin after its outcome provider disappears during preparation`, async () => {
        const host = await fixture();
        host.root.flow.extend(
            "deprovision-user",
            "authorize-request",
            { id: "test:remove-outcome", order: 1000 },
            () => {
                host.root.removeCapability("auth:deprovisionOutcome");
            },
        );
        const result = await host.run(host.input(action));
        assert.equal(result.persist.persisted, false);
        assert.equal(result.persist.status, 503);
        assert.deepEqual(host.state.effects, []);
    });
}

test("failed Auth bootstrap removes the outcome declaration and both publications", async () => {
    const host = await fixture();
    const root = createCtx();
    const capabilities = new CapabilityStore();
    capabilities.contribute("system:ctx", root);
    root.registerFlow({
        id: "deprovision-user",
        stages: ["authorize-request", "persist-state", "cleanup-dependencies"],
    });
    await assert.rejects(
        runBootstrapScope(root, "gateway:auth", async () => {
            registerDeprovisionFlow({
                ctx: { ...host.context.ctx, capabilities, flow: root.flow },
                accountStore: host.context.accountStore,
            });
            assert.ok(root.isPublicCapability("auth:deprovisionOutcome"));
            throw new Error("synthetic_bootstrap_failure");
        }),
        /synthetic_bootstrap_failure/,
    );
    assert.equal(root.getCapability("auth:deprovisionOutcome"), undefined);
    assert.equal(capabilities.get("auth:deprovisionOutcome"), undefined);
    assert.equal(
        root
            .requireCapability<CapabilityContracts>("system:contracts")
            .describe("auth:deprovisionOutcome"),
        undefined,
    );
    assert.deepEqual(host.state.effects, []);
});

test("outcome cleanup preserves a replacement and reactivation cannot overwrite it", async () => {
    const host = await fixture();
    const replacement = Object.freeze({
        read: () => undefined,
        deletedAccount: () => undefined,
    });
    host.root.contributePublicCapability(
        "auth:deprovisionOutcome",
        replacement,
    );
    host.capabilities.contribute("auth:deprovisionOutcome", replacement);
    for (const dispose of [...host.disposers].reverse()) await dispose();
    assert.equal(
        host.root.getCapability("auth:deprovisionOutcome"),
        replacement,
    );
    assert.equal(host.capabilities.get("auth:deprovisionOutcome"), replacement);
    await assert.rejects(async () => {
        for (const dispose of host.disposers) await dispose.reactivate?.();
    }, /deprovision_outcome_conflict/);
    assert.equal(
        host.root.getCapability("auth:deprovisionOutcome"),
        replacement,
    );
});

test("a later cleanup hook cannot replace its envelope with a retained successful invocation pair", async () => {
    const host = await fixture();
    const instances: string[] = [];
    registerAccountInstanceCleanup(host.context.ctx, {
        delete: async (id) => {
            instances.push(id);
        },
    });
    const earlierInput = host.input();
    const earlierResult = await host.root.flow.run(
        "deprovision-user",
        earlierInput,
    );
    const deniedInput = host.input();
    host.state.effects.length = 0;
    instances.length = 0;
    host.state.metadata!.isFounder = true;
    host.root.flow.extend(
        "deprovision-user",
        "cleanup-dependencies",
        { id: "test:replace-whole-invocation-pair", order: -1000 },
        (stage) => {
            if (stage.input !== deniedInput) return;
            const alias = stage;
            assert.equal(Reflect.set(alias, "input", earlierInput), false);
            assert.equal(
                Reflect.set(alias, "stageResults", earlierResult.stageResults),
                false,
            );
            assert.throws(
                () =>
                    Object.assign(alias, {
                        input: earlierInput,
                        stageResults: earlierResult.stageResults,
                    }),
                TypeError,
            );
            assert.equal(alias.input, deniedInput);
            assert.notEqual(alias.stageResults, earlierResult.stageResults);
        },
    );
    const deniedResult = await host.root.flow.run(
        "deprovision-user",
        deniedInput,
    );
    const outcomes = host.root.requireCapability<DeprovisionOutcomes>(
        "auth:deprovisionOutcome",
    );
    assert.deepEqual(outcomes.read(deniedInput, deniedResult.stageResults), {
        persisted: false,
        status: 403,
        reason: "protected_founder_account",
    });
    assert.deepEqual(host.state.effects, []);
    assert.deepEqual(instances, []);
    host.state.metadata!.isFounder = false;
    const freshInput = host.input();
    const freshResult = await host.root.flow.run(
        "deprovision-user",
        freshInput,
    );
    assert.equal(
        outcomes.deletedAccount(freshInput, freshResult.stageResults),
        "target",
    );
    assert.deepEqual(host.state.effects, ["delete:target", "revoke:target"]);
    assert.deepEqual(instances, ["target"]);
});

for (const action of ["delete", "disable", "archive"]) {
    test(`${action} refuses legacy unfrozen public flow envelopes without downstream effects`, async () => {
        const host = await fixture({ unfrozenEnvelope: { enabled: true } });
        const request = host.input(action);
        const result = await host.root.flow.run("deprovision-user", request);
        assert.equal(
            (result.stageResults["persist-state"][0] as { status: number })
                .status,
            503,
        );
        assert.equal(
            host.root
                .requireCapability<DeprovisionOutcomes>(
                    "auth:deprovisionOutcome",
                )
                .read(request, result.stageResults),
            undefined,
        );
        assert.deepEqual(host.state.effects, []);
        assert.equal(host.state.reads, 0);
    });
}

test("an unsupported runner invalidates older receipts and a restored frozen runner can start fresh", async () => {
    const mode = { enabled: false };
    const host = await fixture({ unfrozenEnvelope: mode });
    const outcomes = host.root.requireCapability<DeprovisionOutcomes>(
        "auth:deprovisionOutcome",
    );
    const originalInput = host.input();
    const original = await host.root.flow.run(
        "deprovision-user",
        originalInput,
    );
    assert.equal(
        outcomes.deletedAccount(originalInput, original.stageResults),
        "target",
    );
    host.state.effects.length = 0;
    mode.enabled = true;
    const unsupported = await host.root.flow.run(
        "deprovision-user",
        host.input(),
    );
    assert.equal(
        (unsupported.stageResults["persist-state"][0] as { status: number })
            .status,
        503,
    );
    assert.deepEqual(host.state.effects, []);
    assert.equal(
        outcomes.read(originalInput, original.stageResults),
        undefined,
    );
    assert.equal(
        outcomes.deletedAccount(originalInput, original.stageResults),
        undefined,
    );
    mode.enabled = false;
    const freshInput = host.input();
    const fresh = await host.root.flow.run("deprovision-user", freshInput);
    assert.equal(
        outcomes.deletedAccount(freshInput, fresh.stageResults),
        "target",
    );
});
