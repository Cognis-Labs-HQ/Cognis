import type { CapabilityContracts, Ctx } from "@cognis/core";

/** Runtime declarations are owned here, just as an external module declares its own APIs. */
export function declareNotificationContracts(root: Ctx): void {
    const contracts =
        root.requireCapability<CapabilityContracts>("system:contracts");
    for (const id of [
        "notify:registerEmailPurpose",
        "notify:sendEmail",
        "notify:emailDeliveryPolicy",
    ])
        contracts.define(id, {
            version: 1,
            kind: "function",
            description: "Owner-scoped email action registration and delivery.",
        });
    contracts.define("notify:emailTemplates", {
        version: 1,
        kind: "object",
        description:
            "Provider-supplied composable email factories and their configurable options.",
        members: {
            version: "number",
            blocks: "object",
            compose: "function",
            registerFactory: "function",
            bindFactory: "function",
            listFactories: "function",
            render: "function",
        },
    });
}
