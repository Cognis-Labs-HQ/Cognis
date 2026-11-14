import { createLoginLifetime } from "./reuse/gateway-fixture.js";
import test from "node:test";
import assert from "node:assert/strict";
import { CoreTfaGateway, type TfaMethodAdapter } from "../gateway.js";
import { createStoreMock, createAdapterMock } from "./reuse/gateway-fixture.js";

test("tfa gateway ignores configured methods when their adapter is disabled", async () => {
    const storeMock = createStoreMock();
    const gateway = new CoreTfaGateway(storeMock as any);
    gateway.registerAdapter(createAdapterMock());
    await gateway.enableAdapter("totp");
    await storeMock.upsertUserMethod({
        accountId: "alice",
        methodId: "totp",
        enabled: true,
        sortOrder: 0,
        state: { secret: "abc" },
        configuredAt: new Date().toISOString(),
    });
    await gateway.disableAdapter("totp");

    const status = await gateway.getUserStatus("alice");
    const methods = await gateway.getLoginMethods(
        "alice",
        createLoginLifetime(),
    );

    assert.equal(status.hasConfiguredMethod, false);
    assert.equal(status.enabledMethods.length, 0);
    assert.equal(methods.length, 0);
});

test("tfa gateway exposes enabled method status for a user", async () => {
    const storeMock = createStoreMock();
    const gateway = new CoreTfaGateway(storeMock as any);
    gateway.registerAdapter(createAdapterMock());
    await gateway.enableAdapter("totp");
    await storeMock.upsertUserMethod({
        accountId: "alice",
        methodId: "totp",
        enabled: true,
        sortOrder: 0,
        state: { secret: "abc" },
        configuredAt: new Date().toISOString(),
    });
    const status = await gateway.getUserStatus("alice");
    assert.equal(status.enabledMethods.length, 1);
    assert.equal(status.enabledMethods[0].id, "totp");
});

test("tfa gateway dispatches low recovery-code notification after recovery login", async () => {
    const storeMock = createStoreMock();
    storeMock.recoveryCodes.push(
        {
            accountId: "alice",
            codeHash: "code-1",
            sortOrder: 0,
            createdAt: new Date().toISOString(),
            usedAt: null,
        },
        {
            accountId: "alice",
            codeHash: "code-2",
            sortOrder: 1,
            createdAt: new Date().toISOString(),
            usedAt: null,
        },
    );
    const notifications: Array<Record<string, unknown>> = [];
    const gateway = new CoreTfaGateway(storeMock as any, {
        dispatchNotification: async (envelope) => {
            notifications.push(envelope);
        },
    });
    const result = await gateway.verifyLogin(
        "alice",
        "recovery_code",
        {
            code: "code-1",
        },
        createLoginLifetime(),
    );
    assert.equal(result.verified, true);
    assert.equal(notifications.length, 1);
    assert.equal(notifications[0].category, "security");
    assert.equal(notifications[0].recipientUsername, "alice");
});

test("tfa gateway excludes methods when login challenge is not ready", async () => {
    const storeMock = createStoreMock();
    const gateway = new CoreTfaGateway(storeMock as any);
    gateway.registerAdapter({
        id: "smtp",
        name: "Email",
        beginSetup: async () => ({
            pendingPayload: {},
            view: { prompt: "prompt" },
        }),
        verifySetup: async () => ({ verified: true, state: {} }),
        beginLoginChallenge: async () => ({ ready: false }),
        verifyLogin: async () => ({ verified: false }),
        getConfigSchema: () => [],
        configure: () => undefined,
    });
    await gateway.enableAdapter("smtp");
    await storeMock.upsertUserMethod({
        accountId: "alice",
        methodId: "smtp",
        enabled: true,
        sortOrder: 0,
        state: { email: "alice@example.com" },
        configuredAt: new Date().toISOString(),
    });
    const methods = await gateway.getLoginMethods(
        "alice",
        createLoginLifetime(),
    );
    assert.equal(
        methods.some((method) => method.id === "smtp"),
        false,
    );
});

