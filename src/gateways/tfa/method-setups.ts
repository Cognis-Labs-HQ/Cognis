import { randomBytes } from "node:crypto";
import type { BootstrapLog } from "../shared.js";
import type { DbTfaStore } from "./reuse/tfa-store.js";
import type {
    TfaChallengeLifetime,
    TfaMethodAdapter,
    TfaMethodSetupView,
} from "./contracts/method.js";
import {
    ChallengeLifetimes,
    assertLiveChallenge,
} from "./challenge-lifetimes.js";

type SetupEntry = {
    accountId: string;
    methodId: string;
    lifetime: TfaChallengeLifetime;
    adapter: TfaMethodAdapter;
    payload?: Record<string, unknown>;
    cleanup?: Promise<void>;
    commit?: Promise<void>;
};

export class MethodSetups {
    private readonly entries = new Map<string, SetupEntry>();
    private readonly verifying = new Set<string>();
    private readonly lifetimes = new ChallengeLifetimes();

    constructor(
        private readonly store: Pick<DbTfaStore, keyof DbTfaStore>,
        private readonly getAdapter: (
            methodId: string,
        ) => TfaMethodAdapter | null,
        private readonly log?: BootstrapLog,
    ) {}

    private cleanup(entry: SetupEntry): Promise<void> {
        if (entry.cleanup) return entry.cleanup;
        if (!entry.payload) return Promise.resolve();
        const payload = entry.payload;
        entry.cleanup = (async () => {
            try {
                if (entry.commit) await entry.commit;
            } catch (error) {
                // The verifier owns the write result. Terminal cleanup waits for settlement.
                this.log?.(
                    "error",
                    "Enrollment write failed before terminal cleanup.",
                    {
                        component: "tfa-gateway",
                        operation: "settle_setup_commit",
                        accountId: entry.accountId,
                        errorName:
                            error instanceof Error
                                ? error.name
                                : "UnknownError",
                    },
                );
            } finally {
                try {
                    await entry.adapter.cancelSetup?.({
                        accountId: entry.accountId,
                        pendingPayload: payload,
                    });
                } finally {
                    try {
                        await this.store.deletePendingSetup(entry.lifetime.id);
                    } finally {
                        if (this.entries.get(entry.lifetime.id) === entry)
                            this.entries.delete(entry.lifetime.id);
                    }
                }
            }
        })();
        return entry.cleanup;
    }

    async begin(input: {
        accountId: string;
        displayName: string;
        methodId: string;
    }): Promise<{
        setupId: string;
        methodId: string;
        methodName: string;
        view: TfaMethodSetupView;
    }> {
        const adapter = this.getAdapter(input.methodId);
        if (!adapter) throw new Error("tfa_method_unavailable");
        const setupId = `tfa_setup_${randomBytes(18).toString("base64url")}`;
        const lifetime = this.lifetimes.acquire(
            input.accountId,
            input.methodId,
            {
                id: setupId,
                expiresAt: Date.now() + 10 * 60 * 1000,
                signal: new AbortController().signal,
            },
        );
        const entry: SetupEntry = {
            accountId: input.accountId,
            methodId: input.methodId,
            adapter,
            lifetime,
        };
        this.entries.set(setupId, entry);
        lifetime.signal.addEventListener(
            "abort",
            () => {
                void this.cleanup(entry).catch((error: unknown) => {
                    const log = this.log;
                    log?.("error", "Failed to clean up cancelled TFA setup.", {
                        component: "tfa-gateway",
                        operation: "cancel_setup",
                        accountId: input.accountId,
                        errorName:
                            error instanceof Error
                                ? error.name
                                : "UnknownError",
                    });
                });
            },
            { once: true },
        );
        try {
            await this.store.pruneExpiredPendingSetups();
            assertLiveChallenge(lifetime);
            const started = await adapter.beginSetup({
                ...input,
                issuer: "Cognis",
                lifetime,
            });
            entry.payload = started.pendingPayload;
            assertLiveChallenge(lifetime);
            await this.store.savePendingSetup({
                setupId,
                accountId: input.accountId,
                methodId: input.methodId,
                payload: started.pendingPayload,
                expiresAt: new Date(lifetime.expiresAt).toISOString(),
            });
            assertLiveChallenge(lifetime);
            return {
                setupId,
                methodId: adapter.id,
                methodName: adapter.name,
                view: started.view,
            };
        } catch (error) {
            this.lifetimes.cancelMatching(
                input.accountId,
                input.methodId,
                setupId,
            );
            await this.cleanup(entry);
            // A cancellation can race a store write already in progress.
            await this.store.deletePendingSetup(setupId);
            throw error;
        } finally {
            if (
                lifetime.signal.aborted &&
                !entry.payload &&
                this.entries.get(setupId) === entry
            )
                this.entries.delete(setupId);
        }
    }

