import {
    MIN_VERIFICATION_CODE_LENGTH,
    MAX_VERIFICATION_CODE_LENGTH,
    generateNumericVerificationCode,
} from "../../../gateways/reuse/verification-codes.js";

import { requireBootstrapScope } from "@cognis/core";
import type { TfaAdapterBootstrapContext } from "../../../gateways/tfa/gateway.js";
import type { TfaMethodAdapter } from "../../../gateways/tfa/gateway.js";

const CODE_EXPIRY_MS = 15 * 60 * 1000;
const MAX_CODE_GENERATION_ATTEMPTS = 10;

interface SmtpTfaAdapterContext {
    canSendVerificationEmail?: () => boolean;
    getEmailDeliveryPolicy?: () => {
        minimumIntervalMs: number;
        codeLength: number;
    };
    sendVerificationEmail?: (
        to: string,
        code: string,
        verifyUrl?: string,
        theme?: string,
    ) => Promise<void>;
    queueVerificationEmail?: (
        to: string,
        code: string,
        verifyUrl?: string,
        theme?: string,
    ) => Promise<{
        notificationId: string;
        status: "queued" | "waiting_rate_limit" | "sending" | "sent" | "failed";
        createdAt: string;
        updatedAt: string;
        availableAt?: string;
        error?: string;
        recipientEmail?: string;
    }>;
    getPrimaryEmail?: (accountId: string) => Promise<string | null>;
    log?: (
        level: string,
        message: string,
        metadata?: Record<string, unknown>,
    ) => void;
}

interface CodeChallenge {
    code: string;
    expiresAt: number;
}

function challengeKey(scope: "setup" | "login", accountId: string): string {
    return `${scope}:${accountId}`;
}

class SmtpTfaAdapter implements TfaMethodAdapter {
    readonly id = "smtp";
    readonly stringsBaseUrl = "/static/adapters/tfa/smtp/languages";
    readonly loginUi = {
        placeholderKey: "ui.app.login.tfa.code_placeholder_smtp",
        supportsResend: true,
        challengeOnSelect: true,
    };
    readonly name = "Email Code";

    private active = true;
    private readonly challenges = new Map<string, CodeChallenge>();
    private readonly loginChallengeLastSentAt = new Map<string, number>();

    private readDeliveryPolicy() {
        const policy = this.context.getEmailDeliveryPolicy?.();
        if (
            !policy ||
            !Number.isInteger(policy.codeLength) ||
            policy.codeLength < MIN_VERIFICATION_CODE_LENGTH ||
            policy.codeLength > MAX_VERIFICATION_CODE_LENGTH ||
            !Number.isFinite(policy.minimumIntervalMs) ||
            policy.minimumIntervalMs < 0
        ) {
            throw new Error("email_delivery_unavailable");
        }
        return policy;
    }

    private get deliveryIntervalMs() {
        return this.readDeliveryPolicy().minimumIntervalMs;
    }

    constructor(private readonly context: SmtpTfaAdapterContext = {}) {}

