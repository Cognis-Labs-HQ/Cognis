import assert from "node:assert/strict";
import test from "node:test";
import { createDeprovisionFixture as fixture } from "./deprovision-fixture.js";

for (const action of ["delete", "disable", "archive"]) {
    for (const change of ["promotion", "deletion", "expiry"]) {
        test(`${action} blocks ${change} after an awaited deprovision preparation hook`, async () => {
            const host = await fixture();
            const entered = Promise.withResolvers<void>();
            const release = Promise.withResolvers<void>();
            host.root.flow.extend(
                "deprovision-user",
                "authorize-request",
                { id: "test:defer-preparation", order: 1000 },
                async () => {
                    entered.resolve();
                    await release.promise;
                },
            );
            const pending = host.run(host.input(action));
            await entered.promise;
            if (change === "promotion") host.state.metadata!.role = "admin";
            if (change === "deletion") host.state.metadata = null;
            if (change === "expiry") host.state.current = false;
            release.resolve();
            const { persist, cleanup } = await pending;
            assert.deepEqual(persist, {
                persisted: false,
                reason:
                    change === "promotion"
                        ? "protected_admin_account"
                        : change === "deletion"
                          ? "not_found"
                          : "account_policy_unavailable",
                status:
                    change === "promotion"
                        ? 403
                        : change === "deletion"
                          ? 404
                          : 503,
            });
            assert.deepEqual(cleanup, { cleaned: false });
            assert.deepEqual(host.state.effects, []);
        });
    }

    test(`${action} preserves the valid guarded operation and exactly one token revocation`, async () => {
        const host = await fixture();
        const { persist, cleanup } = await host.run(host.input(action));
        assert.equal(persist.persisted, true);
        assert.deepEqual(cleanup, { cleaned: true, revokedTokenCount: 2 });
        assert.deepEqual(
            host.state.effects,
            action === "delete"
                ? ["delete:target", "revoke:target"]
                : action === "disable"
                  ? ["enabled:target:false", "revoke:target"]
                  : ["revoke:target"],
        );
        assert.equal(host.state.reads, 2);
    });
}

const invalidGuards: Array<{ label: string; guard: unknown }> = [
    { label: "undefined", guard: undefined },
    { label: "null", guard: null },
    { label: "boolean", guard: true },
    { label: "false", guard: () => false },
    { label: "truthy", guard: () => 1 },
    { label: "promise", guard: () => Promise.resolve(true) },
    {
        label: "throws",
        guard: () => {
            throw new Error("private_guard_error");
        },
    },
];
for (const { label, guard } of invalidGuards) {
    test(`a supplied ${label} guard cannot fall back to the system workflow`, async () => {
        const host = await fixture();
        const result = await host.run({
            ...host.input(),
            isAuthorizationCurrent: guard,
        });
        assert.equal(result.persist.status, 503);
        assert.deepEqual(host.state.effects, []);
        assert.equal(
            JSON.stringify(host.state.logs).includes("private_guard_error"),
            false,
        );
    });
}

test("an inherited malformed guard is present rather than an omitted system guard", async () => {
    const host = await fixture();
    const request = Object.assign(
        Object.create({ isAuthorizationCurrent: undefined }),
        {
            username: "target",
            action: "delete",
            callerRole: "owner",
            targetRole: "user",
            targetIsFounder: false,
        },
    );
    assert.equal((await host.run(request)).persist.status, 503);
    assert.deepEqual(host.state.effects, []);
});

test("the existing LDAP system-owner input remains a distinct unguarded workflow", async () => {
    const host = await fixture();
    const { persist, cleanup } = await host.run({
        username: "target",
        action: "delete",
        callerRole: "owner",
        targetRole: "user",
        targetIsFounder: false,
    });
    assert.equal(persist.persisted, true);
    assert.deepEqual(cleanup, { cleaned: true, revokedTokenCount: 2 });
    assert.deepEqual(host.state.effects, ["delete:target", "revoke:target"]);
    assert.equal(host.state.reads, 0);
});

