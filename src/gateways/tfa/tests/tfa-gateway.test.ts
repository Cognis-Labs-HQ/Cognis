import test from "node:test";
import assert from "node:assert/strict";
import { CoreTfaGateway, type TfaMethodAdapter } from "../gateway.js";

function createStoreMock() {
    const state = {
        methods: [] as Array<{
            accountId: string;
            methodId: string;
            enabled: boolean;
            sortOrder: number;
            state: Record<string, unknown>;
            configuredAt: string | null;
            updatedAt: string;
        }>,
        adapterConfigs: [] as Array<{
            adapterId: string;
            enabled: boolean;
            config: Record<string, unknown>;
        }>,
    };
    return {
        listAdapterConfigs: async () => state.adapterConfigs,
        saveAdapterConfig: async (
            adapterId: string,
            enabled: boolean,
            config: Record<string, unknown>,
        ) => {
            state.adapterConfigs = [{ adapterId, enabled, config }];
        },
        listUserMethods: async (accountId: string) =>
            state.methods.filter((entry) => entry.accountId === accountId),
        getNextSortOrder: async () => 0,
        upsertUserMethod: async (entry: {
            accountId: string;
            methodId: string;
            enabled: boolean;
            sortOrder: number;
            state: Record<string, unknown>;
            configuredAt?: string | null;
        }) => {
            state.methods = [
                ...state.methods.filter(
                    (existing) =>
                        !(
                            existing.accountId === entry.accountId &&
                            existing.methodId === entry.methodId
                        ),
                ),
                {
                    accountId: entry.accountId,
                    methodId: entry.methodId,
                    enabled: entry.enabled,
                    sortOrder: entry.sortOrder,
                    state: entry.state,
                    configuredAt: entry.configuredAt ?? null,
                    updatedAt: new Date().toISOString(),
                },
            ];
        },
        setPreferredOrder: async () => undefined,
        pruneExpiredPendingSetups: async () => undefined,
        savePendingSetup: async () => undefined,
        getPendingSetup: async () => null,
        deletePendingSetup: async () => undefined,
        hasUnusedRecoveryCodes: async () => false,
        consumeRecoveryCode: async () => false,
        replaceRecoveryCodes: async () => undefined,
        clearUserState: async () => undefined,
        getEnforceAllUsers: async () => false,
        setEnforceAllUsers: async () => undefined,
    };
}

function createAdapterMock(): TfaMethodAdapter {
    return {
        id: "totp",
        name: "TOTP",
        beginSetup: async () => ({
            pendingPayload: {},
            view: { prompt: "prompt" },
        }),
        verifySetup: async () => ({ verified: true, state: { secret: "abc" } }),
        verifyLogin: async ({ payload }) => ({
            verified: payload.code === "123456",
            message:
                payload.code === "123456" ? undefined : "invalid_totp_code",
        }),
        getConfigSchema: () => [],
        configure: () => undefined,
    };
}

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