    async bootstrap(ctx: TfaAdapterBootstrapContext): Promise<void> {
        this.context.getEmailDeliveryPolicy = () =>
            ctx.capabilities.require<
                () => { minimumIntervalMs: number; codeLength: number }
            >("notify:emailDeliveryPolicy")();
        this.active = ctx.isEnabled();
        const clearChallenges = () => {
            this.active = false;
            this.challenges.clear();
            this.loginChallengeLastSentAt.clear();
        };
        requireBootstrapScope().registerDisposer(
            Object.assign(clearChallenges, {
                reactivate: () => {
                    this.active = ctx.isEnabled();
                },
            }),
        );
        ctx.onEnabledChange("tfa:smtpChallenges", async (enabled) => {
            if (!enabled) clearChallenges();
            else this.active = true;
        });
        const register = ctx.capabilities.get<
            (
                id: string,
                action: (variables: Record<string, string>) => {
                    subject: string;
                    body: string;
                },
            ) => Promise<string>
        >("notify:registerEmailPurpose");
        if (register) {
            const purpose = await register("loginCode", (variables) => ({
                subject: "Your Cognis verification code",
                body: `Your verification code is ${variables.code}.`,
            }));
            const send = async (
                to: string,
                code: string,
                _verifyUrl?: string,
                _theme?: string,
            ) =>
                ctx.capabilities.require<
                    (input: {
                        purpose: string;
                        recipientEmail: string;
                        variables: Record<string, string>;
                    }) => ReturnType<
                        NonNullable<
                            SmtpTfaAdapterContext["queueVerificationEmail"]
                        >
                    >
                >("notify:sendEmail")({
                    purpose,
                    recipientEmail: to,
                    variables: { code },
                });
            this.context.canSendVerificationEmail = () =>
                ctx.capabilities.get<() => boolean>(
                    "notify:emailAvailable",
                )?.() === true;
            this.context.sendVerificationEmail = async (...args) => {
                await send(...args);
            };
            this.context.queueVerificationEmail = send;
        }
        this.context.getPrimaryEmail = ctx.capabilities.get<
            (accountId: string) => Promise<string | null>
        >("notify:getPrimaryEmail");
        ctx.registerSyncTarget({ gatewayId: "notify", adapterId: "smtp" });
        const setEnabled = ctx.capabilities.get<
            (id: string, enabled: boolean) => Promise<void>
        >("notify:setSenderEnabled");
        if (setEnabled) {
            ctx.onEnabledChange("tfa:smtpSync", async (enabled) => {
                if (enabled) await setEnabled("smtp", true);
            });
            if (ctx.isEnabled()) await setEnabled("smtp", true);
        }
    }

    private assertEmailCodeAvailable(): void {
        if (
            !this.active ||
            typeof this.context.sendVerificationEmail !== "function"
        ) {
            throw new Error("email_delivery_unavailable");
        }
        if (this.context.canSendVerificationEmail?.() !== true) {
            throw new Error("email_delivery_unavailable");
        }
    }

    private getLiveChallenge(key: string): CodeChallenge | null {
        const challenge = this.challenges.get(key);
        if (!challenge) {
            return null;
        }
        if (Date.now() > challenge.expiresAt) {
            this.challenges.delete(key);
            return null;
        }
        return challenge;
    }

    private cleanupExpiredChallenges(): void {
        const now = Date.now();
        for (const [key, challenge] of this.challenges.entries()) {
            if (now > challenge.expiresAt) {
                this.challenges.delete(key);
            }
        }
    }

    private issueCode(key: string): string {
        this.cleanupExpiredChallenges();
        const existingCode = this.getLiveChallenge(key)?.code;
        const codeLength = this.readDeliveryPolicy().codeLength;
        let code = generateNumericVerificationCode(codeLength);
        let generationAttempts = 1;
        while (existingCode && code === existingCode) {
            if (generationAttempts >= MAX_CODE_GENERATION_ATTEMPTS) {
                throw new Error("smtp_code_generation_failed");
            }
            code = generateNumericVerificationCode(codeLength);
            generationAttempts += 1;
        }
        this.challenges.set(key, {
            code,
            expiresAt: Date.now() + CODE_EXPIRY_MS,
        });
        return code;
    }

    private rollbackChallenge(
        key: string,
        challenge: CodeChallenge | null,
    ): void {
        if (challenge) {
            this.challenges.set(key, challenge);
            return;
        }
        this.challenges.delete(key);
    }

    private verifyCode(key: string, code: string): boolean {
        const challenge = this.getLiveChallenge(key);
        if (!challenge || challenge.code !== code) {
            return false;
        }
        this.challenges.delete(key);
        return true;
    }

    private async sendCode(
        scope: "setup" | "login",
        input: {
            accountId: string;
            email: string;
        },
    ): Promise<string> {
        this.assertEmailCodeAvailable();
        const key = challengeKey(scope, input.accountId);
        const previousChallenge = this.getLiveChallenge(key);
        const code = this.issueCode(key);
        try {
            await this.context.sendVerificationEmail?.(input.email, code);
        } catch (error) {
            if (this.getLiveChallenge(key)?.code === code) {
                this.rollbackChallenge(key, previousChallenge);
            }
            throw error;
        }
        if (!this.active || this.getLiveChallenge(key)?.code !== code) {
            throw new Error("email_delivery_unavailable");
        }
        return code;
    }

