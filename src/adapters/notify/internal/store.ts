import { randomUUID } from "node:crypto";
import type { NotificationEnvelope } from "../../../gateways/notify/gateway.js";

export interface InternalNotification {
    id: string;
    recipientUsername: string;
    subject: string;
    body: string;
    category: string;
    senderName?: string;
    read: boolean;
    createdAt: number;
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
}
