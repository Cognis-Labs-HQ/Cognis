import test from "node:test";
import assert from "node:assert/strict";
import {
    CORE_FLOW_CATALOG,
    createCtx,
    createFlowRegistration,
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
    assert.deepEqual(
        getCanonicalFlowContract("upload-profile-media")?.stages.map(
            (stage) => stage.id,
        ),
        ["validate-upload", "persist-media", "emit-events"],
    );
    assert.deepEqual(
        getCanonicalFlowContract("mint-share-token")?.stages.map(
            (stage) => stage.id,
        ),
        ["validate-resource", "authorize-minter", "issue-token", "emit-event"],
    );
    assert.deepEqual(
        getCanonicalFlowContract("resolve-share-token")?.stages.map(
            (stage) => stage.id,
        ),
        ["validate-token", "resolve-resource", "check-access", "build-payload"],
    );
    assert.deepEqual(
        getCanonicalFlowContract("revoke-share-token")?.stages.map(
            (stage) => stage.id,
        ),
        ["authorize-revocation", "delete-token"],
    );
    assert.deepEqual(
        getCanonicalFlowContract("construct-share-page")?.stages.map(
            (stage) => stage.id,
        ),
        ["resolve-shell", "resolve-resource-renderer"],
    );
    assert.deepEqual(
        getCanonicalFlowContract("remove-profile-media")?.stages.map(
            (stage) => stage.id,
        ),
        ["validate-removal", "persist-removal", "emit-events"],
    );
});

test("registerCanonicalFlow derives ctx registrations from the catalog", () => {
    const ctx = createCtx();
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
