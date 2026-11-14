import type { TfaMethodAdapter } from "../../gateway.js";
import type {
    DbTfaStore,
    RecoveryCodeRecord,
    PendingTfaSetup,
} from "../../reuse/tfa-store.js";

export function createStoreMock(): Omit<DbTfaStore, never> & {
    recoveryCodes: RecoveryCodeRecord[];
} {
    const state = {
        enforceAllUsers: false,
        methods: [] as Array<{
            accountId: string;
            methodId: string;
            enabled: boolean;
            sortOrder: number;
            state: Record<string, unknown>;
            configuredAt: string | null;
            updatedAt: string;
        }>,
        adapterConfigs: new Map<
            string,
            {
                adapterId: string;
                enabled: boolean;
                config: Record<string, unknown>;
            }
        >(),
        recoveryCodes: [] as Array<{
            accountId: string;
            codeHash: string;
            sortOrder: number;
            createdAt: string;
            usedAt: string | null;
        }>,
    };
    const setups = new Map<string, PendingTfaSetup>();
    return {
        ensureSchema: async () => {},
        listAdapterConfigs: async () =>
            Array.from(state.adapterConfigs.values()),
        saveAdapterConfig: async (
            adapterId: string,
            enabled: boolean,
            config: Record<string, unknown>,
        ) => {
            state.adapterConfigs.set(adapterId, { adapterId, enabled, config });
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
        savePendingSetup: async (input) => {
            setups.set(input.setupId, {
                ...input,
                createdAt: new Date().toISOString(),
            });
        },
        getPendingSetup: async (id) => setups.get(id) ?? null,
        deletePendingSetup: async (id) => {
            setups.delete(id);
        },
        hasUnusedRecoveryCodes: async (accountId: string) =>
            state.recoveryCodes.some(
                (entry) =>
                    entry.accountId === accountId && entry.usedAt == null,
            ),
        countUnusedRecoveryCodes: async (accountId: string) =>
            state.recoveryCodes.filter(
                (entry) =>
                    entry.accountId === accountId && entry.usedAt == null,
            ).length,
        listRecoveryCodes: async (accountId: string) =>
            state.recoveryCodes.filter(
                (entry) => entry.accountId === accountId,
            ),
        consumeRecoveryCode: async (
            accountId: string,
            recoveryCode: string,
        ) => {
            const target = state.recoveryCodes.find(
                (entry) =>
                    entry.accountId === accountId &&
                    entry.codeHash === recoveryCode &&
                    entry.usedAt == null,
            );
            if (!target) return false;
            target.usedAt = new Date().toISOString();
            return true;
        },
        replaceRecoveryCodes: async () => undefined,
        clearUserState: async () => undefined,
        getEnforceAllUsers: async () => state.enforceAllUsers,
        setEnforceAllUsers: async (required: boolean) => {
            state.enforceAllUsers = required;
        },
        recoveryCodes: state.recoveryCodes,
    };
}

export function createAdapterMock(): TfaMethodAdapter {
    return {
        id: "totp",
        name: "TOTP",
        beginSetup: async () => ({
            pendingPayload: {},
            view: { prompt: "prompt" },
        }),
        verifySetup: async ({ verification }) => ({
            verified: verification.code === "123456",
            ...(verification.code === "123456"
                ? { state: { secret: "abc" } }
                : {}),
        }),
        verifyLogin: async ({ payload }) => ({
            verified: payload.code === "123456",
            message:
                payload.code === "123456"
                    ? undefined
                    : "invalid_verification_code",
        }),
        beginLoginChallenge: async () => ({ ready: true }),
        getConfigSchema: () => [],
        configure: () => undefined,
    };
}