    private extractRetryMetadata(availableAt: string | undefined): {
        retryAfterSeconds?: number;
        resendAvailableAt?: string;
    } {
        const log = this.context.log;
        if (typeof availableAt !== "string") {
            return {};
        }
        const resendAvailableAt = availableAt.trim();
        if (!resendAvailableAt) {
            return {};
        }
        const resendTimestamp = Date.parse(resendAvailableAt);
        if (!Number.isFinite(resendTimestamp)) {
            log?.("warn", "Ignored invalid SMTP retry timestamp metadata.", {
                component: "adapter-tfa-smtp",
                operation: "parse_retry_metadata",
                availableAt: resendAvailableAt,
            });
            return {};
        }
        return {
            retryAfterSeconds: Math.max(
                Math.ceil((resendTimestamp - Date.now()) / 1000),
                0,
            ),
            resendAvailableAt,
        };
    }

    private buildCooldownMetadata(
        sentAtMs: number,
        intervalMs: number,
    ): {
        retryAfterSeconds: number;
        resendAvailableAt: string;
    } {
        return {
            retryAfterSeconds: Math.ceil(intervalMs / 1000),
            resendAvailableAt: new Date(sentAtMs + intervalMs).toISOString(),
        };
    }

    async beginSetup(input: {
        accountId: string;
        displayName: string;
        issuer: string;
    }): Promise<{
        pendingPayload: Record<string, unknown>;
        view: {
            prompt: string;
            fields: Array<{
                key: string;
                label: string;
                type: "text" | "number" | "password";
                inputMode: "numeric" | "text";
                maxLength: number;
            }>;
        };
    }> {
        this.assertEmailCodeAvailable();
        const primaryEmail = await this.context.getPrimaryEmail?.(
            input.accountId,
        );
        if (!primaryEmail) {
            throw new Error("primary_email_required");
        }
        const code = await this.sendCode("setup", {
            accountId: input.accountId,
            email: primaryEmail,
        });
        return {
            pendingPayload: {
                email: primaryEmail,
            },
            view: {
                prompt: "adapter.tfa.smtp.setup_prompt",
                fields: [
                    {
                        key: "code",
                        label: "ui.app.login.tfa.code_label",
                        type: "text",
                        inputMode: "numeric",
                        maxLength: code.length,
                    },
                ],
            },
        };
    }

    verifySetup(input: {
        accountId: string;
        pendingPayload: Record<string, unknown>;
        verification: Record<string, unknown>;
    }): Promise<{
        verified: boolean;
        state?: Record<string, unknown>;
        message?: string;
    }> {
        const code = String(input.verification.code ?? "").trim();
        const email = String(input.pendingPayload.email ?? "").trim();
        if (!code) {
            return Promise.resolve({
                verified: false,
                message: "code_required",
            });
        }
        if (!email) {
            return Promise.resolve({
                verified: false,
                message: "primary_email_required",
            });
        }
        const verified = this.verifyCode(
            challengeKey("setup", input.accountId),
            code,
        );
        if (!verified) {
            return Promise.resolve({
                verified: false,
                message: "invalid_verification_code",
            });
        }
        return Promise.resolve({
            verified: true,
            state: {
                email,
            },
        });
    }

