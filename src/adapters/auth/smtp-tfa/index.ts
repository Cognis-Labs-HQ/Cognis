import { randomUUID } from "node:crypto";
import type {
    AuthConfigField,
    AuthProviderAdapter,
    AuthAdapterContext,
    AuthPendingSession,
    AuthEmailTfaState,
    AuthTfaMethodRegistration,
} from "../../../gateways/auth/gateway.js";
import {
    InMemoryTfaStore,
    TfaCodeService,
} from "../../../api/reuse/tfa-code.js";

export const SMTP_TFA_PREF_KEY = "auth-smtp-tfa";
const CHALLENGE_EXPIRY_MS = 10 * 60 * 1000;

interface EmailTfaPrefValue {
    enabled: boolean;
}

interface StoredChallenge {
    accountId: string;
    expiresAt: number;
    session: AuthPendingSession;
}

interface StoredSetupChallenge {
    accountId: string;
    expiresAt: number;
}

interface UserPreferenceStoreLike {
    get(accountId: string, key: string): Promise<string | null>;
    set(accountId: string, key: string, value: string): Promise<void>;
}

type NotifyDispatch = (envelope: {
    category: string;
    recipientUsername: string;
    subject: string;
    body: string;
    metadata?: Record<string, unknown>;
}) => Promise<{ dispatched: string[] }>;

/**
 * SMTP-backed TFA adapter that registers the `smtp-tfa` verification method,
 * manages login/setup challenge codes, and persists per-account enablement via
 * the preference store capability.
 */
export class SmtpTfaAuthAdapter implements AuthProviderAdapter {
    readonly id = "smtp-tfa";
    readonly name = "Email TFA";
    readonly supportsCredentialLogin = false;

    private enforceForAll = false;
    private readonly tfaService = new TfaCodeService(new InMemoryTfaStore());
    private readonly pendingChallenges = new Map<string, StoredChallenge>();
    private readonly pendingSetupChallenges = new Map<
        string,
        StoredSetupChallenge
    >();

    constructor(private readonly adapterContext?: AuthAdapterContext) {
        this.registerTfaMethod();
    }

    async authenticate(): Promise<null> {
        return null;
    }

    getConfigSchema(): AuthConfigField[] {
        return [
            {
                key: "enforceForAll",
                label: "Enforce Email TFA For All Users",
                type: "boolean",
                required: false,
            },
        ];
    }

    configure(config: Record<string, unknown>): void {
        this.enforceForAll = config.enforceForAll === true;
    }

    private getPreferenceStore(): UserPreferenceStoreLike | null {
        return (
            this.adapterContext?.capabilities.get<UserPreferenceStoreLike>(
                "preferences:store",
            ) ?? null
        );
    }

    private getDispatch(): NotifyDispatch | null {
        return (
            this.adapterContext?.capabilities.get<NotifyDispatch>(
                "notify:dispatch",
            ) ?? null
        );
    }

    private getCanSendVerificationEmail(): (() => boolean) | null {
        return (
            this.adapterContext?.capabilities.get<() => boolean>(
                "notify:canSendVerificationEmail",
            ) ?? null
        );
    }

    private getRegisterTfaMethod():
        | ((registration: AuthTfaMethodRegistration) => void)
        | null {
        return (
            this.adapterContext?.capabilities.get<
                (registration: AuthTfaMethodRegistration) => void
            >("auth:registerTfaMethod") ?? null
        );
    }

    private getHasVerifiedEmail():
        | ((accountId: string) => Promise<boolean>)
        | null {
        return (
            this.adapterContext?.capabilities.get<
                (accountId: string) => Promise<boolean>
            >("notify:hasVerifiedEmail") ?? null
        );
    }

    private async readPreference(
        accountId: string,
    ): Promise<EmailTfaPrefValue> {
        const prefStore = this.getPreferenceStore();
        if (!prefStore) return { enabled: false };
        const raw = await prefStore.get(accountId, SMTP_TFA_PREF_KEY);
        if (!raw) return { enabled: false };
        try {
            const parsed = JSON.parse(raw) as Partial<EmailTfaPrefValue>;
            return { enabled: parsed.enabled === true };
        } catch {
            return { enabled: false };
        }
    }

    private async writePreference(
        accountId: string,
        value: EmailTfaPrefValue,
    ): Promise<void> {
        const prefStore = this.getPreferenceStore();
        if (!prefStore) return;
        await prefStore.set(
            accountId,
            SMTP_TFA_PREF_KEY,
            JSON.stringify(value),
        );
    }

    private canDispatchEmailCodes(): boolean {
        const canSendVerificationEmail = this.getCanSendVerificationEmail();
        if (!canSendVerificationEmail) return false;
        return canSendVerificationEmail() === true;
    }

    private registerTfaMethod() {
        const registerTfaMethod = this.getRegisterTfaMethod();
        if (!registerTfaMethod) return;
        registerTfaMethod({
            id: this.id,
            name: this.name,
            settingsPath: "/api/v1/auth/smtp-tfa/settings",
            setupRequestPath: "/api/v1/auth/smtp-tfa/setup-request",
            setupVerifyPath: "/api/v1/auth/smtp-tfa/setup-verify",
            requiresVerifiedEmail: true,
            isAvailable: () => this.canDispatchEmailCodes(),
            isConfiguredForAccount: async (accountId: string) => {
                const preference = await this.readPreference(accountId);
                return preference.enabled === true;
            },
        });
    }

    private async hasVerifiedEmailAddress(accountId: string): Promise<boolean> {
        const hasVerifiedEmail = this.getHasVerifiedEmail();
        if (!hasVerifiedEmail) return false;
        return (await hasVerifiedEmail(accountId)) === true;
    }

