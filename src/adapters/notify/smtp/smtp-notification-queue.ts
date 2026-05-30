import { randomUUID } from "node:crypto";
import type { NotificationSenderQueueEntry } from "@cognis/core";
import { SMTP_VERIFICATION_RATE_LIMIT_MS } from "./rate-limit.js";

export class SmtpRateLimiter {
    private readonly lastSent = new Map<string, number>();

    constructor(
        private readonly minIntervalMs: number,
        private readonly now: () => number = () => Date.now(),
    ) {}

    nextAvailableAt(recipient: string): number {
        const last = this.lastSent.get(recipient);
        if (last === undefined) return this.now();
        return last + this.minIntervalMs;
    }

    isThrottled(recipient: string): boolean {
        return this.now() < this.nextAvailableAt(recipient);
    }

    record(recipient: string, sentAt: number = this.now()): void {
        this.lastSent.set(recipient, sentAt);
    }
}

type SmtpQueueStatus =
    | "queued"
    | "waiting_rate_limit"
    | "sending"
    | "sent"
    | "failed";

interface SmtpQueueEntry extends NotificationSenderQueueEntry {
    status: SmtpQueueStatus;
    recipientEmail: string;
    body: string;
    theme?: string;
    verifyUrl?: string;
    verifyButtonLabel?: string;
    nextAttemptAt: number;
}

// Keep a bounded in-memory history so admins can inspect recent outcomes
// without allowing long-running processes to grow this cache unbounded.
const SMTP_QUEUE_HISTORY_LIMIT = 200;

export interface SmtpNotificationQueuePayload {
    recipientEmail: string;
    subject: string;
    body: string;
    theme?: string;
    verifyUrl?: string;
    verifyButtonLabel?: string;
    recipientUsername?: string;
    category?: string;
}

export class SmtpNotificationQueue {
    private readonly queueById = new Map<string, SmtpQueueEntry>();
    private readonly pendingWaiters = new Map<
        string,
        Array<{
            resolve: () => void;
            reject: (error: Error) => void;
        }>
    >();
    private queueDraining = false;

    constructor(
        private readonly rateLimiter: SmtpRateLimiter,
        private readonly sleep: (ms: number) => Promise<void>,
        private readonly sendFn: (
            payload: SmtpNotificationQueuePayload,
        ) => Promise<void>,
    ) {}

    private getRecipientNextAttemptAt(recipientEmail: string): number {
        const now = Date.now();
        let nextAttemptAt = Math.max(
            now,
            this.rateLimiter.nextAvailableAt(recipientEmail),
        );
        for (const queued of this.queueById.values()) {
            if (queued.recipientEmail !== recipientEmail) continue;
            if (queued.status === "sent" || queued.status === "failed")
                continue;
            nextAttemptAt = Math.max(
                nextAttemptAt,
                queued.nextAttemptAt + SMTP_VERIFICATION_RATE_LIMIT_MS,
            );
        }
        return nextAttemptAt;
    }

    private listActiveQueue(): SmtpQueueEntry[] {
        return Array.from(this.queueById.values()).filter(
            (entry) => entry.status !== "sent" && entry.status !== "failed",
        );
    }

    private snapshotQueueEntry(
        entry: SmtpQueueEntry,
    ): NotificationSenderQueueEntry {
        return {
            notificationId: entry.notificationId,
            status: entry.status,
            createdAt: entry.createdAt,
            updatedAt: entry.updatedAt,
            ...(entry.availableAt ? { availableAt: entry.availableAt } : {}),
            ...(entry.error ? { error: entry.error } : {}),
            ...(entry.recipientUsername
                ? { recipientUsername: entry.recipientUsername }
                : {}),
            recipientEmail: entry.recipientEmail,
            ...(entry.category ? { category: entry.category } : {}),
            subject: entry.subject,
        };
    }

    private touchQueueEntry(
        entry: SmtpQueueEntry,
        update: Partial<Omit<SmtpQueueEntry, "notificationId" | "createdAt">>,
    ): void {
        Object.assign(entry, update, { updatedAt: new Date().toISOString() });
    }

    private notifyWaiters(entry: SmtpQueueEntry): void {
        const waiters = this.pendingWaiters.get(entry.notificationId);
        if (!waiters || waiters.length === 0) return;
        this.pendingWaiters.delete(entry.notificationId);
        if (entry.status === "sent") {
            for (const waiter of waiters) waiter.resolve();
            return;
        }
        if (entry.status === "failed") {
            const error = new Error(entry.error ?? "smtp_send_failed");
            for (const waiter of waiters) waiter.reject(error);
        }
    }

