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
            const result = await ctx.gateway.dispatch({
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
            });
            if (!result.dispatched.includes("smtp")) {
                throw new Error("smtp_email_not_dispatched");
            }
            return result;
        },
    );
    ctx.log?.("info", "SMTP email capability registered.", {
        component: "notify-smtp",
        capability: "notify:sendEmail",
    });
}
