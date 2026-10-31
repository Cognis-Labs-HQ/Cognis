import { randomUUID } from "node:crypto";
import type { NotificationSenderQueueEntry } from "../../../gateways/notify/gateway.js";

export class SmtpRateLimiter {
    private readonly lastSent = new Map<string, number>();

    constructor(
        readonly intervalMs: number,
        private readonly now: () => number = () => Date.now(),
    ) {}

    nextAvailableAt(recipient: string): number {
        const last = this.lastSent.get(recipient.trim().toLowerCase());
        if (last === undefined) return this.now();
        return last + this.intervalMs;
    }

    isThrottled(recipient: string): boolean {
        const lastSentAt = this.lastSent.get(recipient.trim().toLowerCase());
        return (
            lastSentAt !== undefined &&
            this.now() < lastSentAt + this.intervalMs
        );
    }

    record(recipient: string, sentAt: number = this.now()): void {
        this.lastSent.set(recipient.trim().toLowerCase(), sentAt);
    }
}

type SmtpQueueStatus =
    "queued" | "waiting_rate_limit" | "sending" | "sent" | "failed";

interface SmtpQueueEntry extends NotificationSenderQueueEntry {
    purpose: string;
    status: SmtpQueueStatus;
    failure?: Error;
    recipientEmail: string;
    body: string;
    theme?: string;
    verifyUrl?: string;
    verifyButtonLabel?: string;
    nextAttemptAt: number;
    config?: Record<string, unknown>;
    attachments?: import("./mime-attachments.js").MimeAttachment[];
}

// Keep a bounded in-memory history so admins can inspect recent outcomes
// without allowing long-running processes to grow this cache unbounded.
const SMTP_QUEUE_HISTORY_LIMIT = 200;

export interface SmtpNotificationQueuePayload {
    purpose: string;
    recipientEmail: string;
    subject: string;
    body: string;
    theme?: string;
    verifyUrl?: string;
    verifyButtonLabel?: string;
    recipientUsername?: string;
    category?: string;
    config?: Record<string, unknown>;
    attachments?: import("./mime-attachments.js").MimeAttachment[];
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
    private closed = false;
    private sleepingUntil: number | null = null;
    private wakeDrainSleep: {
        sleepId: number;
        resolve: () => void;
    } | null = null;

    private nextSleepId = 0;

    constructor(
        private readonly rateLimiter: SmtpRateLimiter,
        private readonly sleep: (ms: number) => Promise<void>,
        private readonly sendFn: (
            payload: SmtpNotificationQueuePayload,
        ) => Promise<void>,
        readonly purpose: string,
    ) {}

    private getRecipientNextAttemptAt(recipientEmail: string): number {
        const now = Date.now();
        let nextAttemptAt = Math.max(
            now,
            this.rateLimiter.nextAvailableAt(recipientEmail),
        );
        for (const queued of this.queueById.values()) {
            if (
                queued.recipientEmail.trim().toLowerCase() !==
                recipientEmail.trim().toLowerCase()
            )
                continue;
            if (queued.status === "sent" || queued.status === "failed")
                continue;
            nextAttemptAt = Math.max(
                nextAttemptAt,
                queued.nextAttemptAt + this.rateLimiter.intervalMs,
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
            purpose: entry.purpose,
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
            const error =
                entry.failure ?? new Error(entry.error ?? "smtp_send_failed");
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
                const activeQueue = this.listActiveQueue();
                for (const entry of activeQueue) {
                    entry.nextAttemptAt = Math.max(
                        entry.nextAttemptAt,
                        this.rateLimiter.nextAvailableAt(entry.recipientEmail),
                    );
                }
                activeQueue.sort(
                    (first, second) =>
                        first.nextAttemptAt - second.nextAttemptAt,
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
                    await this.sleepWithWake(
                        nextEntry.nextAttemptAt - now,
                        nextEntry.nextAttemptAt,
                    );
                    continue;
                }
                this.touchQueueEntry(nextEntry, {
                    status: "sending",
                    availableAt: undefined,
                    error: undefined,
                });
                try {
                    await this.sendFn({
                        purpose: nextEntry.purpose,
                        recipientEmail: nextEntry.recipientEmail,
                        subject: nextEntry.subject,
                        body: nextEntry.body,
                        theme: nextEntry.theme,
                        verifyUrl: nextEntry.verifyUrl,
                        verifyButtonLabel: nextEntry.verifyButtonLabel,
                        recipientUsername: nextEntry.recipientUsername,
                        category: nextEntry.category,
                        config: nextEntry.config,
                        attachments: nextEntry.attachments,
                    });
                    if (this.closed) continue;
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
                        failure:
                            error instanceof Error ? error : new Error(message),
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
        if (this.closed) throw new Error("smtp_purpose_disposed");
        if (input.purpose !== this.purpose)
            throw new Error("smtp_purpose_mismatch");
        const nextAttemptAt = this.getRecipientNextAttemptAt(
            input.recipientEmail,
        );
        const nowIso = new Date().toISOString();
        const notificationId = randomUUID();
        const entry: SmtpQueueEntry = {
            notificationId,
            recipientEmail: input.recipientEmail,
            purpose: input.purpose,
            recipientUsername: input.recipientUsername,
            category: input.category,
            subject: input.subject,
            body: input.body,
            theme: input.theme,
            verifyUrl: input.verifyUrl,
            verifyButtonLabel: input.verifyButtonLabel,
            config: input.config,
            attachments: input.attachments,
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
        this.wakeSleepingDrainer(nextAttemptAt);
        void this.ensureQueueDrained();
        return { notificationId };
    }

    private wakeSleepingDrainer(nextAttemptAt: number): void {
        if (
            !this.queueDraining ||
            this.sleepingUntil === null ||
            nextAttemptAt >= this.sleepingUntil
        ) {
            return;
        }

        this.sleepingUntil = null;
        const wake = this.wakeDrainSleep;
        if (!wake) return;
        this.wakeDrainSleep = null;
        wake.resolve();
    }

    private async sleepWithWake(
        delayMs: number,
        sleepingUntil: number,
    ): Promise<void> {
        const sleepId = this.nextSleepId++;
        this.sleepingUntil = sleepingUntil;
        const wakePromise = new Promise<void>((resolve) => {
            this.wakeDrainSleep = { sleepId, resolve };
        });
        await Promise.race([this.sleep(delayMs), wakePromise]);
        if (this.wakeDrainSleep?.sleepId === sleepId) {
            this.wakeDrainSleep = null;
            this.sleepingUntil = null;
            return;
        }
        if (this.sleepingUntil === sleepingUntil) {
            this.sleepingUntil = null;
        }
    }

    close(): void {
        this.closed = true;
        this.wakeDrainSleep?.resolve();
        for (const entry of this.listActiveQueue()) {
            this.touchQueueEntry(entry, {
                status: "failed",
                error: "smtp_purpose_disposed",
            });
            this.notifyWaiters(entry);
        }
    }

    async waitForResult(notificationId: string): Promise<void> {
        const item = this.queueById.get(notificationId);
        if (!item) throw new Error("smtp_queue_item_missing");
        if (item.status === "sent") return;
        if (item.status === "failed") {
            throw item.failure ?? new Error(item.error ?? "smtp_send_failed");
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
