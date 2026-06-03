// NOTE: This limiter keeps state in-process for single-instance deployments.
// In multi-instance setups (for example, behind a load balancer), use a shared
// store-backed limiter (such as Redis) to enforce global throttling.
export class MemoryRateLimiter {
    private readonly lastSeenAt = new Map<string, number>();

    constructor(
        private readonly minIntervalMs: number,
        private readonly now: () => number = () => Date.now(),
    ) {}

    private pruneExpiredEntries(): void {
        const now = this.now();
        for (const [key, lastSeenAt] of this.lastSeenAt.entries()) {
            if (now - lastSeenAt >= this.minIntervalMs) {
                this.lastSeenAt.delete(key);
            }
        }
    }

    isThrottled(key: string): boolean {
        this.pruneExpiredEntries();
        const normalizedKey = key.trim();
        if (!normalizedKey) return false;
        const lastSeenAt = this.lastSeenAt.get(normalizedKey);
        if (lastSeenAt === undefined) return false;
        return this.now() - lastSeenAt < this.minIntervalMs;
    }

    record(key: string): void {
        this.pruneExpiredEntries();
        const normalizedKey = key.trim();
        if (!normalizedKey) return;
        this.lastSeenAt.set(normalizedKey, this.now());
    }
}
