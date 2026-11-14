import { exposeUnfrozenFlowEnvelopes } from "../reuse/unfrozen-flow-envelope.js";
import assert from "node:assert/strict";
import test from "node:test";
import {
    CapabilityStore,
    GatewayRegistry,
    createCtx,
    runBootstrapScope,
    type AccessRole,
    type CapabilityContracts,
} from "@cognis/core";
import { RouteRegistry } from "../../../../api/reuse/route-registry.js";
import { registerAuthBootstrapHook } from "../../bootstrap/account-target-policy.js";
import type { AuthorizeAccountTarget } from "../../contracts/account-target.js";

const roles: AccessRole[] = ["user", "teacher", "moderator", "admin", "owner"];
const account = (role = "user", isFounder = false) => ({
    accountId: "target",
    role,
    isFounder,
});

async function fixture(
    options: {
        failBootstrap?: boolean;
        unfrozenEnvelope?: { enabled: boolean };
    } = {},
) {
    const root = createCtx();
    if (options.unfrozenEnvelope)
        exposeUnfrozenFlowEnvelopes(root, options.unfrozenEnvelope);
    const capabilities = new CapabilityStore();
    const gatewayRegistry = new GatewayRegistry();
    gatewayRegistry.register({ id: "auth", name: "Auth", version: "test" });
    capabilities.contribute("system:ctx", root);
    const state = {
        metadata: account() as unknown,
        reads: [] as string[],
        logs: [] as unknown[],
        read: undefined as undefined | ((id: string) => Promise<unknown>),
    };
    const store = {
        async getInfo(id: string) {
            state.reads.push(id);
            return state.read ? state.read(id) : state.metadata;
        },
    };
    capabilities.contribute("auth:accountStore", store);
    const disposers: Array<
        (() => void | Promise<void>) & {
            reactivate?: () => void | Promise<void>;
        }
    > = [];
    const initialize = () =>
        runBootstrapScope(
            root,
            "gateway:auth",
            async () => {
                registerAuthBootstrapHook({
                    ctx: {
                        capabilities,
                        gatewayRegistry,
                        flow: root.flow,
                        routeRegistry: new RouteRegistry(),
                        adaptersRoot: "/unused-synthetic",
                        log: (...args: unknown[]) => state.logs.push(args),
                    },
                });
                if (options.failBootstrap)
                    throw new Error("synthetic_bootstrap_failure");
            },
            (dispose) => disposers.push(dispose),
        );
    if (options.failBootstrap)
        await assert.rejects(initialize(), /synthetic_bootstrap_failure/);
    else await initialize();
    const contracts =
        root.requireCapability<CapabilityContracts>("system:contracts");
    return {
        root,
        capabilities,
        gatewayRegistry,
        state,
        store,
        contracts,
        disposers,
        authorize: (
            role: AccessRole = "admin",
            accountId = "target",
            allowSelf = true,
            sub = "actor",
        ) =>
            contracts.resolve<AuthorizeAccountTarget>(
                "auth:authorizeAccountTarget",
                1,
            )({
                actor: { sub, role },
                accountId,
                allowSelf,
            }),
        async dispose() {
            for (const dispose of [...disposers].reverse()) await dispose();
        },
        async reactivate() {
            for (const dispose of disposers) await dispose.reactivate?.();
        },
    };
}

function deferred() {
    let resolve!: () => void;
    const promise = new Promise<void>((finish) => {
        resolve = finish;
    });
    return { promise, resolve };
}

for (const actorRole of roles) {
    for (const targetRole of roles) {
        for (const isFounder of [false, true]) {
            test(`${actorRole} authorizes ${targetRole} target with founder=${isFounder}`, async () => {
                const host = await fixture();
                host.state.metadata = account(targetRole, isFounder);
                const decision = await host.authorize(actorRole);
                const expected =
                    actorRole === "owner" ||
                    (actorRole === "admin" &&
                        !["admin", "owner"].includes(targetRole));
                assert.equal(decision.allowed, expected);
                if (decision.allowed) {
                    assert.equal(decision.accountId, "target");
                    assert.equal(decision.isCurrent(), true);
                    assert.deepEqual(host.state.reads, ["target", "target"]);
                } else {
                    assert.equal(decision.status, 403);
                    assert.equal(
                        decision.code,
                        actorRole === "admin"
                            ? "protected_admin_account"
                            : "forbidden",
                    );
                    assert.equal(
                        host.state.reads.length,
                        actorRole === "admin" ? 1 : 0,
                    );
                }
            });
        }
    }
}

