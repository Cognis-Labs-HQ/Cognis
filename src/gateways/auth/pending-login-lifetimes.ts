export interface PendingLoginLifetime {
    readonly id: string;
    readonly accountId: string;
    readonly expiresAt: number;
    readonly signal: AbortSignal;
}

export class PendingLoginLifetimes {
    private readonly entries = new Map<
        string,
        {
            lifetime: PendingLoginLifetime;
            controller: AbortController;
            timer: ReturnType<typeof setTimeout>;
        }
    >();

    create(
        id: string,
        accountId: string,
        expiresAt: number,
        expire: () => void,
    ): PendingLoginLifetime {
        const controller = new AbortController();
        const lifetime = Object.freeze({
            id,
            accountId,
            expiresAt,
            signal: controller.signal,
        });
        const timer = setTimeout(expire, Math.max(0, expiresAt - Date.now()));
        timer.unref();
        this.entries.set(id, { lifetime, controller, timer });
        return lifetime;
    }

    get(id: string): PendingLoginLifetime | null {
        const entry = this.entries.get(id);
        if (
            !entry ||
            entry.lifetime.expiresAt <= Date.now() ||
            entry.controller.signal.aborted
        )
            return null;
        return entry.lifetime;
    }

    cancel(id: string): void {
        const entry = this.entries.get(id);
        if (!entry) return;
        this.entries.delete(id);
        clearTimeout(entry.timer);
        entry.controller.abort();
    }
}