for (const protectedInput of [
    { targetIsFounder: true, callerRole: "owner" },
    { targetRole: "admin" },
    { targetRole: "owner" },
]) {
    test(`deprovision retains action-specific protection ${JSON.stringify(protectedInput)}`, async () => {
        const host = await fixture();
        const { persist } = await host.run({
            ...host.input(),
            ...protectedInput,
        });
        assert.equal(persist.status, 403);
        assert.equal(
            persist.reason,
            protectedInput.targetIsFounder
                ? "protected_founder_account"
                : "protected_admin_account",
        );
        assert.deepEqual(host.state.effects, []);
    });
}

test("the owner can deprovision a privileged non-founder", async () => {
    const host = await fixture();
    host.state.metadata!.role = "admin";
    assert.equal(
        (
            await host.run({
                ...host.input(),
                callerRole: "owner",
                targetRole: "admin",
                actor: { sub: "actor", role: "owner" },
            })
        ).persist.persisted,
        true,
    );
    assert.deepEqual(host.state.effects, ["delete:target", "revoke:target"]);
});

test("later mutation cannot replace the captured actor, target, action or failing guard", async () => {
    const host = await fixture();
    const request = {
        ...host.input(),
        username: String("target"),
        actor: { sub: "actor", role: "admin" },
        isAuthorizationCurrent: () => false,
    };
    host.root.flow.extend(
        "deprovision-user",
        "authorize-request",
        { id: "test:mutate-input", order: 1000 },
        ({ input, stageResults }) => {
            const mutable = input as typeof request;
            mutable.actor.role = "owner";
            mutable.username = "other";
            mutable.action = "archive";
            mutable.isAuthorizationCurrent = () => true;
            stageResults["authorize-request"] = [{ authorized: true }];
        },
    );
    assert.equal((await host.run(request)).persist.status, 503);
    assert.deepEqual(host.state.effects, []);
});

test("public authorization and persistence results cannot grant internal deletion or token cleanup", async () => {
    const host = await fixture();
    host.root.flow.extend(
        "deprovision-user",
        "authorize-request",
        { id: "test:forge-authorize", order: 1000 },
        ({ stageResults }) => {
            stageResults["authorize-request"] = [{ authorized: true }];
        },
    );
    host.root.flow.extend(
        "deprovision-user",
        "persist-state",
        { id: "test:forge-persist", order: 1000 },
        ({ stageResults }) => {
            stageResults["persist-state"] = [
                { persisted: true, username: "other", action: "delete" },
            ];
        },
    );
    const { cleanup } = await host.run({
        ...host.input(),
        targetIsFounder: true,
    });
    assert.deepEqual(cleanup, { cleaned: false });
    assert.deepEqual(host.state.effects, []);
});

for (const change of [
    "expiry",
    "policy-disposal",
    "store-replacement",
    "promotion",
    "deletion",
]) {
    test(`terminal metadata await cannot retain authorization after ${change}`, async () => {
        const host = await fixture();
        const entered = Promise.withResolvers<void>();
        const release = Promise.withResolvers<void>();
        host.state.readBarrier = async () => {
            entered.resolve();
            await release.promise;
        };
        const pending = host.run();
        await entered.promise;
        if (change === "expiry") host.state.current = false;
        if (change === "policy-disposal")
            for (const dispose of [...host.policyDisposers].reverse())
                await dispose();
        if (change === "store-replacement")
            host.capabilities.contribute("auth:accountStore", {
                getInfo: async () => host.state.metadata,
            });
        if (change === "promotion") host.state.metadata!.role = "owner";
        if (change === "deletion") host.state.metadata = null;
        release.resolve();
        const { persist } = await pending;
        assert.equal(persist.persisted, false);
        assert.equal(
            persist.status,
            change === "promotion" ? 403 : change === "deletion" ? 404 : 503,
        );
        assert.deepEqual(host.state.effects, []);
    });
}

test("archive begins its token effect before cleanup extensions and does not repeat it", async () => {
    const host = await fixture();
    host.root.flow.extend(
        "deprovision-user",
        "cleanup-dependencies",
        { id: "test:cleanup-boundary", order: -1000 },
        () => {
            assert.deepEqual(host.state.effects, ["revoke:target"]);
            host.state.current = false;
        },
    );
    assert.equal(
        (await host.run(host.input("archive"))).persist.persisted,
        true,
    );
    assert.deepEqual(host.state.effects, ["revoke:target"]);
});

