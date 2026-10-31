import type { NotificationEnvelope, NotificationSender } from "@cognis/core";

export function createNotificationSender(): NotificationSender {
    let receive: (message: NotificationEnvelope) => void;
    return {
        senderId: "capture",
        isConfigured: () => true,
        async bootstrap(ctx) {
            receive = ctx.capabilities.require("test:receiveNotification");
            ctx.capabilities.require<(id: string) => void>(
                "notify:registerAlwaysOnSender",
            )("capture");
        },
        async send(message) {
            receive(message);
        },
    };
}
