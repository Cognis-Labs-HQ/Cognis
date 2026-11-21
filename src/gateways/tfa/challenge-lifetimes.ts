import type { TfaChallengeLifetime } from "./contracts/method.js";

export function assertLiveChallenge(lifetime: TfaChallengeLifetime): void {
    if (
        !lifetime ||
        !lifetime.id ||
        !Number.isFinite(lifetime.expiresAt) ||
        !(lifetime.signal instanceof AbortSignal) ||
        lifetime.signal.aborted ||
        lifetime.expiresAt <= Date.now()
    )
        throw new Error("tfa_attempt_expired");
}

type LifetimeEntry = {
    accountId: string;
    methodId: string | undefined;
    parent: TfaChallengeLifetime;
    lifetime: TfaChallengeLifetime;
    release: () => void;
    cancel: () => void;
};

export class ChallengeLifetimes {
    private readonly entries = new Map<string | symbol, LifetimeEntry>();
    private readonly blocks = new Set<{
        accountId?: string;
        methodId?: string;
    }>();

    block(accountId?: string, methodId?: string): () => void {
        const scope = { accountId, methodId };
        this.blocks.add(scope);
        this.cancelMatching(accountId, methodId);
        return () => {
            this.blocks.delete(scope);
        };
    }

    private assertAvailable(accountId: string, methodId?: string): void {
        for (const scope of this.blocks) {
            if (
                (scope.accountId === undefined ||
                    scope.accountId === accountId) &&
                (scope.methodId === undefined ||
                    methodId === undefined ||
                    scope.methodId === methodId)
            )
                throw new Error("tfa_operation_unavailable");
        }
    }

    private create(
        key: string | symbol,
        accountId: string,
        methodId: string | undefined,
        parent: TfaChallengeLifetime,
    ): LifetimeEntry {
        this.assertAvailable(accountId, methodId);
        assertLiveChallenge(parent);
        const controller = new AbortController();
        const lifetime = Object.freeze({
            id: parent.id,
            expiresAt: parent.expiresAt,
            signal: controller.signal,
        });
        const release = () => {
            this.entries.delete(key);
            clearTimeout(timer);
            parent.signal.removeEventListener("abort", cancel);
        };
        const cancel = () => {
            release();
            controller.abort();
        };
        const timer = setTimeout(
            cancel,
            Math.min(2147483647, parent.expiresAt - Date.now()),
        );
        timer.unref();
        const entry = {
            accountId,
            methodId,
            parent,
            lifetime,
            release,
            cancel,
        };
        this.entries.set(key, entry);
        parent.signal.addEventListener("abort", cancel, { once: true });
        return entry;
    }

    acquire(
        accountId: string,
        methodId: string,
        parent: TfaChallengeLifetime,
    ): TfaChallengeLifetime {
        this.assertAvailable(accountId, methodId);
        assertLiveChallenge(parent);
        const key = JSON.stringify([accountId, methodId, parent.id]);
        const existing = this.entries.get(key);
        if (existing) {
            if (
                existing.parent.signal !== parent.signal ||
                existing.parent.expiresAt !== parent.expiresAt
            )
                throw new Error("tfa_lifetime_mismatch");
            return existing.lifetime;
        }
        return this.create(key, accountId, methodId, parent).lifetime;
    }

    guard(
        accountId: string,
        parent: TfaChallengeLifetime,
    ): Pick<LifetimeEntry, "lifetime" | "release"> {
        return this.create(Symbol(), accountId, undefined, parent);
    }

    cancelMatching(
        accountId?: string,
        methodId?: string,
        operationId?: string,
    ): void {
        for (const entry of this.entries.values()) {
            if (
                (accountId === undefined || entry.accountId === accountId) &&
                (methodId === undefined ||
                    entry.methodId === undefined ||
                    entry.methodId === methodId) &&
                (operationId === undefined || entry.lifetime.id === operationId)
            )
                entry.cancel();
        }
    }
}
