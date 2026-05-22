import { randomUUID } from "node:crypto";
import type {
    AuthConfigField,
    AuthProviderAdapter,
    AuthAdapterContext,
    AuthPendingSession,
    AuthEmailTfaState,
} from "../../../gateways/auth/gateway.js";
import { InMemoryTfaStore, TfaCodeService } from "../../../api/reuse/tfa-code.js";

const EMAIL_TFA_PREF_KEY = "auth-email-tfa";
const CHALLENGE_EXPIRY_MS = 10 * 60 * 1000;

interface EmailTfaPrefValue {
    enabled: boolean;
}

interface StoredChallenge {
    accountId: string;
    expiresAt: number;
    session: AuthPendingSession;
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

export class EmailTfaAuthAdapter implements AuthProviderAdapter {
    readonly id = "email-tfa";
    readonly name = "Email TFA";
    readonly supportsCredentialLogin = false;

    private enforceForAll = false;
    private readonly tfaService = new TfaCodeService(new InMemoryTfaStore());
    private readonly pendingChallenges = new Map<string, StoredChallenge>();

    constructor(private readonly adapterContext?: AuthAdapterContext) {}

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

    private getHasVerifiedEmail(): ((accountId: string) => Promise<boolean>) | null {
        return (
            this.adapterContext?.capabilities.get<
                (accountId: string) => Promise<boolean>
            >("notify:hasVerifiedEmail") ?? null
        );
    }

    private async readPreference(accountId: string): Promise<EmailTfaPrefValue> {
        const prefStore = this.getPreferenceStore();
        if (!prefStore) return { enabled: false };
        const raw = await prefStore.get(accountId, EMAIL_TFA_PREF_KEY);
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
        await prefStore.set(accountId, EMAIL_TFA_PREF_KEY, JSON.stringify(value));
    }

    private canDispatchEmailCodes(): boolean {
        const canSendVerificationEmail = this.getCanSendVerificationEmail();
        if (!canSendVerificationEmail) return false;
        return canSendVerificationEmail() === true;
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
        const code = this.tfaService.issue(`login:${challengeId}`, CHALLENGE_EXPIRY_MS);

        const sendResult = await dispatch({
            category: "system",
            recipientUsername: session.accountId,
            subject: "Your Cognis sign-in code",
            body: `Your Cognis email TFA code is: ${code}\n\nThis code expires in 10 minutes.`,
            metadata: {
                source: "auth-email-tfa",
            },
        });
        if (!Array.isArray(sendResult?.dispatched) || sendResult.dispatched.length < 1) {
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

    async setEmailTfaEnabled(accountId: string, enabled: boolean): Promise<void> {
        await this.writePreference(accountId, { enabled });
    }

    async resetEmailTfa(accountId: string): Promise<void> {
        await this.writePreference(accountId, { enabled: false });
        for (const [challengeId, value] of this.pendingChallenges.entries()) {
            if (value.accountId !== accountId) continue;
            this.pendingChallenges.delete(challengeId);
        }
    }

    async onAccountRegistered(accountId: string): Promise<void> {
        if (!this.enforceForAll) return;
        await this.writePreference(accountId, { enabled: true });
    }
}

export function createAdapter(ctx?: AuthAdapterContext): AuthProviderAdapter {
    return new EmailTfaAuthAdapter(ctx);
}
