import { declareSmtpContracts } from "./contracts/declarations.js";
import type { CapabilityContracts, Ctx } from "@cognis/core";
import type { NotifyAdapterBootstrapCtx } from "../../../gateways/notify/contracts/sender.js";
import type { SmtpNotificationSender } from "./notification-sender.js";
import { registerSmtpActions } from "./purposes.js";

export async function bootstrapNotifyAdapter(
    ctx: NotifyAdapterBootstrapCtx,
    sender: SmtpNotificationSender,
): Promise<void> {
    declareSmtpContracts(
        ctx.capabilities
            .require<Ctx>("system:ctx")
            .requireCapability<CapabilityContracts>("system:contracts"),
    );
    sender.setRecipientThemeResolver(async (email) => {
        try {
            const accountId = await ctx.capabilities.get<
                (email: string) => Promise<string | null>
            >("notify:getAccountIdByEmail")?.(email);
            if (!accountId) return "light";
            const stored = await ctx.capabilities
                .get<{ get(id: string, key: string): Promise<string | null> }>(
                    "preferences:store",
                )
                ?.get(accountId, "ui-preferences");
            return stored && JSON.parse(stored).mode === "dark"
                ? "dark"
                : "light";
        } catch (error) {
            ctx.log?.(
                "warn",
                "Recipient email theme unavailable; using light mode.",
                {
                    component: "notify-smtp",
                    operation: "resolveRecipientTheme",
                    errorName: error instanceof Error ? error.name : undefined,
                },
            );
            return "light";
        }
    });
    const { register, send } = await registerSmtpActions(ctx, sender);
    const purpose = await register("test", () => ({
        subject: "Cognis SMTP Test",
        body: "This is a test email from Cognis.",
    }));
    sender.test = async (to, config) => {
        const receipt = await send({
            purpose,
            recipientEmail: to,
            variables: {},
            config,
        });
        await sender.waitForEmail(purpose, receipt.notificationId);
    };
    ctx.registerRoute(async (req, res, url) => {
        if (
            url.pathname !== "/api/v1/gateways/notify/adapters/smtp/test" ||
            req.method !== "POST"
        )
            return false;
        if (!ctx.requireAuth(req, res, "admin")) return true;
        const body = await ctx.readJson(req);
        const config =
            body.config &&
            typeof body.config === "object" &&
            !Array.isArray(body.config)
                ? (body.config as Record<string, unknown>)
                : undefined;
        try {
            await ctx.capabilities.require<
                (
                    id: string,
                    recipient: string,
                    config?: Record<string, unknown>,
                ) => Promise<void>
            >("notify:testSender")(
                sender.senderId,
                String(body.to ?? "").trim(),
                config,
            );
        } catch (error) {
            ctx.log?.("error", "SMTP test email failed.", {
                component: "notify-smtp",
                operation: "sendTestEmail",
                errorName: error instanceof Error ? error.name : "UnknownError",
            });
            res.writeHead(400, { "content-type": "application/json" });
            res.end(
                JSON.stringify({
                    error: {
                        code: "smtp_test_failed",
                        message: "SMTP test email could not be sent.",
                    },
                }),
            );
            return true;
        }
        res.writeHead(200, { "content-type": "application/json" });
        res.end(JSON.stringify({ data: { sent: true } }));
        return true;
    }, "notify");
}
