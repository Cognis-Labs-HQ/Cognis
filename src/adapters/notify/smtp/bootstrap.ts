import { declareSmtpContracts } from "./contracts/declarations.js";
import {
    registerBootstrapFlow,
    requireBootstrapScope,
    type CapabilityContracts,
    type Ctx,
} from "@cognis/core";
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
    await registerSmtpActions(ctx, sender);
    const root = ctx.capabilities.require<Ctx>("system:ctx");
    const scope = requireBootstrapScope(root);
    const purpose = `${scope.owner}:test`;
    scope.registerDisposer(
        sender.registerPurpose(purpose, { diagnostic: true }),
    );
    const testFlow = registerBootstrapFlow(root, {
        id: "smtp:testEmail",
        stages: ["validate", "deliver"],
    });
    testFlow.extend("validate", { id: "smtp:validateTest" }, ({ input }) => {
        const { to } = input as { to: string };
        if (typeof to !== "string" || !to || /[\r\n]/.test(to))
            throw new Error("smtp_test_email_requires_recipient");
    });
    testFlow.extend(
        "deliver",
        { id: "smtp:deliverTest" },
        async ({ input }) => {
            const { to, config } = input as {
                to: string;
                config?: Record<string, unknown>;
            };
            await sender.sendTestEmail(purpose, to, config);
        },
    );
    sender.test = async (to, config) => {
        await root.flow.run("smtp:testEmail", { to, config });
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
                ...describeSmtpFailure(error),
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

function describeSmtpFailure(error: unknown): Record<string, unknown> {
    if (!(error instanceof Error)) return { reason: "smtp_test_failed" };
    const smtp = /^(smtp_[a-z_]+)(?::([0-9]{3}))?$/.exec(error.message);
    const code = Reflect.get(error, "code");
    return {
        reason: smtp?.[1] ?? "smtp_test_failed",
        ...(smtp?.[2] ? { responseCode: Number(smtp[2]) } : {}),
        ...(typeof code === "string" && /^[A-Z][A-Z0-9_]{1,63}$/.test(code)
            ? { code }
            : {}),
    };
}
