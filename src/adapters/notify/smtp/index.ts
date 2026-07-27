import type { NotifyAdapterBootstrapCtx } from "../../../gateways/notify/gateway.js";

export type { SmtpConfig } from "./notification-sender.js";
export {
    SmtpTemporaryError,
    SmtpNotificationSender,
} from "./notification-sender.js";
export { SmtpRateLimiter } from "./notification-queue.js";
export { createNotificationSender } from "./notification-sender-factory.js";
export async function bootstrapNotifyAdapter(
    ctx: NotifyAdapterBootstrapCtx,
): Promise<void> {
    ctx.capabilities.contribute(
        "notify:sendEmail",
        async (input: {
            recipientEmail: string;
            templateId: string;
            variables: Record<string, string>;
        }) => {
            const renderTemplate = ctx.capabilities.get<
                (
                    templateId: string,
                    variables: Record<string, string>,
                ) => {
                    subject: string;
                    body: string;
                    senderName?: string;
                    actionUrl?: string;
                    actionLabel?: string;
                } | null
            >("notify:renderEmailTemplate");
            const message = renderTemplate?.(input.templateId, input.variables);
            if (!message) throw new Error("email_template_not_found");
            if (!ctx.gateway.isSenderEnabled("smtp")) {
                throw new Error("smtp_sender_disabled");
            }
            const sender = ctx.gateway.getSender("smtp");
            if (!sender) throw new Error("smtp_sender_unavailable");
            const envelope = {
                category: "system",
                recipientUsername: input.recipientEmail,
                recipientEmail: input.recipientEmail,
                subject: message.subject,
                body: message.body,
                senderName: message.senderName,
                actionUrl: message.actionUrl,
                metadata: {
                    verifyUrl: message.actionUrl,
                    verifyButtonLabel: message.actionLabel,
                },
            };
            if (typeof sender.sendTracked === "function") {
                return sender.sendTracked(envelope);
            }
            await sender.send(envelope);
            return { sent: true };
        },
    );
    ctx.log?.("info", "SMTP email capability registered.", {
        component: "notify-smtp",
        capability: "notify:sendEmail",
    });
}
