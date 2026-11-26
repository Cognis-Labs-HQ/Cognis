import { bootstrapAdapter } from "../reuse/adapter-bootstrap.js";
import { requireBootstrapScope, type CapabilityStore } from "@cognis/core";
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
    for (const adapter of adapters) {
        if (!adapter.bootstrap && adapter.defineContracts === undefined)
            continue;
        const context: TfaAdapterBootstrapContext = {
            capabilities,
            isEnabled: () => gateway.isAdapterEnabled(adapter.id),
            registerSyncTarget: (target) =>
                gateway.setAdapterSyncTarget(adapter.id, target),
            onEnabledChange: (id, listener) => {
                const callback = async (
                    changedId: string,
                    enabled: boolean,
                ) => {
                    if (changedId === adapter.id) await listener(enabled);
                };
                let unregister = gateway.onAdapterEnabledChange(id, callback);
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
        };
        await bootstrapAdapter(
            "tfa",
            adapter.id,
            context,
            adapter,
            async () => {
                await adapter.bootstrap?.(context);
            },
        );
    }
}
