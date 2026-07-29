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

export function createAdapter(): AuthProviderAdapter {
    return {
        id: "keyring",
        name: "Encrypted Keyring",
        locked: true,
        authenticationProvider: false,
        async authenticate() {
            return null;
        },
        getConfigSchema() {
            return [];
        },
        configure() {},
    };
}

export async function bootstrapAuthAdapter(input: {
    capabilities: CapabilityStore;
    adapterRoot: string;
    registerStaticDir?: (adapterId: string, absolutePath: string) => void;
    registerNavbarPlugin?: (scriptUrl: string) => void;
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
            createKeyringRoutes({ routeContext, store }),
    );
    input.registerStaticDir?.("keyring", path.join(input.adapterRoot, "ui"));
    input.registerNavbarPlugin?.("/static/adapters/auth/keyring/keyring.js");
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
