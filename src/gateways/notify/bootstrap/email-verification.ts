import { emailVerificationKey } from "./email-verification-key.js";
import type { NotificationUserEmailStore } from "./stores.js";
import type { TfaCodeService } from "../../reuse/tfa-code.js";
import type { VerifyTokenService } from "../../../api/reuse/verify-token.js";
import type { GatewayBootstrapContext } from "../../shared.js";

export interface EmailVerificationDelivery {
    purpose: string;
    canSendVerificationEmail(): boolean;
    sendEmail(input: {
        purpose: string;
        recipientEmail: string;
        variables: Record<string, string>;
    }): Promise<unknown>;
}

export class EmailVerificationError extends Error {
    constructor(
        readonly status: 400 | 409 | 422 | 429 | 503,
        readonly code: string,
        message: string,
    ) {
        super(message);
    }
}

export function createEmailVerification(
    store: NotificationUserEmailStore,
    codes: TfaCodeService,
    links: VerifyTokenService,
    delivery: EmailVerificationDelivery,
    externalHost?: string,
    codeLength?: () => number | undefined,
    log?: GatewayBootstrapContext["log"],
) {
    return {
        async add(
            accountId: string,
            address: string,
            assertCurrent: () => Promise<void> = async () => {},
        ) {
            const email = address.trim().toLowerCase();
            if (!email)
                throw new EmailVerificationError(
                    400,
                    "bad_request",
                    "email is required",
                );
            const emails = await store.getUserEmails(accountId);
            if (emails.some((entry) => entry.email === email && entry.verified))
                throw new EmailVerificationError(
                    409,
                    "already_verified",
                    "This email address is already verified.",
                );
            if (await store.isEmailRegisteredByOtherUser(email, accountId))
                throw new EmailVerificationError(
                    409,
                    "email_taken",
                    "This email address is already registered by another user.",
                );
            if (!delivery.canSendVerificationEmail())
                throw new EmailVerificationError(
                    503,
                    "email_delivery_unavailable",
                    "Email verification is not available. Contact your administrator.",
                );
            await assertCurrent();
            await store.addUserEmail(accountId, email);
            await assertCurrent();
            const key = emailVerificationKey(accountId, email);
            const code = codes.issueOrGet(key, 15 * 60 * 1000, codeLength?.());
            const watchToken = links.issueOrGet(key);
            const verifyUrl = externalHost
                ? `${externalHost}/verify-email?token=${watchToken}`
                : "";
            let verificationEmailFailed = false;
            try {
                await delivery.sendEmail({
                    purpose: delivery.purpose,
                    recipientEmail: email,
                    variables: { code, verifyUrl },
                });
            } catch (error) {
                log?.("error", "Verification email delivery failed.", {
                    component: "notify-gateway",
                    operation: "sendVerificationEmail",
                    accountId,
                    errorName:
                        error instanceof Error ? error.name : "UnknownError",
                });
                if (
                    error instanceof Error &&
                    error.message === "email_rate_limited"
                )
                    throw new EmailVerificationError(
                        429,
                        "rate_limited",
                        "Verification email sent too recently. Please wait before requesting another.",
                    );
                verificationEmailFailed = true;
            }
            await assertCurrent();
            log?.("info", "Email verification requested.", {
                component: "notify-gateway",
                operation: "addVerificationEmail",
                accountId,
                verificationEmailFailed,
            });
            return verificationEmailFailed
                ? {
                      added: true,
                      pendingVerification: true,
                      verificationEmailFailed: true,
                  }
                : { added: true, pendingVerification: true, watchToken };
        },
        async verify(
            accountId: string,
            address: string,
            code: string,
            assertCurrent: () => Promise<void> = async () => {},
        ) {
            const email = address.trim().toLowerCase();
            await assertCurrent();
            if (
                !codes.verify(
                    emailVerificationKey(accountId, email),
                    code.trim(),
                )
            )
                throw new EmailVerificationError(
                    422,
                    "invalid_code",
                    "Invalid or expired verification code",
                );
            await assertCurrent();
            await store.verifyUserEmail(accountId, email);
            await assertCurrent();
            log?.("info", "Email address verified.", {
                component: "notify-gateway",
                operation: "verifyEmail",
                accountId,
            });
            return { verified: true };
        },
    };
}

export type EmailVerification = ReturnType<typeof createEmailVerification>;
