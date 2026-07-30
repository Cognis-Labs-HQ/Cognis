import type { CapabilityStore } from "../../../gateways/shared.js";
import path from "node:path";
import {
    createKeyringRoutes,
    type KeyringRouteContext,
} from "./api/routes/index.js";
import {
    DbKeyringVaultStore,
    type KeyringDbExecutor,
    type KeyringVaultStore,
} from "./store.js";
import type { AuthProviderAdapter } from "../../../gateways/auth/gateway.js";
import type { FlowApi } from "@cognis/core";

export { createKeyringRoutes, DbKeyringVaultStore, type KeyringVaultStore };

const DEFAULT_MAX_VAULT_MIB = 2;
const DEFAULT_DERIVATION_ITERATIONS = 310_000;
const keyringConfig = {
    maxVaultMiB: DEFAULT_MAX_VAULT_MIB,
    derivationIterations: DEFAULT_DERIVATION_ITERATIONS,
};

function positiveNumber(value: unknown, fallback: number): number {
    const parsedValue = Number(value);
    return Number.isFinite(parsedValue) && parsedValue > 0
        ? parsedValue
        : fallback;
}

function getKeyringPolicy() {
    return {
        maxVaultBytes: Math.floor(keyringConfig.maxVaultMiB * 1024 * 1024),
        derivationIterations: Math.floor(keyringConfig.derivationIterations),
    };
}

export function createAdapter(): AuthProviderAdapter {
    return {
        id: "keyring",
        name: "User Keyring",
        locked: true,
        authenticationProvider: false,
        async authenticate() {
            return null;
        },
        getConfigSchema() {
            return [
                {
                    key: "maxVaultMiB",
                    label: "Maximum vault size (MiB)",
                    type: "number",
                    required: true,
                },
                {
                    key: "derivationIterations",
                    label: "Password derivation iterations",
                    type: "number",
                    required: true,
                },
            ];
        },
        configure(config) {
            keyringConfig.maxVaultMiB = positiveNumber(
                config.maxVaultMiB,
                DEFAULT_MAX_VAULT_MIB,
            );
            keyringConfig.derivationIterations = positiveNumber(
                config.derivationIterations,
                DEFAULT_DERIVATION_ITERATIONS,
            );
        },
    };
}

export async function bootstrapAuthAdapter(input: {
    capabilities: CapabilityStore;
    adapterRoot: string;
    registerStaticDir?: (adapterId: string, absolutePath: string) => void;
    registerNavbarPlugin?: (scriptUrl: string) => void;
    registerSettingsSection?: (section: {
        id: string;
        label: string;
        scriptUrl: string;
        stringsBaseUrl?: string;
    }) => void;
    flow?: FlowApi;
    log?: (
        level: "info" | "warn" | "error",
        message: string,
        metadata?: Record<string, unknown>,
    ) => void;
}): Promise<void> {
    const store = new DbKeyringVaultStore(
        input.capabilities.require<KeyringDbExecutor>("db:executor"),
    );
    await store.ensureSchema();
    input.capabilities.contribute("auth:keyringVaultStore", store);
    input.capabilities.contribute(
        "auth:deleteKeyringVault",
        (accountId: string) => store.delete(accountId),
    );
    input.capabilities.contribute(
        "auth:keyringRouteFactory",
        (routeContext: KeyringRouteContext) =>
            createKeyringRoutes({
                routeContext,
                store,
                getAccountInstanceId: input.capabilities.require(
                    "auth:getAccountInstanceId",
                ),
                getPolicy: getKeyringPolicy,
                log: input.log,
            }),
    );
    input.registerStaticDir?.("keyring", path.join(input.adapterRoot, "ui"));
    input.registerNavbarPlugin?.("/static/adapters/auth/keyring/keyring.js");
    input.registerSettingsSection?.({
        id: "keyring",
        label: "Keyring",
        scriptUrl: "/static/adapters/auth/keyring/settings.js",
        stringsBaseUrl: "/static/adapters/auth/keyring/languages",
    });
    input.flow?.extend(
        "deprovision-user",
        "cleanup-dependencies",
        { id: "auth-keyring:purge-deleted-user" },
        async (stageContext) => {
            const request = (stageContext.input ?? {}) as {
                username?: string;
                action?: string;
            };
            const persisted = (
                stageContext.stageResults["persist-state"] ?? []
            ).some(
                (result) =>
                    (result as { persisted?: boolean }).persisted === true,
            );
            if (
                !persisted ||
                request.action !== "delete" ||
                !request.username
            ) {
                return { purged: false };
            }
            const accountId = request.username.trim().toLowerCase();
            await store.delete(accountId);
            input.log?.("info", "Deleted user keyring vault.", {
                component: "auth-keyring-adapter",
                operation: "delete_user_keyring",
                accountId,
            });
            return { purged: true, accountId };
        },
    );
}