    async verify(input: {
        accountId: string;
        setupId: string;
        verification: Record<string, unknown>;
    }): Promise<{ verified: boolean; message?: string }> {
        if (this.verifying.has(input.setupId))
            return { verified: false, message: "setup_verification_pending" };
        this.verifying.add(input.setupId);
        try {
            const pending = await this.store.getPendingSetup(input.setupId);
            if (!pending || pending.accountId !== input.accountId)
                return { verified: false, message: "setup_not_found" };
            const entry = this.entries.get(input.setupId);
            const expiresAt = Date.parse(pending.expiresAt);
            if (
                !entry ||
                !Number.isFinite(expiresAt) ||
                expiresAt <= Date.now() ||
                entry.lifetime.signal.aborted
            ) {
                await this.cancel(input.accountId, input.setupId);
                return { verified: false, message: "setup_expired" };
            }
            const adapter = this.getAdapter(pending.methodId);
            if (!adapter) {
                await this.cancel(input.accountId, input.setupId);
                return { verified: false, message: "tfa_method_unavailable" };
            }
            const result = await adapter.verifySetup({
                accountId: input.accountId,
                pendingPayload: pending.payload,
                verification: input.verification,
            });
            if (!result.verified || !result.state)
                return {
                    verified: false,
                    message: result.message || "verification_failed",
                };
            const sortOrder = await this.store.getNextSortOrder(
                input.accountId,
            );
            if (
                entry.lifetime.signal.aborted ||
                entry.lifetime.expiresAt <= Date.now() ||
                this.entries.get(input.setupId) !== entry
            )
                return { verified: false, message: "setup_expired" };
            // After this commit point, cancellation waits for the accepted verification.
            entry.commit = this.store.upsertUserMethod({
                accountId: input.accountId,
                methodId: pending.methodId,
                enabled: true,
                sortOrder,
                state: result.state,
                configuredAt: new Date().toISOString(),
            });
            await entry.commit;
            await this.cancel(input.accountId, input.setupId);
            return { verified: true };
        } finally {
            this.verifying.delete(input.setupId);
        }
    }

    async cancel(accountId: string, setupId: string): Promise<void> {
        const entry = this.entries.get(setupId);
        if (entry && entry.accountId === accountId) {
            this.lifetimes.cancelMatching(accountId, undefined, setupId);
            await this.cleanup(entry);
            return;
        }
        const pending = await this.store.getPendingSetup(setupId);
        if (!pending || pending.accountId !== accountId) return;
        try {
            await this.getAdapter(pending.methodId)?.cancelSetup?.({
                accountId,
                pendingPayload: pending.payload,
            });
        } finally {
            await this.store.deletePendingSetup(setupId);
        }
    }

    block(accountId?: string, methodId?: string): () => void {
        return this.lifetimes.block(accountId, methodId);
    }

    async cancelMatching(accountId?: string, methodId?: string): Promise<void> {
        const entries = [...this.entries.values()].filter(
            (entry) =>
                (accountId === undefined || entry.accountId === accountId) &&
                (methodId === undefined || entry.methodId === methodId),
        );
        this.lifetimes.cancelMatching(accountId, methodId);
        await Promise.all(entries.map((entry) => this.cleanup(entry)));
    }
}
