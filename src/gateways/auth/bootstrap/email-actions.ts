import type { GatewayBootstrapContext } from "../../shared.js";
import type { RegisterNotificationAction, SendEmailAction } from "@cognis/core";

/** Auth owns login-link content; completion waits for optional notification providers. */
export async function completeBootstrap(
    ctx: GatewayBootstrapContext,
): Promise<void> {
    const register = ctx.capabilities.get<RegisterNotificationAction>(
        "notify:registerEmailPurpose",
    );
    if (!register) return;
    const purpose = await register("loginLink", (variables) => ({
        subject: variables.subject,
        body: variables.body,
        actionUrl: variables.loginUrl,
        actionLabel: variables.actionLabel || undefined,
    }));
    ctx.capabilities.contribute(
        "auth:sendLoginLinkEmail",
        async (
            to: string,
            loginUrl: string,
            options?: {
                theme?: string;
                subject?: string;
                body?: string;
                actionLabel?: string;
            },
        ) => {
            await ctx.capabilities.require<SendEmailAction>("notify:sendEmail")(
                {
                    purpose,
                    recipientEmail: to,
                    variables: {
                        loginUrl,
                        subject: options?.subject ?? "",
                        body: options?.body ?? "",
                        actionLabel: options?.actionLabel ?? "",
                    },
                    theme: options?.theme,
                },
            );
        },
    );
    ctx.capabilities.get<(id: string, label: string) => void>(
        "notify:registerCategory",
    )?.("security", "Security");
}
