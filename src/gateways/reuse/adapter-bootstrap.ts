import {
    requireBootstrapScope,
    runBootstrapScope,
    type CapabilityStore,
    type CapabilityContracts,
    type Ctx,
} from "@cognis/core";

export interface AdapterContractModule {
    defineContracts?: unknown;
}

/** Gateways delegate contract registration to an adapter's own revocable bootstrap identity. */
export async function bootstrapAdapter<
    Context extends { capabilities: CapabilityStore },
    Result,
>(
    gatewayId: string,
    adapterId: string,
    context: Context,
    module: object,
    initialize: () => Result | Promise<Result>,
): Promise<Result> {
    const root = context.capabilities.require<Ctx>("system:ctx");
    const parent = requireBootstrapScope(root);
    const contracts =
        root.requireCapability<CapabilityContracts>("system:contracts");
    const exposed = context.capabilities.get("system:contracts");
    if (exposed !== undefined && exposed !== contracts)
        throw new Error("adapter_contract_registry_conflict");
    if (exposed === undefined)
        context.capabilities.contribute("system:contracts", contracts);
    const defineContracts = Reflect.get(module, "defineContracts");
    if (defineContracts !== undefined && typeof defineContracts !== "function")
        throw new Error("invalid_adapter_contract_definition");
    return runBootstrapScope(
        root,
        `adapter:${gatewayId}:${adapterId}`,
        async () => {
            if (typeof defineContracts === "function")
                await defineContracts(context);
            return initialize();
        },
        (dispose) => parent.registerDisposer(dispose),
    );
}
