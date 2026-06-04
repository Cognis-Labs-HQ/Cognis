import test from "node:test";
import assert from "node:assert/strict";
import {
    CORE_FLOW_CATALOG,
    CTX_CAPABILITY,
    createFlowRegistration,
    ensureCtxCapability,
    getCanonicalFlowContract,
    registerCanonicalFlow,
} from "../index.js";

test("core flow catalog keeps unique flow and stage ids", () => {
    const flowIds = new Set<string>();

    for (const flow of CORE_FLOW_CATALOG) {
        assert.equal(
            flowIds.has(flow.id),
            false,
            `duplicate flow id: ${flow.id}`,
        );
        flowIds.add(flow.id);

        const stageIds = new Set<string>();
        for (const stage of flow.stages) {
            assert.equal(
                stageIds.has(stage.id),
                false,
                `duplicate stage id in ${flow.id}: ${stage.id}`,
            );
            stageIds.add(stage.id);
        }
    }
});

test("core flow catalog exposes canonical auth flow contracts", () => {
    assert.deepEqual(
        getCanonicalFlowContract("construct-login-ui")?.stages.map(
            (stage) => stage.id,
        ),
        ["resolve-shell", "resolve-methods", "augment-methods", "compose-form"],
    );
    assert.deepEqual(
        getCanonicalFlowContract("login")?.stages.map((stage) => stage.id),
        ["resolve-provider", "authenticate", "establish-session"],
    );
    assert.deepEqual(
        getCanonicalFlowContract("ldap-auth")?.stages.map((stage) => stage.id),
        ["resolve-adapter", "authenticate", "map-account"],
    );
    assert.deepEqual(
        getCanonicalFlowContract("construct-settings-ui")?.stages.map(
            (stage) => stage.id,
        ),
        ["resolve-sections", "augment-sections", "compose-page"],
    );
});

test("ensureCtxCapability contributes a reusable flow bus", () => {
    const capabilities = new Map<string, unknown>();
    const store = {
        get<T>(key: string): T | undefined {
            return capabilities.get(key) as T | undefined;
        },
        contribute(key: string, value: unknown): void {
            capabilities.set(key, value);
        },
    };

    const first = ensureCtxCapability(store);
    const second = ensureCtxCapability(store);

    assert.equal(first, second);
    assert.equal(capabilities.get(CTX_CAPABILITY), first);
});

test("registerCanonicalFlow derives ctx registrations from the catalog", () => {
    const ctx = ensureCtxCapability({
        get: () => undefined,
    });
    const flow = getCanonicalFlowContract("send-message");

    assert.ok(flow);
    assert.equal(registerCanonicalFlow(ctx, flow), true);
    assert.equal(registerCanonicalFlow(ctx, flow), false);
    assert.deepEqual(createFlowRegistration(flow), {
        id: "send-message",
        description:
            "Dispatches a message through staged validation, delivery, and post-send fan-out.",
        stages: ["validate-message", "persist-message", "fan-out"],
    });
});
