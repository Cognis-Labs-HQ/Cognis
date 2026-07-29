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
}
