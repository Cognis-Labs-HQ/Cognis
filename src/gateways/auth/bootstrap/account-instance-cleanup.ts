import type { CapabilityContracts } from "@cognis/core";
import type { GatewayBootstrapContext } from "../../shared.js";
import type { AccountInstanceStore } from "../account-instance-store.js";
import type { DeprovisionOutcomes } from "../contracts/deprovision-outcome.js";

export function registerAccountInstanceCleanup(
    ctx: Pick<GatewayBootstrapContext, "flow" | "log">,
    accountInstanceStore: Pick<AccountInstanceStore, "delete">,
): void {
    ctx.flow.extend(
        "deprovision-user",
        "cleanup-dependencies",
        { id: "auth-gateway:delete-account-instance" },
        async (stage) => {
            const username = stage.ctx
                .requireCapability<CapabilityContracts>("system:contracts")
                .resolve<DeprovisionOutcomes>("auth:deprovisionOutcome", 1)
                .deletedAccount(stage.input, stage.stageResults);
            if (typeof username !== "string" || !username.trim())
                return { cleaned: false };
            await accountInstanceStore.delete(username);
            const accountId = username.trim().toLowerCase();
            ctx.log?.("info", "Deleted transient account instance.", {
                component: "auth-gateway",
                operation: "delete_account_instance",
                accountId,
            });
            return { cleaned: true, accountId };
        },
    );
}
