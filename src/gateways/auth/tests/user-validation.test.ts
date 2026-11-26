import assert from "node:assert/strict";
import test from "node:test";
import {
    CapabilityStore,
    createCtx,
    runBootstrapScope,
    type BootstrapDisposer,
} from "@cognis/core";
import { registerUserValidationModes } from "../user-validation.js";

test("future module validation callbacks enforce account policy and own their lifetime", async () => {
    const root = createCtx();
    const capabilities = new CapabilityStore();
    capabilities.contribute("system:ctx", root);
    const modes = await runBootstrapScope(root, "gateway:auth", async () =>
        registerUserValidationModes({ capabilities } as never),
    );
    const cleanup: BootstrapDisposer[] = [];
    let approved = false;
    const input = { accountId: "user", role: "user" };
    await runBootstrapScope(
        root,
        "module:proof",
        async () =>
            modes.register({
                id: "proof:approved",
                labelKey: "module.proof.approved",
                requiredFields: ["email"],
                validate: (account) => account.accountId === "user" && approved,
                integration: { scriptUrl: "/static/modules/proof/setup.js" },
            }),
        (dispose) => cleanup.push(dispose),
    );
    assert.deepEqual(
        (await modes.list()).map((mode) => mode.id),
        ["none", "proof:approved"],
    );
    await modes.assertSelectable("proof:approved");
    assert.equal(
        (await modes.evaluate("proof:approved", input)).verified,
        false,
    );
    assert.equal(
        (await modes.evaluate("proof:approved", input)).integrations.length,
        1,
    );
    approved = true;
    assert.deepEqual(await modes.evaluate("proof:approved", input), {
        verified: true,
        integrations: [],
    });
    await cleanup[0]();
    await assert.rejects(
        modes.evaluate("proof:approved", input),
        /validation_unavailable/,
    );
    await modes.assertSelectable("proof:approved", "proof:approved");
    await assert.rejects(
        modes.assertSelectable("proof:approved"),
        /validation_unavailable/,
    );
    assert.equal(
        (
            await modes.evaluate("missing", {
                ...input,
                role: "owner",
                isFounder: true,
            })
        ).verified,
        true,
    );
    await cleanup[0].reactivate!();
    assert.equal(
        (await modes.evaluate("proof:approved", input)).verified,
        true,
    );
    assert.throws(
        () =>
            modes.register({
                id: "late",
                labelKey: "late",
                validate: () => true,
            }),
        /registration_closed/,
    );
});

test("validation refuses unavailable handlers and fails closed for incomplete implementations", async () => {
    const root = createCtx();
    const capabilities = new CapabilityStore();
    capabilities.contribute("system:ctx", root);
    const modes = await runBootstrapScope(root, "gateway:auth", async () =>
        registerUserValidationModes({ capabilities } as never),
    );
    await runBootstrapScope(root, "module:proof", async () => {
        modes.register({
            id: "proof:unavailable",
            labelKey: "module.proof.unavailable",
            available: () => false,
            validate: () => true,
        });
        modes.register({
            id: "proof:denied",
            labelKey: "module.proof.denied",
            validate: () => false,
        });
        assert.throws(
            () =>
                modes.register({
                    id: "none",
                    labelKey: "module.proof.none",
                    validate: () => true,
                }),
            /namespace_denied/,
        );
    });
    const account = { accountId: "user", role: "user" };
    await assert.rejects(
        modes.evaluate("proof:unavailable", account),
        /validation_unavailable/,
    );
    await assert.rejects(
        modes.evaluate("proof:denied", account),
        /validation_failed/,
    );
});

test("login and restored setup sessions execute a module-provided validation handler", async () => {
    const { GatewayRegistry } = await import("@cognis/core");
    const { RouteRegistry } =
        await import("../../../api/reuse/route-registry.js");
    const { InMemoryTestExecutor } =
        await import("../../db/tests/in-memory-test-executor.js");
    const {
        bootstrapAuthTestHost,
        createAuthTestContext,
        dispatchRoute,
        makeJsonRequest,
    } = await import("./auth-gateway-test-helpers.js");
    const capabilities = new CapabilityStore();
    const routeRegistry = new RouteRegistry();
    capabilities.contribute("preferences:store", {
        get: async () =>
            JSON.stringify({ userValidationMode: "proof:approved" }),
    });
    const { flow } = createAuthTestContext(
        capabilities,
        new InMemoryTestExecutor(),
    );
    await bootstrapAuthTestHost({
        capabilities,
        flow,
        routeRegistry,
        gatewayRegistry: new GatewayRegistry(),
        adaptersRoot: "/nonexistent",
    });
    const root =
        capabilities.require<ReturnType<typeof createCtx>>("system:ctx");
    const modes = capabilities.require<
        ReturnType<typeof registerUserValidationModes>
    >("auth:userValidationModes");
    let verified = false;
    let calls = 0;
    await runBootstrapScope(root, "module:proof", async () =>
        modes.register({
            id: "proof:approved",
            labelKey: "module.proof.approved",
            validate: ({ accountId }) => {
                assert.equal(accountId, "learner");
                calls++;
                return verified;
            },
            integration: { scriptUrl: "/static/modules/proof/setup.js" },
        }),
    );
    await capabilities
        .require<{
            register(username: string, password: string): Promise<unknown>;
        }>("auth:accountStore")
        .register("learner", "password");
    const login = await dispatchRoute(
        routeRegistry,
        makeJsonRequest("POST", {
            provider: "local",
            username: "learner",
            password: "password",
        }),
        "/api/v1/auth/login",
    );
    assert.equal(login.res.status, 200);
    assert.equal(
        JSON.parse(login.res.payload).data.requiredUserValidation,
        true,
    );
    assert.equal(calls, 1);
    const setup = capabilities.require<
        (
            accountId: string,
            role: string,
        ) => Promise<Array<{ scriptUrl: string }>>
    >("auth:getSetupIntegrations");
    assert.deepEqual(await setup("learner", "user"), [
        { scriptUrl: "/static/modules/proof/setup.js" },
    ]);
    verified = true;
    assert.deepEqual(await setup("learner", "user"), []);
    assert.equal(calls, 3);
});
