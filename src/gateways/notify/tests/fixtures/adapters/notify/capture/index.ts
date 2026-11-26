import type { CapabilityContracts, Ctx } from "@cognis/core";
import type {
    NotificationEnvelope,
    NotificationSender,
} from "../../../../../contracts/sender.js";

export function createNotificationSender(): NotificationSender {
    let receive: (message: NotificationEnvelope) => void;
    return {
        senderId: "capture",
        isConfigured: () => true,
        async bootstrap(ctx) {
            receive = ctx.capabilities.require("test:receiveNotification");
            const root = ctx.capabilities.require<Ctx>("system:ctx");
            root.contributePublicCapability("capture:ready", () => true);
            if (
                !ctx.capabilities
                    .require<CapabilityContracts>("system:contracts")
                    .resolve<() => boolean>("capture:ready", 1)()
            )
                throw new Error("capture_contract_unavailable");
            ctx.capabilities.require<(id: string) => void>(
                "notify:registerAlwaysOnSender",
            )("capture");
        },
        async send(message) {
            receive(message);
        },
    };
}

export function defineContracts(ctx: {
    capabilities: { require<T>(id: string): T };
}) {
    ctx.capabilities
        .require<CapabilityContracts>("system:contracts")
        .define("capture:ready", {
            version: 1,
            kind: "function",
            description:
                "Reports whether this fixture provider is initialized.",
        });
}