for (const role of roles) {
    test(`${role} self-service is explicit and management self-denial needs no metadata`, async () => {
        const host = await fixture();
        host.state.read = async () => {
            throw new Error("self_must_not_read_metadata");
        };
        assert.equal((await host.authorize(role, "actor")).allowed, true);
        assert.deepEqual(await host.authorize(role, "actor", false), {
            allowed: false,
            status: 403,
            code: "protected_self_account",
        });
        assert.equal(host.state.reads.length, 0);
    });
}

for (const metadata of [
    null,
    undefined,
    {},
    { ...account(), role: "unknown" },
    { ...account(), isFounder: undefined },
    { ...account(), isFounder: "false" },
    { ...account(), accountId: "other" },
    { ...account(), role: undefined },
]) {
    test(`missing or malformed metadata is closed: ${JSON.stringify(metadata)}`, async () => {
        const host = await fixture();
        host.state.metadata = metadata;
        assert.deepEqual(await host.authorize("owner"), {
            allowed: false,
            status: metadata === null ? 404 : 503,
            code:
                metadata === null ? "not_found" : "account_policy_unavailable",
        });
    });
}

for (const accountId of [
    "",
    " target",
    "target ",
    "target/child",
    "target\\child",
    "target\u0000",
    "target\n",
]) {
    test(`malformed target fails before metadata: ${JSON.stringify(accountId)}`, async () => {
        const host = await fixture();
        assert.deepEqual(await host.authorize("owner", accountId), {
            allowed: false,
            status: 400,
            code: "bad_request",
        });
        assert.equal(host.state.reads.length, 0);
    });
}

test("account capability absence, malformed shape and thrown lookup fail closed with safe logs", async () => {
    for (const store of [
        undefined,
        {},
        {
            getInfo: async () => {
                throw new Error("private-marker");
            },
        },
    ]) {
        const host = await fixture();
        host.capabilities.contribute("auth:accountStore", store);
        assert.deepEqual(await host.authorize("owner"), {
            allowed: false,
            status: 503,
            code: "account_policy_unavailable",
        });
        assert.doesNotMatch(JSON.stringify(host.state.logs), /private-marker/);
    }
});

test("contract and flow are owned, versioned and removed on failed bootstrap", async () => {
    const host = await fixture();
    assert.equal(
        host.contracts.describe("auth:authorizeAccountTarget")?.version,
        1,
    );
    assert.equal(
        host.contracts.describe("auth:authorizeAccountTarget")?.owner,
        "gateway:auth",
    );
    assert.throws(
        () => host.contracts.resolve("auth:authorizeAccountTarget", 2),
        /capability_contract_unavailable/,
    );
    const failed = await fixture({ failBootstrap: true });
    assert.throws(
        () => failed.contracts.resolve("auth:authorizeAccountTarget", 1),
        /capability_contract_unavailable/,
    );
    assert.equal(failed.root.flow.exists("auth:authorizeAccountTarget"), false);
});

test("the registered stages run and forged flow data cannot grant authority", async () => {
    const host = await fixture();
    const visited: string[] = [];
    let captured: unknown;
    for (const stage of ["validateRequest", "readAccount", "authorizeTarget"]) {
        host.root.flow.extend(
            "auth:authorizeAccountTarget",
            stage,
            { id: `test:${stage}`, order: 1000 },
            ({ input, data }) => {
                visited.push(stage);
                captured = input;
                data.decision = { allowed: true, accountId: "unrelated" };
            },
        );
    }
    host.state.metadata = account("owner", true);
    assert.deepEqual(await host.authorize(), {
        allowed: false,
        status: 403,
        code: "protected_admin_account",
    });
    assert.deepEqual(visited, [
        "validateRequest",
        "readAccount",
        "authorizeTarget",
    ]);
    await assert.rejects(
        host.root.flow.run("auth:authorizeAccountTarget", captured),
        /account_policy_unavailable/,
    );
    await assert.rejects(
        host.root.flow.run("auth:authorizeAccountTarget", {
            actor: { sub: "actor", role: "owner" },
            accountId: "target",
            allowSelf: true,
        }),
        /account_policy_unavailable/,
    );
});

for (const updated of [
    account("admin"),
    account("owner"),
    account("admin", true),
    null,
]) {
    test(`late target metadata change is rechecked after flow: ${JSON.stringify(updated)}`, async () => {
        const host = await fixture();
        host.root.flow.extend(
            "auth:authorizeAccountTarget",
            "authorizeTarget",
            { id: "test:lateChange", order: 1000 },
            async () => {
                await Promise.resolve();
                host.state.metadata = updated;
            },
        );
        const decision = await host.authorize();
        assert.equal(decision.allowed, false);
        assert.equal(
            !decision.allowed && decision.status,
            updated === null ? 404 : 403,
        );
        assert.deepEqual(host.state.reads, ["target", "target"]);
    });
}

