import {
    requireBootstrapScope,
    runBootstrapScope,
    type CapabilityStore,
} from "@cognis/core";
import type { CoreTfaGateway, TfaMethodAdapter } from "./gateway.js";

export interface TfaAdapterBootstrapContext {
    capabilities: CapabilityStore;
    isEnabled(): boolean;
    registerSyncTarget(target: { gatewayId: string; adapterId: string }): void;
    onEnabledChange(
        id: string,
        listener: (enabled: boolean) => Promise<void>,
    ): void;
}

/** Give each adapter a revocable bootstrap identity and its own bounded host controls. */
export async function bootstrapTfaAdapters(
    adapters: Iterable<TfaMethodAdapter>,
    capabilities: CapabilityStore,
    gateway: CoreTfaGateway,
): Promise<void> {
    const parent = requireBootstrapScope();
    for (const adapter of adapters) {
        if (!adapter.bootstrap) continue;
        await runBootstrapScope(
            parent.root,
            `adapter:tfa:${adapter.id}`,
            () =>
                adapter.bootstrap!({
                    capabilities,
                    isEnabled: () => gateway.isAdapterEnabled(adapter.id),
                    registerSyncTarget: (target) =>
                        gateway.setAdapterSyncTarget(adapter.id, target),
                    onEnabledChange: (id, listener) => {
                        const callback = async (
                            changedId: string,
                            enabled: boolean,
                        ) => {
                            if (changedId === adapter.id)
                                await listener(enabled);
                        };
                        let unregister = gateway.onAdapterEnabledChange(
                            id,
                            callback,
                        );
                        const dispose = Object.assign(() => unregister(), {
                            reactivate: () => {
                                unregister = gateway.onAdapterEnabledChange(
                                    id,
                                    callback,
                                );
                            },
                        });
                        requireBootstrapScope().registerDisposer(dispose);
                    },
                }),
            (dispose) => parent.registerDisposer(dispose),
        );
    }
}
