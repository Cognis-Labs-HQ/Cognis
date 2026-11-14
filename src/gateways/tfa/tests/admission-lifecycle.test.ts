import test from "node:test";
import assert from "node:assert/strict";
import { CoreTfaGateway } from "../gateway.js";
import {
    createAdapterMock,
    createStoreMock,
    createLoginLifetime,
} from "./reuse/gateway-fixture.js";

function latch() {
    let resolve!: () => void;
    const promise = new Promise<void>((done) => {
        resolve = done;
    });
    return { promise, resolve };
}
async function fixture(context: import("node:test").TestContext) {
    const store = createStoreMock();
    const adapter = createAdapterMock();
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

for (const automatic of [false, true])
    for (const terminal of [
        "disable",
        "reenable",
        "reset",
        "dispose",
    ] as const) {
        test(`${automatic ? "automatic" : "explicit"} admission cannot survive ${terminal} during the initial read`, async (context) => {
            const host = await fixture(context);
            const entered = latch(),
                release = latch();
            const read = host.store.listUserMethods;
            let first = true,
                deliveries = 0;
            host.store.listUserMethods = async (account) => {
                const rows = await read(account);
                if (first) {
                    first = false;
                    entered.resolve();
                    await release.promise;
                }
                return rows;
            };
            host.adapter.beginLoginChallenge = async () => {
                deliveries++;
                return { ready: true };
            };
            const owner = createLoginLifetime();
            const pending = automatic
                ? host.gateway.getLoginMethods("alice", owner)
                : host.gateway.beginLoginChallenge(
                      "alice",
                      host.adapter.id,
                      owner,
                  );
            const outcome = pending.then(
                (value) => value,
                (error) => error,
            );
            await entered.promise;
            if (terminal === "dispose") await host.gateway.disposeChallenges();
            else if (terminal === "reset")
                await host.gateway.resetUser("alice");
            else {
                await host.gateway.disableMethod("alice", host.adapter.id);
                if (terminal === "reenable")
                    await host.gateway.enableMethod("alice", host.adapter.id);
            }
            release.resolve();
            const result = await outcome;
            if (automatic) assert.match(String(result), /tfa_attempt_expired/);
            else assert.equal(result.ready, false);
            assert.equal(deliveries, 0);
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
            assert.equal(deliveries, 1);
        });
    }

for (const terminal of ["disable", "reset", "dispose"] as const)
    test(`setup ownership precedes prune and rejects late admission after ${terminal}`, async (context) => {
        const host = await fixture(context);
        const entered = latch(),
            release = latch();
        let admissions = 0;
        host.store.pruneExpiredPendingSetups = async () => {
            entered.resolve();
            await release.promise;
        };
        host.adapter.beginSetup = async () => {
            admissions++;
            return { pendingPayload: {}, view: { prompt: "prompt" } };
        };
        const pending = host.setup();
        const rejected = assert.rejects(pending, /tfa_attempt_expired/);
        await entered.promise;
        if (terminal === "dispose") await host.gateway.disposeChallenges();
        else if (terminal === "reset") await host.gateway.resetUser("alice");
        else await host.gateway.disableMethod("alice", host.adapter.id);
        release.resolve();
        await rejected;
        assert.equal(admissions, 0);
        await host.setup();
        assert.equal(admissions, 1);
    });

test("accepted enrollment commit remains visible to cancellation followed by reset", async (context) => {
    const host = await fixture(context);
    const setup = await host.setup();
    const entered = latch(),
        release = latch();
    const write = host.store.upsertUserMethod;
    host.store.upsertUserMethod = async (row) => {
        entered.resolve();
        await release.promise;
        await write(row);
    };
    const verifying = host.gateway.verifyMethodSetup({
        accountId: "alice",
        setupId: setup.setupId,
        verification: { code: "123456" },
    });
    await entered.promise;
    const cancellation = host.gateway.cancelMethodSetup("alice", setup.setupId);
    let resetFinished = false;
    const reset = host.gateway.resetUser("alice").then(() => {
        resetFinished = true;
    });
    await Promise.resolve();
    await Promise.resolve();
    assert.equal(resetFinished, false);
    release.resolve();
    const [result] = await Promise.all([verifying, cancellation, reset]);
    assert.equal(result.verified, true);
    assert.equal(resetFinished, true);
    assert.deepEqual(await host.store.listUserMethods("alice"), []);
    assert.equal(await host.store.getPendingSetup(setup.setupId), null);
});

test("recovery verification cannot return old success after reset during consumption", async (context) => {
    const host = await fixture(context);
    const entered = latch(),
        release = latch();
    host.store.recoveryCodes.push({
        accountId: "alice",
        codeHash: "SYNTHETIC",
        sortOrder: 0,
        createdAt: "",
        usedAt: null,
    });
    const consume = host.store.consumeRecoveryCode;
    host.store.consumeRecoveryCode = async (...args) => {
        const valid = await consume(...args);
        entered.resolve();
        await release.promise;
        return valid;
    };
    const verifying = host.gateway.verifyLogin(
        "alice",
        "recovery_code",
        { code: "SYNTHETIC" },
        createLoginLifetime(),
    );
    const rejected = assert.rejects(verifying, /tfa_attempt_expired/);
    await entered.promise;
    await host.gateway.resetUser("alice");
    release.resolve();
    await rejected;
    assert.equal(await host.store.hasUnusedRecoveryCodes("alice"), false);
});

test("setup expiry, save failure and late verification clean the owning adapter", async (context) => {
    const host = await fixture(context);
    let cancelled = 0;
    host.adapter.cancelSetup = async () => {
        cancelled++;
    };
    const save = host.store.savePendingSetup;
    host.store.savePendingSetup = async () => {
        throw new Error("synthetic_save_failure");
    };
    await assert.rejects(host.setup(), /synthetic_save_failure/);
    assert.equal(cancelled, 1);
    host.store.savePendingSetup = save;
    const setup = await host.setup();
    const entered = latch(),
        release = latch();
    host.adapter.verifySetup = async () => {
        entered.resolve();
        await release.promise;
        return { verified: true, state: {} };
    };
    const verifying = host.gateway.verifyMethodSetup({
        accountId: "alice",
        setupId: setup.setupId,
        verification: { code: "123456" },
    });
    await entered.promise;
    await host.gateway.cancelMethodSetup("alice", setup.setupId);
    release.resolve();
    assert.equal((await verifying).verified, false);
    assert.equal(cancelled, 2);
});

test("setup expiry is allocated before adapter admission and cleans delayed results", async (context) => {
    context.mock.timers.enable({ apis: ["Date", "setTimeout"], now: 1000 });
    const host = await fixture(context);
    const entered = latch(),
        release = latch();
    let cancelled = 0;
    host.adapter.cancelSetup = async () => {
        cancelled++;
    };
    host.adapter.beginSetup = async (input) => {
        assert.equal(input.lifetime.expiresAt, 601000);
        entered.resolve();
        await release.promise;
        assert.equal(input.lifetime.signal.aborted, true);
        return { pendingPayload: {}, view: { prompt: "prompt" } };
    };
    const pending = host.setup();
    const rejected = assert.rejects(pending, /tfa_attempt_expired/);
    await entered.promise;
    context.mock.timers.tick(600_000);
    release.resolve();
    await rejected;
    assert.equal(cancelled, 1);
});
