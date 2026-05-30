import { randomInt } from "node:crypto";
import { SMTP_VERIFICATION_RATE_LIMIT_MS } from "../../notify/smtp/rate-limit.js";
import type { TfaMethodAdapter } from "../../../gateways/tfa/gateway.js";

const DEFAULT_CODE_LENGTH = 6;
const MIN_CODE_LENGTH = 4;
const MAX_CODE_LENGTH = 10;
const CODE_EXPIRY_MS = 15 * 60 * 1000;
const NUMERIC_DIGITS = "0123456789";

interface SmtpTfaAdapterContext {
    canSendVerificationEmail?: () => boolean;
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

function clampCodeLength(input: unknown): number {
    if (typeof input !== "number" && typeof input !== "string") {
        return DEFAULT_CODE_LENGTH;
    }
    const parsed = Number.parseInt(String(input), 10);
    if (!Number.isFinite(parsed)) {
        return DEFAULT_CODE_LENGTH;
    }
    return Math.max(MIN_CODE_LENGTH, Math.min(MAX_CODE_LENGTH, parsed));
}

function challengeKey(scope: "setup" | "login", accountId: string): string {
    return `${scope}:${accountId}`;
}

function generateNumericCode(codeLength: number): string {
    return Array.from(
        { length: codeLength },
        () => NUMERIC_DIGITS[randomInt(0, NUMERIC_DIGITS.length)],
    ).join("");
}

class SmtpTfaAdapter implements TfaMethodAdapter {
    readonly id = "smtp";
    readonly name = "Email Code";

    private readonly challenges = new Map<string, CodeChallenge>();
    private readonly loginChallengeLastSentAt = new Map<string, number>();
    private codeLength = DEFAULT_CODE_LENGTH;

    constructor(private readonly context: SmtpTfaAdapterContext = {}) {}

    private assertEmailCodeAvailable(): void {
        if (typeof this.context.sendVerificationEmail !== "function") {
            throw new Error("smtp_capability_missing");
        }
        if (this.context.canSendVerificationEmail?.() !== true) {
            throw new Error("smtp_unavailable");
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
        const code = generateNumericCode(this.codeLength);
        this.challenges.set(key, {
            code,
            expiresAt: Date.now() + CODE_EXPIRY_MS,
        });
        return code;
    }

    private issueOrGetCode(key: string): string {
        this.cleanupExpiredChallenges();
        const liveChallenge = this.getLiveChallenge(key);
        if (liveChallenge) {
            return liveChallenge.code;
        }
        return this.issueCode(key);
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
    ): Promise<void> {
        this.assertEmailCodeAvailable();
        const key = challengeKey(scope, input.accountId);
        const code = this.issueCode(key);
        await this.context.sendVerificationEmail?.(input.email, code);
    }

    private resolveRetryMetadataFromAvailableAt(
        availableAt: string | undefined,
    ): {
        retryAfterSeconds?: number;
        resendAvailableAt?: string;
    } {
        const resendAvailableAt = String(availableAt ?? "").trim();
        if (!resendAvailableAt) {
            return {};
        }
        const resendTimestamp = Date.parse(resendAvailableAt);
        if (!Number.isFinite(resendTimestamp)) {
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
        await this.sendCode("setup", {
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
                        maxLength: this.codeLength,
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
                message: "invalid_smtp_code",
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
    }> {
        const email = String(input.state.email ?? "").trim();
        if (!email) {
            return { ready: false, message: "primary_email_required" };
        }
        if (typeof this.context.sendVerificationEmail !== "function") {
            return { ready: false, message: "smtp_capability_missing" };
        }
        if (this.context.canSendVerificationEmail?.() !== true) {
            return { ready: false, message: "smtp_unavailable" };
        }
        try {
            if (typeof this.context.queueVerificationEmail === "function") {
                const key = challengeKey("login", input.accountId);
                const code = this.issueOrGetCode(key);
                const queued = await this.context.queueVerificationEmail(
                    email,
                    code,
                );
                if (queued.status === "waiting_rate_limit") {
                    const retryMetadata =
                        this.resolveRetryMetadataFromAvailableAt(
                            queued.availableAt,
                        );
                    return {
                        ready: true,
                        message: "smtp_rate_limited",
                        retryAfterSeconds: retryMetadata.retryAfterSeconds,
                        resendAvailableAt: retryMetadata.resendAvailableAt,
                    };
                }
                return { ready: true };
            }
            await this.sendCode("login", {
                accountId: input.accountId,
                email,
            });
            this.loginChallengeLastSentAt.set(input.accountId, Date.now());
            return { ready: true };
        } catch (error) {
            const errorMessage =
                error instanceof Error ? error.message : String(error);
            if (errorMessage === "smtp_rate_limited") {
                const now = Date.now();
                const lastSentAt =
                    this.loginChallengeLastSentAt.get(input.accountId) ?? now;
                const retryMs = Math.max(
                    SMTP_VERIFICATION_RATE_LIMIT_MS - (now - lastSentAt),
                    0,
                );
                return {
                    ready: true,
                    message: "smtp_rate_limited",
                    retryAfterSeconds: Math.ceil(retryMs / 1000),
                    resendAvailableAt: new Date(now + retryMs).toISOString(),
                };
            }
            this.context.log?.(
                "error",
                "Failed to send SMTP TFA challenge code.",
                {
                    component: "adapter-tfa-smtp",
                    operation: "send_login_code",
                    accountId: input.accountId,
                    error: errorMessage,
                },
            );
            return { ready: false, message: "smtp_unavailable" };
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
                message: "invalid_smtp_code",
            });
        }
        return Promise.resolve({ verified: true });
    }

    async renderMethodDetails(input: {
        accountId: string;
        state: Record<string, unknown>;
        issuer: string;
    }): Promise<{ details: Record<string, string> } | null> {
        const email = String(input.state.email ?? "").trim();
        if (!email) {
            return null;
        }
        return { details: {} };
    }

    getConfigSchema() {
        return [
            {
                key: "codeLength",
                label: "Code Length",
                type: "number" as const,
                required: false,
            },
        ];
    }

    configure(config: Record<string, unknown>): void {
        this.codeLength = clampCodeLength(config.codeLength);
    }
}

export function createAdapter(
    context?: SmtpTfaAdapterContext,
): TfaMethodAdapter {
    return new SmtpTfaAdapter(context);
}
