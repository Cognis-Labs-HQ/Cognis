import { randomUUID } from "node:crypto";
import type { NotificationEnvelope } from "../../../gateways/notify/gateway.js";

export interface InternalNotification {
    id: string;
    recipientUsername: string;
    subject: string;
    body: string;
    category: string;
    senderName?: string;
    actionUrl?: string;
    metadata?: Record<string, unknown>;
    read: boolean;
    createdAt: number;
}

/**
 * Async store interface implemented by both the in-memory and DB-backed stores.
 * Routes and the sender use this contract so the backing implementation can be
 * swapped without touching call sites.
 */
export interface IInternalNotificationStore {
    add(envelope: NotificationEnvelope): Promise<void>;
    list(username: string): Promise<InternalNotification[]>;
    countUnread(username: string): Promise<number>;
    markRead(username: string, id: string): Promise<boolean>;
    markAllRead(username: string): Promise<void>;
    delete(username: string, id: string): Promise<boolean>;
    deleteAll(username: string): Promise<number>;
}

const MAX_PER_USER = 50;

/**
 * In-memory store for internal (in-app) notifications. Keyed by username.
 * Caps per-user storage at MAX_PER_USER; oldest notifications are evicted
 * when the cap is reached. Notifications are lost on server restart.
 */
export class InternalNotificationStore {
    private readonly notifications = new Map<string, InternalNotification[]>();

    add(envelope: NotificationEnvelope): void {
        const username = envelope.recipientUsername;
        const list = this.notifications.get(username) ?? [];

        list.unshift({
            id: randomUUID(),
            recipientUsername: username,
            subject: envelope.subject,
            body: envelope.body,
            category: envelope.category,
            senderName: envelope.senderName,
            actionUrl: envelope.actionUrl,
            metadata: envelope.metadata,
            read: false,
            createdAt: Date.now(),
        });

        if (list.length > MAX_PER_USER) {
            list.splice(MAX_PER_USER);
        }

        this.notifications.set(username, list);
    }

    list(username: string): InternalNotification[] {
        return [...(this.notifications.get(username) ?? [])];
    }

    countUnread(username: string): number {
        return (this.notifications.get(username) ?? []).filter((n) => !n.read)
            .length;
    }

    markRead(username: string, id: string): boolean {
        const list = this.notifications.get(username);
        if (!list) return false;
        const notif = list.find((n) => n.id === id);
        if (!notif) return false;
        notif.read = true;
        return true;
    }

    markAllRead(username: string): void {
        const list = this.notifications.get(username);
        if (!list) return;
        for (const notif of list) {
            notif.read = true;
        }
    }

    delete(username: string, id: string): boolean {
        const list = this.notifications.get(username);
        if (!list) return false;
        const idx = list.findIndex((n) => n.id === id);
        if (idx === -1) return false;
        list.splice(idx, 1);
        return true;
    }

    deleteAll(username: string): number {
        const list = this.notifications.get(username);
        if (!list || list.length === 0) return 0;
        const removed = list.length;
        this.notifications.delete(username);
        return removed;
    }
}

/**
 * Wraps the synchronous InternalNotificationStore so it satisfies the async
 * IInternalNotificationStore interface. Used as the default store when no
 * database executor is available.
 */
export class AsyncInternalNotificationStore implements IInternalNotificationStore {
    private readonly inner = new InternalNotificationStore();

    async add(envelope: NotificationEnvelope): Promise<void> {
        this.inner.add(envelope);
    }

    async list(username: string): Promise<InternalNotification[]> {
        return this.inner.list(username);
    }

    async countUnread(username: string): Promise<number> {
        return this.inner.countUnread(username);
    }

    async markRead(username: string, id: string): Promise<boolean> {
        return this.inner.markRead(username, id);
    }

    async markAllRead(username: string): Promise<void> {
        this.inner.markAllRead(username);
    }

    async delete(username: string, id: string): Promise<boolean> {
        return this.inner.delete(username, id);
    }

    async deleteAll(username: string): Promise<number> {
        return this.inner.deleteAll(username);
    }
}
