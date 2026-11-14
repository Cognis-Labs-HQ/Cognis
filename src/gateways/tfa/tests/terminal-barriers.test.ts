import test from "node:test";
import assert from "node:assert/strict";
import { CoreTfaGateway } from "../gateway.js";
import {
    createAdapterMock,
    createStoreMock,
    createLoginLifetime,
} from "./reuse/gateway-fixture.js";

async function fixture(context: import("node:test").TestContext) {
    const store = createStoreMock(),
        adapter = createAdapterMock();
    const gateway = new CoreTfaGateway(store);
    gateway.registerAdapter(adapter);
    await gateway.enableAdapter(adapter.id);
    context.after(() => gateway.disposeChallenges());
    const enroll = () =>
        store.upsertUserMethod({
            accountId: "alice",
            methodId: adapter.id,
            enabled: true,
            sortOrder: 0,
            state: {},
        });
    const setup = () =>
        gateway.beginMethodSetup({
            accountId: "alice",
            displayName: "Alice",
            methodId: adapter.id,
        });
    await enroll();
    return { store, adapter, gateway, enroll, setup };
}

for (const terminal of [
    "disable",
    "reset",
    "adapter-disable",
    "config-disable",
] as const)
    test(`${terminal} blocks new admission throughout its state write`, async (context) => {
        const host = await fixture(context);
        const entered = Promise.withResolvers<void>(),
            release = Promise.withResolvers<void>();
        if (terminal === "disable") {
            const write = host.store.upsertUserMethod;
            host.store.upsertUserMethod = async (row) => {
                if (!row.enabled) {
                    entered.resolve();
                    await release.promise;
                }
                await write(row);
            };
        } else if (terminal === "reset") {
            const clear = host.store.clearUserState;
            host.store.clearUserState = async (account) => {
                entered.resolve();
                await release.promise;
                await clear(account);
            };
        } else {
            const save = host.store.saveAdapterConfig;
            host.store.saveAdapterConfig = async (...args) => {
                if (!args[1]) {
                    entered.resolve();
                    await release.promise;
                }
                await save(...args);
            };
        }
        let admissions = 0;
        host.adapter.beginLoginChallenge = async () => {
            admissions++;
            return { ready: true };
        };
        const operation =
            terminal === "disable"
                ? host.gateway.disableMethod("alice", host.adapter.id)
                : terminal === "reset"
                  ? host.gateway.resetUser("alice")
                  : terminal === "adapter-disable"
                    ? host.gateway.disableAdapter(host.adapter.id)
                    : host.gateway.saveAdapterConfig(host.adapter.id, {
                          enabled: false,
                      });
        await entered.promise;
        assert.equal(
            (
                await host.gateway.beginLoginChallenge(
                    "alice",
                    host.adapter.id,
                    createLoginLifetime(),
                )
            ).ready,
            false,
        );
        await assert.rejects(
            host.gateway.getLoginMethods("alice", createLoginLifetime()),
            /tfa_operation_unavailable/,
        );
        await assert.rejects(host.setup(), /tfa_operation_unavailable/);
        assert.equal(admissions, 0);
        release.resolve();
        await operation;
        await host.gateway.enableAdapter(host.adapter.id);
        await host.enroll();
        assert.equal(
            (
                await host.gateway.beginLoginChallenge(
                    "alice",
                    host.adapter.id,
                    createLoginLifetime(),
                )
            ).ready,
            true,
        );
    });

test("overlapping reset barriers cannot reopen each other and unrelated accounts remain available", async (context) => {
    const host = await fixture(context);
    const entered = [
        Promise.withResolvers<void>(),
        Promise.withResolvers<void>(),
    ];
    const release = [
        Promise.withResolvers<void>(),
        Promise.withResolvers<void>(),
    ];
    let calls = 0;
    const clear = host.store.clearUserState;
    host.store.clearUserState = async (account) => {
        const index = calls++;
        entered[index].resolve();
        await release[index].promise;
        await clear(account);
    };
    const first = host.gateway.resetUser("alice");
    await entered[0].promise;
    const second = host.gateway.resetUser("alice");
    await entered[1].promise;
    release[0].resolve();
    await first;
    await assert.rejects(host.setup(), /tfa_operation_unavailable/);
    const other = await host.gateway.beginMethodSetup({
        accountId: "bob",
        displayName: "Bob",
        methodId: host.adapter.id,
    });
    assert.ok(other.setupId);
    release[1].resolve();
    await second;
    assert.ok((await host.setup()).setupId);
});

test("disposal blocks admission until cleanup settles and then allows a new lifecycle", async (context) => {
    const host = await fixture(context);
    await host.setup();
    const entered = Promise.withResolvers<void>(),
        release = Promise.withResolvers<void>();
    host.adapter.cancelSetup = async () => {
        entered.resolve();
        await release.promise;
    };
    const disposal = host.gateway.disposeChallenges();
    await entered.promise;
    await assert.rejects(host.setup(), /tfa_operation_unavailable/);
    assert.equal(
        (
            await host.gateway.beginLoginChallenge(
                "alice",
                host.adapter.id,
                createLoginLifetime(),
            )
        ).ready,
        false,
    );
    release.resolve();
    await disposal;
    assert.ok((await host.setup()).setupId);
});

test("a failed enrollment write remains a verifier failure but does not poison reset cleanup", async (context) => {
    const host = await fixture(context);
    const setup = await host.setup();
    host.store.upsertUserMethod = async () => {
        throw new Error("synthetic_commit_failure");
    };
    await assert.rejects(
        host.gateway.verifyMethodSetup({
            accountId: "alice",
            setupId: setup.setupId,
            verification: { code: "123456" },
        }),
        /synthetic_commit_failure/,
    );
    let cleared = 0;
    const clear = host.store.clearUserState;
    host.store.clearUserState = async (account) => {
        cleared++;
        await clear(account);
    };
    await host.gateway.resetUser("alice");
    assert.equal(cleared, 1);
    assert.deepEqual(await host.store.listUserMethods("alice"), []);
    assert.equal(await host.store.getPendingSetup(setup.setupId), null);
});

test("failed terminal persistence releases its own barrier without weakening existing policy", async (context) => {
    const host = await fixture(context);
    host.store.clearUserState = async () => {
        throw new Error("synthetic_reset_failure");
    };
    await assert.rejects(
        host.gateway.resetUser("alice"),
        /synthetic_reset_failure/,
    );
    assert.equal(
        (
            await host.gateway.beginLoginChallenge(
                "alice",
                host.adapter.id,
                createLoginLifetime(),
            )
        ).ready,
        true,
    );
});
