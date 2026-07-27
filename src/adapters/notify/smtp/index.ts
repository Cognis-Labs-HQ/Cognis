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
        "notify:sendShareEmail",
        async (input: {
            recipientEmail: string;
            shareUrl: string;
            shareLabel: string;
        }) => {
            const result = await ctx.gateway.dispatch({
                category: "share",
                recipientUsername: input.recipientEmail,
                recipientEmail: input.recipientEmail,
                subject:
                    input.shareLabel || "A Cognis item was shared with you",
                body: `A Cognis item was shared with you.\n\nOpen the shared item:\n${input.shareUrl}`,
                senderName: "Cognis Share",
                actionUrl: input.shareUrl,
                metadata: {
                    template: "share",
                    verifyUrl: input.shareUrl,
                    verifyButtonLabel: "Open Shared Item",
                },
            });
            if (!result.dispatched.includes("smtp")) {
                throw new Error("smtp_share_email_not_dispatched");
            }
            return result;
        },
    );
    ctx.log?.("info", "SMTP share-email capability registered.", {
        component: "notify-smtp",
        capability: "notify:sendShareEmail",
    });
}