test("tfa gateway includes rate-limited smtp method with challenge metadata", async () => {
    const storeMock = createStoreMock();
    const gateway = new CoreTfaGateway(storeMock as any);
    gateway.registerAdapter({
        id: "smtp",
        name: "Email",
        beginSetup: async () => ({
            pendingPayload: {},
            view: { prompt: "prompt" },
        }),
        verifySetup: async () => ({ verified: true, state: {} }),
        beginLoginChallenge: async () => ({
            ready: true,
            message: "email_rate_limited",
            retryAfterSeconds: 45,
            resendAvailableAt: "2026-01-01T00:00:45.000Z",
        }),
        verifyLogin: async () => ({ verified: false }),
        getConfigSchema: () => [],
        configure: () => undefined,
    });
    await gateway.enableAdapter("smtp");
    await storeMock.upsertUserMethod({
        accountId: "alice",
        methodId: "smtp",
        enabled: true,
        sortOrder: 0,
        state: { email: "alice@example.com" },
        configuredAt: new Date().toISOString(),
    });
    const methods = await gateway.getLoginMethods(
        "alice",
        createLoginLifetime(),
    );
    assert.equal(methods[0]?.id, "smtp");
    assert.equal(methods[0]?.challenge?.message, "email_rate_limited");
    assert.equal(methods[0]?.challenge?.retryAfterSeconds, 45);
    assert.equal(
        methods[0]?.challenge?.resendAvailableAt,
        "2026-01-01T00:00:45.000Z",
    );
});

test("tfa gateway enableAdapter preserves existing adapter config", async () => {
    const storeMock = createStoreMock();
    await storeMock.saveAdapterConfig("totp", true, { algorithm: "SHA512" });
    const gateway = new CoreTfaGateway(storeMock as any);
    gateway.registerAdapter(createAdapterMock());
    await gateway.loadPersistedConfigs();
    await gateway.disableAdapter("totp");
    await gateway.enableAdapter("totp");
    const configs = await storeMock.listAdapterConfigs();
    const totpConfig = configs.find((entry) => entry.adapterId === "totp");
    assert.ok(totpConfig !== undefined);
    assert.equal(totpConfig.enabled, true);
    assert.equal(totpConfig.config.algorithm, "SHA512");
});

test("tfa gateway disableAdapter preserves existing adapter config", async () => {
    const storeMock = createStoreMock();
    await storeMock.saveAdapterConfig("totp", true, { algorithm: "SHA512" });
    const gateway = new CoreTfaGateway(storeMock as any);
    gateway.registerAdapter(createAdapterMock());
    await gateway.loadPersistedConfigs();
    await gateway.disableAdapter("totp");
    const configs = await storeMock.listAdapterConfigs();
    const totpConfig = configs.find((entry) => entry.adapterId === "totp");
    assert.ok(totpConfig !== undefined);
    assert.equal(totpConfig.enabled, false);
    assert.equal(totpConfig.config.algorithm, "SHA512");
});

test("tfa gateway auto-enables adapters with defaultEnabled on fresh install", async () => {
    const storeMock = createStoreMock();
    const adapter: TfaMethodAdapter = {
        ...createAdapterMock(),
        defaultEnabled: true,
    };
    const gateway = new CoreTfaGateway(storeMock as any);
    gateway.registerAdapter(adapter);
    await gateway.loadPersistedConfigs();
    assert.equal(gateway.isAdapterEnabled("totp"), true);
    const status = await gateway.getUserStatus("alice");
    const available = status.availableMethods.find(
        (method) => method.id === "totp",
    );
    assert.ok(available !== undefined);
});