    async shouldRequireEmailTfa(accountId: string): Promise<boolean> {
        const userPref = await this.readPreference(accountId);
        const requiresTfa = this.enforceForAll || userPref.enabled;
        if (!requiresTfa) return false;
        if (!this.canDispatchEmailCodes()) return false;
        return this.hasVerifiedEmailAddress(accountId);
    }

    async beginEmailTfaLoginChallenge(
        session: AuthPendingSession,
    ): Promise<{ challengeId: string }> {
        const dispatch = this.getDispatch();
        if (!dispatch || !this.canDispatchEmailCodes()) {
            throw new Error("smtp_unavailable");
        }
        const hasVerifiedEmail = await this.hasVerifiedEmailAddress(
            session.accountId,
        );
        if (!hasVerifiedEmail) {
            throw new Error("email_tfa_requires_verified_email");
        }

        const challengeId = randomUUID();
        const code = this.tfaService.issue(
            `login:${challengeId}`,
            CHALLENGE_EXPIRY_MS,
        );

        const sendResult = await dispatch({
            category: "system",
            recipientUsername: session.accountId,
            subject: "Your Cognis sign-in code",
            body: `Your Cognis email TFA code is: ${code}\n\nThis code expires in 10 minutes.`,
            metadata: {
                source: "auth-smtp-tfa",
            },
        });
        if (
            !Array.isArray(sendResult?.dispatched) ||
            sendResult.dispatched.length < 1
        ) {
            throw new Error("smtp_unavailable");
        }

        this.pendingChallenges.set(challengeId, {
            accountId: session.accountId,
            session,
            expiresAt: Date.now() + CHALLENGE_EXPIRY_MS,
        });

        return { challengeId };
    }

    async completeEmailTfaLoginChallenge(
        challengeId: string,
        code: string,
    ): Promise<AuthPendingSession | null> {
        const stored = this.pendingChallenges.get(challengeId);
        if (!stored) return null;
        if (Date.now() > stored.expiresAt) {
            this.pendingChallenges.delete(challengeId);
            return null;
        }
        const isValid = this.tfaService.verify(`login:${challengeId}`, code);
        if (!isValid) return null;
        this.pendingChallenges.delete(challengeId);
        return stored.session;
    }

    async getEmailTfaState(accountId: string): Promise<AuthEmailTfaState> {
        const pref = await this.readPreference(accountId);
        const available =
            this.canDispatchEmailCodes() &&
            (await this.hasVerifiedEmailAddress(accountId));
        return {
            enabled: pref.enabled,
            enforced: this.enforceForAll,
            available,
        };
    }

    async setEmailTfaEnabled(
        accountId: string,
        enabled: boolean,
    ): Promise<void> {
        await this.writePreference(accountId, { enabled });
    }

    async beginEmailTfaSetupChallenge(
        accountId: string,
    ): Promise<{ challengeId: string }> {
        const dispatch = this.getDispatch();
        if (!dispatch || !this.canDispatchEmailCodes()) {
            throw new Error("smtp_unavailable");
        }
        const hasVerifiedEmail = await this.hasVerifiedEmailAddress(accountId);
        if (!hasVerifiedEmail) {
            throw new Error("email_tfa_requires_verified_email");
        }
        const challengeId = randomUUID();
        const code = this.tfaService.issue(
            `setup:${challengeId}`,
            CHALLENGE_EXPIRY_MS,
        );
        const sendResult = await dispatch({
            category: "system",
            recipientUsername: accountId,
            subject: "Your Cognis TFA setup code",
            body: `Your Cognis setup verification code is: ${code}\n\nThis code expires in 10 minutes.`,
            metadata: {
                source: "auth-smtp-tfa",
                purpose: "setup",
            },
        });
        if (
            !Array.isArray(sendResult?.dispatched) ||
            sendResult.dispatched.length < 1
        ) {
            throw new Error("smtp_unavailable");
        }
        this.pendingSetupChallenges.set(challengeId, {
            accountId,
            expiresAt: Date.now() + CHALLENGE_EXPIRY_MS,
        });
        return { challengeId };
    }

    async completeEmailTfaSetupChallenge(
        accountId: string,
        challengeId: string,
        code: string,
    ): Promise<boolean> {
        const challenge = this.pendingSetupChallenges.get(challengeId);
        if (!challenge) return false;
        if (challenge.accountId !== accountId) return false;
        if (Date.now() > challenge.expiresAt) {
            this.pendingSetupChallenges.delete(challengeId);
            return false;
        }
        const valid = this.tfaService.verify(`setup:${challengeId}`, code);
        if (!valid) return false;
        this.pendingSetupChallenges.delete(challengeId);
        await this.writePreference(accountId, { enabled: true });
        return true;
    }

    async resetEmailTfa(accountId: string): Promise<void> {
        await this.writePreference(accountId, { enabled: false });
        for (const [challengeId, value] of this.pendingChallenges.entries()) {
            if (value.accountId !== accountId) continue;
            this.pendingChallenges.delete(challengeId);
        }
        for (const [
            challengeId,
            setupChallenge,
        ] of this.pendingSetupChallenges.entries()) {
            if (setupChallenge.accountId !== accountId) continue;
            this.pendingSetupChallenges.delete(challengeId);
        }
    }

    async onAccountRegistered(accountId: string): Promise<void> {
        if (!this.enforceForAll) return;
        await this.writePreference(accountId, { enabled: true });
    }
}

export function createAdapter(ctx?: AuthAdapterContext): AuthProviderAdapter {
    return new SmtpTfaAuthAdapter(ctx);
}
