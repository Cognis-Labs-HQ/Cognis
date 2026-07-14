import type { NotifyAdapterBootstrapCtx } from "../../../gateways/notify/gateway.js";
import { buildMailtoShareUrl } from "./quick-share.js";

export type { SmtpConfig } from "./notification-sender.js";
export {
    SmtpTemporaryError,
    SmtpNotificationSender,
} from "./notification-sender.js";
export { SmtpRateLimiter } from "./notification-queue.js";
export { createNotificationSender } from "./notification-sender-factory.js";
export { buildMailtoShareUrl } from "./quick-share.js";

export async function bootstrapNotifyAdapter(
    ctx: NotifyAdapterBootstrapCtx,
): Promise<void> {
    ctx.capabilities.contribute("notify:quickShare:smtp", buildMailtoShareUrl);
    ctx.log?.("info", "SMTP quick-share capability registered.", {
        component: "notify-smtp",
        capability: "notify:quickShare:smtp",
    });
}