test("tfa gateway exposes adapter sync targets without locking enabled state", async () => {
    const storeMock = createStoreMock();
    const gateway = new CoreTfaGateway(storeMock as any);
    gateway.registerAdapter({
        id: "custom",
        name: "Custom",
        beginSetup: async () => ({ pendingPayload: {}, view: { prompt: "" } }),
        verifySetup: async () => ({ verified: true, state: {} }),
        verifyLogin: async () => ({ verified: false }),
        getConfigSchema: () => [],
        configure: () => undefined,
    });
    gateway.setAdapterSyncTarget("custom", {
        gatewayId: "notify",
        adapterId: "smtp",
    });
    await gateway.loadPersistedConfigs();

    assert.equal(gateway.isAdapterEnabled("custom"), false);
    const adaptersOff = gateway.listAdapters();
    const customOff = adaptersOff.find((adapter) => adapter.id === "custom");
    assert.ok(customOff !== undefined);
    assert.equal(customOff.enabled, false);
    assert.equal(customOff.locked, undefined);
    assert.deepEqual(customOff.syncedTo, {
        gatewayId: "notify",
        adapterId: "smtp",
    });

    await gateway.enableAdapter("custom");
    assert.equal(gateway.isAdapterEnabled("custom"), true);
    const adaptersOn = gateway.listAdapters();
    const customOn = adaptersOn.find((adapter) => adapter.id === "custom");
    assert.ok(customOn !== undefined);
    assert.equal(customOn.enabled, true);
    assert.equal(customOn.locked, undefined);
    assert.deepEqual(customOn.syncedTo, {
        gatewayId: "notify",
        adapterId: "smtp",
    });
});

test("tfa gateway notifies adapter enabled state listeners", async () => {
    const storeMock = createStoreMock();
    const gateway = new CoreTfaGateway(storeMock as any);
    gateway.registerAdapter({
        id: "smtp",
        name: "Email",
        beginSetup: async () => ({ pendingPayload: {}, view: { prompt: "" } }),
        verifySetup: async () => ({ verified: true, state: {} }),
        verifyLogin: async () => ({ verified: false }),
        getConfigSchema: () => [],
        configure: () => undefined,
    });
    const changes: Array<{ adapterId: string; enabled: boolean }> = [];
    gateway.onAdapterEnabledChange("test", (adapterId, enabled) => {
        changes.push({ adapterId, enabled });
    });

    await gateway.enableAdapter("smtp");
    await gateway.disableAdapter("smtp");
    await gateway.disableAdapter("smtp");

    assert.deepEqual(changes, [
        { adapterId: "smtp", enabled: true },
        { adapterId: "smtp", enabled: false },
    ]);
});

test("tfa gateway notifies adapter config listeners", async () => {
    const storeMock = createStoreMock();
    const gateway = new CoreTfaGateway(storeMock as any);
    gateway.registerAdapter({
        id: "smtp",
        name: "Email",
        beginSetup: async () => ({ pendingPayload: {}, view: { prompt: "" } }),
        verifySetup: async () => ({ verified: true, state: {} }),
        verifyLogin: async () => ({ verified: false }),
        getConfigSchema: () => [],
        configure: () => undefined,
    });
    const changes: Array<Record<string, unknown>> = [];
    gateway.onAdapterConfigChange("test", (_adapterId, config) => {
        changes.push(config);
    });

    await gateway.saveAdapterConfig("smtp", { enabled: true, codeLength: 8 });

    assert.deepEqual(changes, [{ codeLength: 8 }]);
});

test("tfa gateway login methods follow configured preferred ordering", async () => {
    const storeMock = createStoreMock();
    const gateway = new CoreTfaGateway(storeMock as any);
    let smtpChallengeCallCount = 0;
    gateway.registerAdapter({
        id: "smtp",
        name: "Email",
        beginSetup: async () => ({ pendingPayload: {}, view: { prompt: "" } }),
        verifySetup: async () => ({ verified: true, state: {} }),
        beginLoginChallenge: async () => {
            smtpChallengeCallCount++;
            return { ready: true };
        },
        verifyLogin: async () => ({ verified: true }),
        getConfigSchema: () => [],
        configure: () => undefined,
    });
    gateway.registerAdapter(createAdapterMock());
    await gateway.enableAdapter("smtp");
    await gateway.enableAdapter("totp");
    await storeMock.upsertUserMethod({
        accountId: "alice",
        methodId: "totp",
        enabled: true,
        sortOrder: 1,
        state: { secret: "abc" },
        configuredAt: new Date().toISOString(),
    });
    await storeMock.upsertUserMethod({
        accountId: "alice",
        methodId: "smtp",
        enabled: true,
        sortOrder: 0,
        state: { email: "alice@example.com" },
        configuredAt: new Date().toISOString(),
    });
    const methods = await gateway.getLoginMethods(
        "alice",
        createLoginLifetime(),
    );
    assert.deepEqual(methods.map((method) => method.id).slice(0, 2), [
        "smtp",
        "totp",
    ]);
});

