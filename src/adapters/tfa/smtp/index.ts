import {
    MIN_VERIFICATION_CODE_LENGTH,
    MAX_VERIFICATION_CODE_LENGTH,
    generateNumericVerificationCode,
} from "../../../gateways/reuse/verification-codes.js";

import { requireBootstrapScope, type CapabilityContracts } from "@cognis/core";
import type { TfaAdapterBootstrapContext } from "../../../gateways/tfa/gateway.js";
import type {
    TfaMethodAdapter,
    TfaChallengeLifetime,
} from "../../../gateways/tfa/gateway.js";

const CODE_EXPIRY_MS = 15 * 60 * 1000;
const MAX_CODE_GENERATION_ATTEMPTS = 10;

import type {
    SmtpTfaAdapterContext,
    DeliveryReceipt,
    VerificationDelivery,
} from "./delivery.js";

interface CodeChallenge {
    code: string;
    expiresAt: number;
    controller: AbortController;
    receipt: DeliveryReceipt;
}

function challengeKey(
    scope: "setup" | "login",
    accountId: string,
    operationId: string,
): string {
    return JSON.stringify([scope, accountId, operationId]);
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
    private readonly pendingDeliveries = new Map<
        string,
        { controller: AbortController; promise: Promise<CodeChallenge> }
    >();

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
            for (const challenge of this.challenges.values())
                challenge.controller.abort();
            for (const pending of this.pendingDeliveries.values())
                pending.controller.abort();
            this.challenges.clear();
            this.pendingDeliveries.clear();
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
            this.context.deliverVerificationEmail = (
                recipientEmail,
                code,
                lifetime,
            ) =>
                ctx.capabilities
                    .require<CapabilityContracts>("system:contracts")
                    .resolve<
                        (input: {
                            purpose: string;
                            recipientEmail: string;
                            variables: Record<string, string>;
                            signal: AbortSignal;
                            expiresAt: number;
                        }) => Promise<VerificationDelivery>
                    >(
                        "notify:deliverEmail",
                        1,
                    )({
                    purpose,
                    recipientEmail,
                    variables: { code },
                    ...lifetime,
                });
            this.context.canSendVerificationEmail = () =>
                ctx.capabilities.get<() => boolean>(
                    "notify:emailAvailable",
                )?.() === true;
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
            typeof this.context.deliverVerificationEmail !== "function"
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
        if (
            Date.now() >= challenge.expiresAt ||
            challenge.controller.signal.aborted
        ) {
            challenge.controller.abort();
            this.challenges.delete(key);
            return null;
        }
        return challenge;
    }

    private cleanupExpiredChallenges(): void {
        const now = Date.now();
        for (const [key, challenge] of this.challenges.entries()) {
            if (now >= challenge.expiresAt) {
                challenge.controller.abort();
                this.challenges.delete(key);
            }
        }
    }

    private generateCode(key: string): string {
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
        return code;
    }

    private verifyCode(key: string, code: string): boolean {
        const challenge = this.getLiveChallenge(key);
        if (!challenge || challenge.code !== code) {
            return false;
        }
        this.challenges.delete(key);
        challenge.controller.abort();
        this.pendingDeliveries.get(key)?.controller.abort();
        return true;
    }

    private sendCode(
        scope: "setup" | "login",
        input: {
            accountId: string;
            email: string;
            lifetime: TfaChallengeLifetime;
        },
    ): Promise<CodeChallenge> {
        this.assertEmailCodeAvailable();
        const { lifetime } = input;
        if (
            !lifetime?.id ||
            !(lifetime.signal instanceof AbortSignal) ||
            lifetime.signal.aborted ||
            !Number.isFinite(lifetime.expiresAt) ||
            lifetime.expiresAt <= Date.now()
        )
            throw new Error("email_delivery_unavailable");
        const key = challengeKey(scope, input.accountId, lifetime.id);
        const pending = this.pendingDeliveries.get(key);
        if (pending) return pending.promise;
        const controller = new AbortController();
        const cancel = () => controller.abort();
        lifetime.signal.addEventListener("abort", cancel, { once: true });
        controller.signal.addEventListener(
            "abort",
            () => {
                lifetime.signal.removeEventListener("abort", cancel);
                if (this.challenges.get(key)?.controller === controller)
                    this.challenges.delete(key);
            },
            { once: true },
        );
        const log = this.context.log;
        const operation = {
            controller,
            promise: Promise.resolve().then(async () => {
                try {
                    const code = this.generateCode(key);
                    const expiresAt = Math.min(
                        lifetime.expiresAt,
                        Date.now() + CODE_EXPIRY_MS,
                    );
                    const delivery = await this.context
                        .deliverVerificationEmail!(input.email, code, {
                        signal: controller.signal,
                        expiresAt,
                    });
                    if (
                        !this.active ||
                        controller.signal.aborted ||
                        Date.now() >= expiresAt ||
                        delivery.receipt.status === "failed"
                    )
                        throw new Error("email_delivery_unavailable");
                    const challenge = {
                        code,
                        expiresAt,
                        controller,
                        receipt: delivery.receipt,
                    };
                    const previous = this.getLiveChallenge(key);
                    this.challenges.set(key, challenge);
                    previous?.controller.abort();
                    log?.("info", "SMTP TFA challenge delivery admitted.", {
                        component: "adapter-tfa-smtp",
                        operation: "admit_code_delivery",
                        accountId: input.accountId,
                        status: delivery.receipt.status,
                    });
                    const complete = (receipt: DeliveryReceipt) => {
                        challenge.receipt = receipt;
                        if (receipt.status !== "failed") return;
                        controller.abort();
                        if (this.challenges.get(key) === challenge)
                            this.challenges.delete(key);
                        log?.(
                            receipt.error === "smtp_delivery_cancelled" ||
                                receipt.error === "smtp_delivery_expired"
                                ? "info"
                                : "error",
                            "SMTP TFA challenge delivery did not complete.",
                            {
                                component: "adapter-tfa-smtp",
                                operation: "complete_code_delivery",
                                accountId: input.accountId,
                            },
                        );
                    };
                    void delivery.completion.then(complete, () =>
                        complete({
                            ...challenge.receipt,
                            status: "failed",
                            error: "delivery_completion_failed",
                        }),
                    );
                    return challenge;
                } catch (error) {
                    controller.abort();
                    throw error;
                } finally {
                    if (this.pendingDeliveries.get(key) === operation)
                        this.pendingDeliveries.delete(key);
                }
            }),
        };
        this.pendingDeliveries.set(key, operation);
        return operation.promise;
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
        lifetime: TfaChallengeLifetime;
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
        const challenge = await this.sendCode("setup", {
            lifetime: input.lifetime,
            accountId: input.accountId,
            email: primaryEmail,
        });
        if (challenge.controller.signal.aborted)
            throw new Error("email_delivery_unavailable");
        return {
            pendingPayload: {
                email: primaryEmail,
                operationId: input.lifetime.id,
                challengeId: challenge.receipt.notificationId,
            },
            view: {
                prompt:
                    challenge.receipt.status === "sent"
                        ? "adapter.tfa.smtp.setup_prompt"
                        : "adapter.tfa.smtp.setup_prompt_queued",
                fields: [
                    {
                        key: "code",
                        label: "ui.app.login.tfa.code_label",
                        type: "text",
                        inputMode: "numeric",
                        maxLength: challenge.code.length,
                    },
                ],
            },
        };
    }

    async cancelSetup(input: {
        accountId: string;
        pendingPayload: Record<string, unknown>;
    }): Promise<void> {
        const key = challengeKey(
            "setup",
            input.accountId,
            String(input.pendingPayload.operationId ?? ""),
        );
        const challenge = this.getLiveChallenge(key);
        if (
            challenge?.receipt.notificationId !==
            input.pendingPayload.challengeId
        )
            return;
        this.challenges.delete(key);
        challenge?.controller.abort();
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
        const key = challengeKey(
            "setup",
            input.accountId,
            String(input.pendingPayload.operationId ?? ""),
        );
        const challenge = this.getLiveChallenge(key);
        const verified =
            challenge?.receipt.notificationId ===
                input.pendingPayload.challengeId && this.verifyCode(key, code);
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
        lifetime: TfaChallengeLifetime;
    }): Promise<{
        ready: boolean;
        message?: string;
        retryAfterSeconds?: number;
        resendAvailableAt?: string;
        maxLength?: number;
        deliveryStatus?: "queued" | "sent";
    }> {
        const email = String(input.state.email ?? "").trim();
        if (!email) return { ready: false, message: "primary_email_required" };
        const log = this.context.log;
        try {
            const interval = this.deliveryIntervalMs;
            const challenge = await this.sendCode("login", {
                accountId: input.accountId,
                email,
                lifetime: input.lifetime,
            });
            if (challenge.controller.signal.aborted)
                throw new Error("email_delivery_unavailable");
            const receipt = challenge.receipt;
            const retry = this.extractRetryMetadata(receipt.availableAt);
            return {
                ready: true,
                maxLength: challenge.code.length,
                deliveryStatus: receipt.status === "sent" ? "sent" : "queued",
                ...(receipt.status === "waiting_rate_limit"
                    ? { message: "email_rate_limited" }
                    : {}),
                ...(retry.resendAvailableAt
                    ? retry
                    : this.buildCooldownMetadata(Date.now(), interval)),
            };
        } catch (error) {
            log?.("error", "Failed to admit SMTP TFA challenge delivery.", {
                component: "adapter-tfa-smtp",
                operation: "send_login_code",
                accountId: input.accountId,
                errorName: error instanceof Error ? error.name : "UnknownError",
            });
            return { ready: false, message: "email_delivery_unavailable" };
        }
    }

    verifyLogin(input: {
        lifetime: TfaChallengeLifetime;
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
        if (
            !input.lifetime ||
            input.lifetime.signal.aborted ||
            input.lifetime.expiresAt <= Date.now()
        ) {
            if (input.lifetime?.id)
                this.getLiveChallenge(
                    challengeKey("login", input.accountId, input.lifetime.id),
                );
            return Promise.resolve({
                verified: false,
                message: "invalid_verification_code",
            });
        }
        const verified = this.verifyCode(
            challengeKey("login", input.accountId, input.lifetime.id),
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