for (const change of [
    "dispose",
    "reactivate",
    "replaceStore",
    "disable",
] as const) {
    test(`pending metadata authorization rejects ${change}`, async () => {
        const host = await fixture();
        const entered = deferred();
        const release = deferred();
        host.state.read = async () => {
            entered.resolve();
            await release.promise;
            return account();
        };
        const pending = host.authorize();
        const observed = pending.then(
            (decision) => decision,
            () => ({ allowed: false, status: 503 }),
        );
        await entered.promise;
        if (change === "dispose" || change === "reactivate")
            await host.dispose();
        if (change === "reactivate") await host.reactivate();
        if (change === "replaceStore")
            host.capabilities.contribute("auth:accountStore", {
                getInfo: async () => account(),
            });
        if (change === "disable") await host.gatewayRegistry.disable("auth");
        release.resolve();
        const decision = await observed;
        assert.equal(decision.allowed, false);
        assert.equal("status" in decision && decision.status, 503);
    });
}

test("successful leases invalidate on disposal and fresh calls work after reactivation", async () => {
    const host = await fixture();
    const decision = await host.authorize();
    assert.ok(decision.allowed);
    await host.dispose();
    assert.equal(decision.isCurrent(), false);
    assert.throws(
        () => host.contracts.resolve("auth:authorizeAccountTarget", 1),
        /capability_contract_unavailable/,
    );
    await host.reactivate();
    assert.equal(decision.isCurrent(), false);
    assert.equal((await host.authorize()).allowed, true);
});

test("concurrent targets and current metadata are not cached across requests", async () => {
    const host = await fixture();
    const entered = deferred();
    const release = deferred();
    host.state.read = async (id) => {
        if (id === "target") {
            entered.resolve();
            await release.promise;
        }
        return { ...account(), accountId: id };
    };
    const pending = host.authorize();
    await entered.promise;
    assert.equal((await host.authorize("admin", "unrelated")).allowed, true);
    release.resolve();
    assert.equal((await pending).allowed, true);
    host.state.read = undefined;
    host.state.metadata = account("owner");
    assert.equal((await host.authorize()).allowed, false);
});

for (const replacement of ["policy", "registry", "root", "store"] as const) {
    test(`returned lease rejects replacement of ${replacement}`, async () => {
        const host = await fixture();
        const decision = await host.authorize();
        assert.ok(decision.allowed);
        if (replacement === "policy")
            host.root.contributePublicCapability(
                "auth:authorizeAccountTarget",
                async () => decision,
            );
        if (replacement === "registry")
            host.root.contributePublicCapability("system:contracts", {});
        if (replacement === "root")
            host.capabilities.contribute("system:ctx", createCtx());
        if (replacement === "store")
            host.capabilities.contribute("auth:accountStore", {
                getInfo: async () => account(),
            });
        assert.equal(decision.isCurrent(), false);
    });
}

test("caller request mutation and returned decision mutation cannot redirect authority", async () => {
    const host = await fixture();
    const entered = deferred();
    const release = deferred();
    host.state.read = async () => {
        entered.resolve();
        await release.promise;
        return account();
    };
    const request = {
        actor: { sub: "actor", role: "admin" as AccessRole },
        accountId: "target",
        allowSelf: true,
    };
    const pending = host.contracts.resolve<AuthorizeAccountTarget>(
        "auth:authorizeAccountTarget",
        1,
    )(request);
    await entered.promise;
    request.actor.role = "owner";
    request.accountId = "other";
    host.state.metadata = account("owner");
    release.resolve();
    const decision = await pending;
    assert.ok(decision.allowed);
    assert.equal(decision.accountId, "target");
    assert.throws(
        () => Object.assign(decision, { accountId: "other" }),
        TypeError,
    );
    host.state.read = undefined;
    const denied = await host.authorize();
    assert.equal(denied.allowed, false);
    assert.throws(() => Object.assign(denied, { allowed: true }), TypeError);
});

test("mutating actor claims during lookup cannot upgrade the copied actor", async () => {
    const host = await fixture();
    const entered = deferred();
    const release = deferred();
    host.state.read = async () => {
        entered.resolve();
        await release.promise;
        return account("admin");
    };
    const request = {
        actor: { sub: "actor", role: "admin" as AccessRole },
        accountId: "target",
        allowSelf: true,
    };
    const pending = host.contracts.resolve<AuthorizeAccountTarget>(
        "auth:authorizeAccountTarget",
        1,
    )(request);
    await entered.promise;
    request.actor.role = "owner";
    release.resolve();
    assert.deepEqual(await pending, {
        allowed: false,
        status: 403,
        code: "protected_admin_account",
    });
});