    async beginLoginChallenge(input: {
        accountId: string;
        state: Record<string, unknown>;
    }): Promise<{
        ready: boolean;
        message?: string;
        retryAfterSeconds?: number;
        resendAvailableAt?: string;
        maxLength?: number;
    }> {
        const email = String(input.state.email ?? "").trim();
        if (!email) {
            return { ready: false, message: "primary_email_required" };
        }
        if (
            typeof this.context.sendVerificationEmail !== "function" &&
            typeof this.context.queueVerificationEmail !== "function"
        ) {
            return { ready: false, message: "email_delivery_unavailable" };
        }
        if (
            !this.active ||
            this.context.canSendVerificationEmail?.() !== true
        ) {
            return { ready: false, message: "email_delivery_unavailable" };
        }
        const log = this.context.log;
        try {
            const cooldownIntervalMs = this.deliveryIntervalMs;
            if (typeof this.context.queueVerificationEmail === "function") {
                const challengeSentAt = Date.now();
                const key = challengeKey("login", input.accountId);
                const previousChallenge = this.getLiveChallenge(key);
                const code = this.issueCode(key);
                let queued;
                try {
                    queued = await this.context.queueVerificationEmail(
                        email,
                        code,
                    );
                } catch (error) {
                    if (this.getLiveChallenge(key)?.code === code) {
                        this.rollbackChallenge(key, previousChallenge);
                    }
                    throw error;
                }
                if (!this.active || this.getLiveChallenge(key)?.code !== code) {
                    throw new Error("email_delivery_unavailable");
                }
                if (
                    queued.status === "waiting_rate_limit" ||
                    queued.status === "failed"
                ) {
                    this.rollbackChallenge(key, previousChallenge);
                }
                if (queued.status === "waiting_rate_limit") {
                    const retryMetadata = this.extractRetryMetadata(
                        queued.availableAt,
                    );
                    return {
                        ready: true,
                        message: "email_rate_limited",
                        maxLength: previousChallenge?.code.length,
                        retryAfterSeconds: retryMetadata.retryAfterSeconds,
                        resendAvailableAt: retryMetadata.resendAvailableAt,
                    };
                }
                if (queued.status === "failed") {
                    log?.("error", "Failed to queue SMTP TFA challenge code.", {
                        component: "adapter-tfa-smtp",
                        operation: "queue_login_code",
                        accountId: input.accountId,
                        error: queued.error ?? "queue_delivery_failed",
                    });
                    return {
                        ready: false,
                        message: "email_delivery_unavailable",
                    };
                }
                this.loginChallengeLastSentAt.set(
                    input.accountId,
                    challengeSentAt,
                );
                return {
                    ready: true,
                    maxLength: code.length,
                    ...this.buildCooldownMetadata(
                        challengeSentAt,
                        cooldownIntervalMs,
                    ),
                };
            }
            const challengeSentAt = Date.now();
            const code = await this.sendCode("login", {
                accountId: input.accountId,
                email,
            });
            this.loginChallengeLastSentAt.set(input.accountId, challengeSentAt);
            return {
                ready: true,
                maxLength: code.length,
                ...this.buildCooldownMetadata(
                    challengeSentAt,
                    cooldownIntervalMs,
                ),
            };
        } catch (error) {
            const errorMessage =
                error instanceof Error ? error.message : String(error);
            if (errorMessage === "email_rate_limited") {
                const now = Date.now();
                const lastSentAt =
                    this.loginChallengeLastSentAt.get(input.accountId) ?? now;
                const retryMs = Math.max(
                    this.deliveryIntervalMs - (now - lastSentAt),
                    0,
                );
                return {
                    ready: true,
                    message: "email_rate_limited",
                    maxLength: this.getLiveChallenge(
                        challengeKey("login", input.accountId),
                    )?.code.length,
                    retryAfterSeconds: Math.ceil(retryMs / 1000),
                    resendAvailableAt: new Date(now + retryMs).toISOString(),
                };
            }
            log?.("error", "Failed to send SMTP TFA challenge code.", {
                component: "adapter-tfa-smtp",
                operation: "send_login_code",
                accountId: input.accountId,
                error: errorMessage,
            });
            return { ready: false, message: "email_delivery_unavailable" };
        }
    }

    verifyLogin(input: {
        accountId: string;
        state: Record<string, unknown>;
        payload: Record<string, unknown>;
    }): Promise<{ verified: boolean; message?: string }> {
        const code = String(input.payload.code ?? "").trim();
        if (!code) {
            return Promise.resolve({
                verified: false,
                message: "code_required",
            });
        }
        const verified = this.verifyCode(
            challengeKey("login", input.accountId),
            code,
        );
        if (!verified) {
            return Promise.resolve({
                verified: false,
                message: "invalid_verification_code",
            });
        }
        return Promise.resolve({ verified: true });
    }

    async renderMethodDetails(input: {
        accountId: string;
        state: Record<string, unknown>;
        issuer: string;
    }): Promise<{ details: Record<string, string> } | null> {
        return { details: {} };
    }

    getConfigSchema() {
        return [];
    }
}

export function createAdapter(
    context?: SmtpTfaAdapterContext,
): TfaMethodAdapter {
    return new SmtpTfaAdapter(context);
}
