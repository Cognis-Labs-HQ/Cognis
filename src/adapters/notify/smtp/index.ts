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
    ctx.registerRoute(async (req, res, url) => {
        if (
            url.pathname !== "/api/v1/gateways/notify/adapters/smtp/test" ||
            req.method !== "POST"
        ) {
            return false;
        }
        if (!ctx.requireAuth(req, res, "admin")) return true;
        const body = await ctx.readJson(req);
        const recipientEmail = String(body.to ?? "").trim();
        const config =
            body.config &&
            typeof body.config === "object" &&
            !Array.isArray(body.config)
                ? (body.config as Record<string, unknown>)
                : undefined;
        try {
            await ctx.gateway.sendTestEmail("smtp", recipientEmail, config);
        } catch (error) {
            ctx.log?.("error", "SMTP test email failed.", {
                component: "notify-smtp",
                operation: "send_test_email",
                recipientEmail,
                error: error instanceof Error ? error.message : String(error),
            });
            res.writeHead(400, { "content-type": "application/json" });
            res.end(
                JSON.stringify({
                    error: {
                        code: "smtp_test_failed",
                        message:
                            "SMTP test email could not be sent. Verify the server, security mode, sender, and authentication settings.",
                    },
                }),
            );
            return true;
        }
        res.writeHead(200, { "content-type": "application/json" });
        res.end(JSON.stringify({ data: { sent: true } }));
        return true;
    }, "notify");

    ctx.capabilities.contribute(
        "notify:sendEmail",
        async (input: {
            recipientEmail: string;
            templateId: string;
            variables: Record<string, string>;
            config?: Record<string, unknown>;
            theme?: string;
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
            if (input.templateId === "notify-test") {
                await ctx.gateway.sendTestEmail(
                    "smtp",
                    input.recipientEmail,
                    input.config,
                );
                return { sent: true };
            }
            const envelope = {
                category: "system",
                recipientUsername: input.recipientEmail,
                recipientEmail: input.recipientEmail,
                subject: message.subject,
                body: message.body,
                senderName: message.senderName,
                actionUrl: message.actionUrl,
                metadata: {
                    ...(input.theme ? { theme: input.theme } : {}),
                    verifyUrl: message.actionUrl,
                    verifyButtonLabel: message.actionLabel,
                },
            };
            return ctx.gateway.sendWithSender("smtp", envelope);
        },
    );
    ctx.log?.("info", "SMTP email capability registered.", {
        component: "notify-smtp",
        capability: "notify:sendEmail",
    });
}