test("archive fails closed if its first effect capability is absent", async () => {
    const host = await fixture();
    host.capabilities.remove("auth:revokeAccessTokensForSubject");
    assert.equal((await host.run(host.input("archive"))).persist.status, 503);
    assert.deepEqual(host.state.effects, []);
});

test("cleanup finishes after a successful delete even if the original lease then expires", async () => {
    const host = await fixture();
    host.context.accountStore.delete = async (id) => {
        host.state.effects.push(`delete:${id}`);
        host.state.current = false;
    };
    assert.equal((await host.run()).persist.persisted, true);
    assert.deepEqual(host.state.effects, ["delete:target", "revoke:target"]);
});

test("a mutated older actor cannot elevate the terminal policy request", async () => {
    const host = await fixture();
    host.state.metadata!.role = "admin";
    const request = { ...host.input(), actor: { sub: "actor", role: "admin" } };
    host.root.flow.extend(
        "deprovision-user",
        "authorize-request",
        { id: "test:mutate-actor", order: 1000 },
        () => {
            request.actor.role = "owner";
        },
    );
    const { persist } = await host.run(request);
    assert.equal(persist.status, 403);
    assert.equal(persist.reason, "protected_admin_account");
    assert.deepEqual(host.state.effects, []);
});

test("terminal preparation cannot fall back when the policy contract is removed", async () => {
    const host = await fixture();
    host.root.flow.extend(
        "deprovision-user",
        "authorize-request",
        { id: "test:remove-policy", order: 1000 },
        async () => {
            for (const dispose of [...host.policyDisposers].reverse())
                await dispose();
        },
    );
    assert.equal((await host.run()).persist.status, 503);
    assert.deepEqual(host.state.effects, []);
});

for (const action of ["delete", "disable", "archive"]) {
    for (const role of ["user", "admin", "owner"] as const) {
        test(`${action} denies a late founder flag for ${role} even to an owner`, async () => {
            const host = await fixture();
            host.state.metadata!.role = role;
            host.root.flow.extend(
                "deprovision-user",
                "authorize-request",
                { id: "test:late-founder", order: 1000 },
                async () => {
                    await Promise.resolve();
                    host.state.metadata!.isFounder = true;
                },
            );
            const { persist, cleanup } = await host.run({
                ...host.input(action),
                actor: { sub: "actor", role: "owner" },
                callerRole: "owner",
                targetRole: role,
            });
            assert.deepEqual(persist, {
                persisted: false,
                status: 403,
                reason: "protected_founder_account",
            });
            assert.deepEqual(cleanup, { cleaned: false });
            assert.deepEqual(host.state.effects, []);
        });
    }
}

test("the terminal policy final read also rechecks a founder flag changed in its own extension", async () => {
    const host = await fixture();
    host.root.flow.extend(
        "auth:authorizeAccountTarget",
        "authorizeTarget",
        { id: "test:late-policy-founder", order: 1000 },
        async () => {
            await Promise.resolve();
            host.state.metadata!.isFounder = true;
        },
    );
    const { persist } = await host.run({
        ...host.input(),
        callerRole: "owner",
        actor: { sub: "actor", role: "owner" },
    });
    assert.equal(persist.status, 403);
    assert.equal(persist.reason, "protected_founder_account");
    assert.equal(host.state.reads, 2);
    assert.deepEqual(host.state.effects, []);
});

test("guarded deprovision cannot authorize a replacement store then mutate the captured old store", async () => {
    const host = await fixture();
    host.root.flow.extend(
        "deprovision-user",
        "authorize-request",
        { id: "test:replace-effect-store", order: 1000 },
        () => {
            host.capabilities.contribute("auth:accountStore", {
                getInfo: async () => host.state.metadata,
            });
        },
    );
    assert.equal((await host.run()).persist.status, 503);
    assert.deepEqual(host.state.effects, []);
});
