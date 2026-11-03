import { requireBootstrapScope } from "@cognis/core";
export function createFixture(adapterId, valid = true) {
    let contracts;
    return {
        defineContracts(ctx) {
            contracts = ctx.capabilities.require("system:contracts");
            const root = ctx.capabilities.require("system:ctx");
            const id = `share-fixture:${adapterId}`;
            const publish = () =>
                root.contributePublicCapability(id, () => adapterId);
            publish();
            const dispose = () => {
                root.removeCapability(id);
            };
            dispose.reactivate = publish;
            requireBootstrapScope(root).registerDisposer(dispose);
            contracts.define(`share-fixture:${adapterId}`, {
                version: 1,
                kind: "function",
                description: "Fixture adapter contract.",
            });
        },
        createShareAdapter() {
            if (!contracts?.describe(`share-fixture:${adapterId}`))
                throw new Error(
                    "contract_definition_missing_before_initialization",
                );
            return {
                id: adapterId,
                name: valid ? "Contract fixture" : "",
                delivery: "public",
                pageModuleUrl: "/fixture/share.js",
                prepare: () => ({ accessControls: { recipients: [] } }),
            };
        },
    };
}
