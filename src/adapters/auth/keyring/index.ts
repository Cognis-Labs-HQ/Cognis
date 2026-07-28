import type { CapabilityStore } from "../../../gateways/shared.js";
import {
    createKeyringRoutes,
    type KeyringRouteContext,
} from "./api/routes/index.js";
import {
    DbKeyringVaultStore,
    type KeyringDbExecutor,
    type KeyringVaultStore,
} from "./store.js";

export { createKeyringRoutes, DbKeyringVaultStore, type KeyringVaultStore };

export async function bootstrapAuthAdapter(input: {
    capabilities: CapabilityStore;
}): Promise<void> {
    const store = new DbKeyringVaultStore(
        input.capabilities.require<KeyringDbExecutor>("db:executor"),
    );
    await store.ensureSchema();
    input.capabilities.contribute("auth:keyringVaultStore", store);
    input.capabilities.contribute(
        "auth:keyringRouteFactory",
        (routeContext: KeyringRouteContext) =>
            createKeyringRoutes({ routeContext, store }),
    );
}