test("policy cleanup preserves a replacement and refuses to overwrite it on reactivation", async () => {
    const host = await fixture();
    const replacement = async () => ({
        allowed: false,
        status: 503,
        code: "account_policy_unavailable",
    });
    host.root.contributePublicCapability(
        "auth:authorizeAccountTarget",
        replacement,
    );
    host.capabilities.contribute("auth:authorizeAccountTarget", replacement);
    await host.dispose();
    assert.equal(
        host.root.getCapability("auth:authorizeAccountTarget"),
        replacement,
    );
    assert.equal(
        host.capabilities.get("auth:authorizeAccountTarget"),
        replacement,
    );
    await assert.rejects(host.reactivate(), /account_policy_conflict/);
});

for (const role of roles) {
    test(`explicit founder protection rejects ${role} founders without changing ordinary owner targeting`, async () => {
        const host = await fixture();
        host.state.metadata = account(role, true);
        const authorize = host.contracts.resolve<AuthorizeAccountTarget>(
            "auth:authorizeAccountTarget",
            1,
        );
        const request = {
            actor: { sub: "actor", role: "owner" as const },
            accountId: "target",
            allowSelf: false,
        };
        assert.equal((await authorize(request)).allowed, true);
        assert.equal(
            (await authorize({ ...request, allowFounder: true })).allowed,
            true,
        );
        assert.deepEqual(await authorize({ ...request, allowFounder: false }), {
            allowed: false,
            status: 403,
            code: "protected_founder_account",
        });
    });
}

for (const value of [undefined, null, "false", 0, {}]) {
    test(`malformed founder constraint ${JSON.stringify(value)} fails closed before metadata reads`, async () => {
        const host = await fixture();
        const authorize = host.contracts.resolve<AuthorizeAccountTarget>(
            "auth:authorizeAccountTarget",
            1,
        );
        assert.deepEqual(
            await authorize({
                actor: { sub: "actor", role: "owner" },
                accountId: "target",
                allowSelf: false,
                allowFounder: value,
            } as Parameters<AuthorizeAccountTarget>[0]),
            { allowed: false, status: 400, code: "bad_request" },
        );
        assert.deepEqual(host.state.reads, []);
    });
}

for (const role of roles) {
    for (const isFounder of [false, true]) {
        test(`self ${role} with explicit founder constraint and founder=${isFounder}`, async () => {
            const host = await fixture();
            host.state.metadata = account(role, isFounder);
            const authorize = host.contracts.resolve<AuthorizeAccountTarget>(
                "auth:authorizeAccountTarget",
                1,
            );
            const decision = await authorize({
                actor: { sub: "target", role },
                accountId: "target",
                allowSelf: true,
                allowFounder: false,
            });
            assert.equal(decision.allowed, !isFounder);
            if (decision.allowed) assert.equal(decision.isCurrent(), true);
            else
                assert.deepEqual(decision, {
                    allowed: false,
                    status: 403,
                    code: "protected_founder_account",
                });
            assert.equal(host.state.reads.length, isFounder ? 1 : 2);
        });
    }
}

for (const metadata of [null, undefined]) {
    test(`constrained self does not bypass ${metadata === null ? "missing" : "unavailable"} metadata`, async () => {
        const host = await fixture();
        host.state.metadata = metadata;
        const authorize = host.contracts.resolve<AuthorizeAccountTarget>(
            "auth:authorizeAccountTarget",
            1,
        );
        assert.deepEqual(
            await authorize({
                actor: { sub: "target", role: "user" },
                accountId: "target",
                allowSelf: true,
                allowFounder: false,
            }),
            {
                allowed: false,
                status: metadata === null ? 404 : 503,
                code:
                    metadata === null
                        ? "not_found"
                        : "account_policy_unavailable",
            },
        );
        assert.equal(
            (
                await authorize({
                    actor: { sub: "target", role: "user" },
                    accountId: "target",
                    allowSelf: true,
                })
            ).allowed,
            true,
        );
    });
}

test("target policy fails closed on legacy unfrozen public flow envelopes", async () => {
    const host = await fixture({ unfrozenEnvelope: { enabled: true } });
    assert.deepEqual(await host.authorize(), {
        allowed: false,
        status: 503,
        code: "account_policy_unavailable",
    });
    assert.deepEqual(host.state.reads, []);
});

test("an unsupported envelope invalidates earlier policy leases even after the runner recovers", async () => {
    const mode = { enabled: false };
    const host = await fixture({ unfrozenEnvelope: mode });
    const original = await host.authorize();
    assert.equal(original.allowed, true);
    assert.ok(original.allowed && original.isCurrent());
    mode.enabled = true;
    assert.deepEqual(await host.authorize(), {
        allowed: false,
        status: 503,
        code: "account_policy_unavailable",
    });
    mode.enabled = false;
    assert.equal(original.allowed && original.isCurrent(), false);
    assert.equal((await host.authorize()).allowed, true);
});