test("tfa gateway does not initiate challenges when multiple methods are available", async () => {
    const storeMock = createStoreMock();
    const gateway = new CoreTfaGateway(storeMock as any);
    let smtpChallengeCallCount = 0;
    gateway.registerAdapter({
        id: "smtp",
        name: "Email",
        beginSetup: async () => ({ pendingPayload: {}, view: { prompt: "" } }),
        verifySetup: async () => ({ verified: true, state: {} }),
        beginLoginChallenge: async () => {
            smtpChallengeCallCount++;
            return { ready: true };
        },
        verifyLogin: async () => ({ verified: true }),
        getConfigSchema: () => [],
        configure: () => undefined,
    });
    gateway.registerAdapter(createAdapterMock());
    await gateway.enableAdapter("smtp");
    await gateway.enableAdapter("totp");
    await storeMock.upsertUserMethod({
        accountId: "alice",
        methodId: "smtp",
        enabled: true,
        sortOrder: 0,
        state: { email: "alice@example.com" },
        configuredAt: new Date().toISOString(),
    });
    await storeMock.upsertUserMethod({
        accountId: "alice",
        methodId: "totp",
        enabled: true,
        sortOrder: 1,
        state: { secret: "abc" },
        configuredAt: new Date().toISOString(),
    });
    const methods = await gateway.getLoginMethods(
        "alice",
        createLoginLifetime(),
    );
    assert.strictEqual(
        smtpChallengeCallCount,
        0,
        "beginLoginChallenge must not be called when multiple methods are available",
    );
    assert.ok(methods.length >= 2, "all configured methods should be returned");
    for (const method of methods) {
        assert.ok(
            !("challenge" in method) || method.challenge == null,
            `method ${method.id} must not include challenge data in multi-method response`,
        );
    }
});

test("tfa gateway does not initiate challenge when recovery codes are also available", async () => {
    const storeMock = createStoreMock();
    const gateway = new CoreTfaGateway(storeMock as any);
    let smtpChallengeCallCount = 0;
    gateway.registerAdapter({
        id: "smtp",
        name: "Email",
        beginSetup: async () => ({ pendingPayload: {}, view: { prompt: "" } }),
        verifySetup: async () => ({ verified: true, state: {} }),
        beginLoginChallenge: async () => {
            smtpChallengeCallCount++;
            return { ready: true };
        },
        verifyLogin: async () => ({ verified: true }),
        getConfigSchema: () => [],
        configure: () => undefined,
    });
    await gateway.enableAdapter("smtp");
    await storeMock.upsertUserMethod({
        accountId: "alice",
        methodId: "smtp",
        enabled: true,
        sortOrder: 0,
        state: { email: "alice@example.com" },
        configuredAt: new Date().toISOString(),
    });
    storeMock.recoveryCodes.push({
        accountId: "alice",
        codeHash: "code-1",
        sortOrder: 0,
        createdAt: new Date().toISOString(),
        usedAt: null,
    });
    const methods = await gateway.getLoginMethods(
        "alice",
        createLoginLifetime(),
    );
    assert.equal(
        smtpChallengeCallCount,
        0,
        "beginLoginChallenge must not be called when recovery code is available",
    );
    assert.deepEqual(
        methods.map((method) => method.id),
        ["smtp", "recovery_code"],
    );
    assert.ok(
        !("challenge" in methods[0]!) || methods[0]!.challenge == null,
        "smtp method must not include challenge data when recovery code is available",
    );
});