    private pruneQueueHistory(): void {
        const completed = Array.from(this.queueById.values())
            .filter(
                (entry) => entry.status === "sent" || entry.status === "failed",
            )
            .sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt));
        if (completed.length <= SMTP_QUEUE_HISTORY_LIMIT) return;
        for (const entry of completed.slice(SMTP_QUEUE_HISTORY_LIMIT)) {
            this.queueById.delete(entry.notificationId);
        }
    }

    private async ensureQueueDrained(): Promise<void> {
        if (this.queueDraining) return;
        this.queueDraining = true;
        try {
            while (true) {
                const activeQueue = this.listActiveQueue().sort(
                    (a, b) => a.nextAttemptAt - b.nextAttemptAt,
                );
                const nextEntry = activeQueue[0];
                if (!nextEntry) break;
                const now = Date.now();
                if (nextEntry.nextAttemptAt > now) {
                    this.touchQueueEntry(nextEntry, {
                        status: "waiting_rate_limit",
                        availableAt: new Date(
                            nextEntry.nextAttemptAt,
                        ).toISOString(),
                    });
                    await this.sleep(nextEntry.nextAttemptAt - now);
                    continue;
                }
                this.touchQueueEntry(nextEntry, {
                    status: "sending",
                    availableAt: undefined,
                    error: undefined,
                });
                try {
                    await this.sendFn({
                        recipientEmail: nextEntry.recipientEmail,
                        subject: nextEntry.subject,
                        body: nextEntry.body,
                        theme: nextEntry.theme,
                        verifyUrl: nextEntry.verifyUrl,
                        verifyButtonLabel: nextEntry.verifyButtonLabel,
                        recipientUsername: nextEntry.recipientUsername,
                        category: nextEntry.category,
                    });
                    this.rateLimiter.record(
                        nextEntry.recipientEmail,
                        Date.now(),
                    );
                    this.touchQueueEntry(nextEntry, {
                        status: "sent",
                        availableAt: undefined,
                        error: undefined,
                    });
                    this.notifyWaiters(nextEntry);
                } catch (error) {
                    const message =
                        error instanceof Error ? error.message : String(error);
                    this.touchQueueEntry(nextEntry, {
                        status: "failed",
                        availableAt: undefined,
                        error: message,
                    });
                    this.notifyWaiters(nextEntry);
                }
                this.pruneQueueHistory();
            }
        } finally {
            this.queueDraining = false;
            if (this.listActiveQueue().length > 0) {
                void this.ensureQueueDrained();
            }
        }
    }

    enqueue(input: SmtpNotificationQueuePayload): { notificationId: string } {
        const nextAttemptAt = this.getRecipientNextAttemptAt(
            input.recipientEmail,
        );
        const nowIso = new Date().toISOString();
        const notificationId = randomUUID();
        const entry: SmtpQueueEntry = {
            notificationId,
            recipientEmail: input.recipientEmail,
            recipientUsername: input.recipientUsername,
            category: input.category,
            subject: input.subject,
            body: input.body,
            theme: input.theme,
            verifyUrl: input.verifyUrl,
            verifyButtonLabel: input.verifyButtonLabel,
            createdAt: nowIso,
            updatedAt: nowIso,
            status:
                nextAttemptAt > Date.now() ? "waiting_rate_limit" : "queued",
            nextAttemptAt,
            ...(nextAttemptAt > Date.now()
                ? { availableAt: new Date(nextAttemptAt).toISOString() }
                : {}),
        };
        this.queueById.set(notificationId, entry);
        void this.ensureQueueDrained();
        return { notificationId };
    }

    async waitForResult(notificationId: string): Promise<void> {
        const item = this.queueById.get(notificationId);
        if (!item) throw new Error("smtp_queue_item_missing");
        if (item.status === "sent") return;
        if (item.status === "failed") {
            throw new Error(item.error ?? "smtp_send_failed");
        }
        await new Promise<void>((resolve, reject) => {
            const waiters = this.pendingWaiters.get(notificationId) ?? [];
            waiters.push({ resolve, reject });
            this.pendingWaiters.set(notificationId, waiters);
        });
    }

    listQueue(): NotificationSenderQueueEntry[] {
        return Array.from(this.queueById.values())
            .sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt))
            .map((entry) => this.snapshotQueueEntry(entry));
    }

    getQueueItem(notificationId: string): NotificationSenderQueueEntry | null {
        const entry = this.queueById.get(notificationId);
        if (!entry) return null;
        return this.snapshotQueueEntry(entry);
    }
}
