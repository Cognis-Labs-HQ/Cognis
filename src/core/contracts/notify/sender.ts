import type { IncomingMessage, ServerResponse } from "node:http";
import type { BootstrapDisposer } from "../../ctx/bootstrap-scope.js";
import type { CapabilityStore } from "../../services/gateway-service.js";
import type { NotificationActionReceipt } from "./action-delivery.js";

/**
 * Context passed to `bootstrapNotifyAdapter` when a notification adapter
 * exports that function. Provides the minimal surface adapters need to
 * self-register routes, static assets, and navbar plugins.
 */
export interface NotifyAdapterBootstrapCtx {
    capabilities: CapabilityStore;
    registerRoute(
        handler: (
            req: IncomingMessage,
            res: ServerResponse,
            url: URL,
        ) => Promise<boolean>,
        gatewayId?: string,
    ): void;
    registerNavbarPlugin(scriptUrl: string): void;
    registerStaticDir(urlPrefix: string, absoluteDir: string): void;
    requireAuth(
        req: IncomingMessage,
        res: ServerResponse,
        minimumRole: "admin",
    ): boolean;
    readJson(req: IncomingMessage): Promise<Record<string, unknown>>;
    log?: (level: string, msg: string, meta?: Record<string, unknown>) => void;
}

export interface NotificationEnvelope {
    purpose?: string;
    category: string;
    recipientUsername: string;
    recipientEmail?: string;
    subject: string;
    body: string;
    senderName?: string;
    actionUrl?: string;
    metadata?: Record<string, unknown>;
    attachments?: Array<{
        filename: string;
        contentType?: string;
        content: string;
    }>;
}

export interface NotificationCategory {
    id: string;
    label: string;
}

export interface NotificationSenderInfo {
    senderId: string;
    name: string;
    version?: string;
    publisher?: string;
    active: boolean;
    supportsTest?: boolean;
    requiresVerifiedEmail?: boolean;
    alwaysOn?: boolean;
    locked?: boolean;
    requires?: string[];
}

export type NotificationQueueStatus =
    "queued" | "waiting_rate_limit" | "sending" | "sent" | "failed";

export interface NotificationSenderQueueEntry extends NotificationActionReceipt {
    recipientUsername?: string;
    category?: string;
}

export interface NotificationQueueEntry extends NotificationSenderQueueEntry {
    senderId: string;
}

export interface NotificationDispatchError {
    senderId: string;
    error: string;
}

export interface NotificationDispatchReceipt {
    senderId: string;
    notificationId: string;
}

export interface NotificationDispatchResult {
    dispatched: string[];
    notifications?: NotificationDispatchReceipt[];
    errors?: NotificationDispatchError[];
}

export type NotificationChannelRegistration = BootstrapDisposer & {
    send(envelope: NotificationEnvelope): Promise<void>;
    sendTracked?(
        envelope: NotificationEnvelope,
    ): Promise<{ notificationId: string }>;
};

export interface NotificationSender {
    readonly senderId: string;
    readonly requiresVerifiedEmail?: boolean;
    readonly senderName?: string;
    readonly version?: string;
    readonly publisher?: string;
    send(envelope: NotificationEnvelope): Promise<void>;
    sendTracked?(envelope: NotificationEnvelope): Promise<{
        notificationId: string;
    }>;
    getConfig?(): Record<string, unknown>;
    setConfig?(config: Record<string, unknown>): void;
    setDeliveryEnabled?(enabled: boolean): void;
    bootstrap?(ctx: NotifyAdapterBootstrapCtx): Promise<void>;
    registerChannel?(
        category: NotificationCategory,
    ): NotificationChannelRegistration;
    test?(to: string, config?: Record<string, unknown>): Promise<void>;
    isConfigured?(): boolean;
    getEnvValues?(): Record<string, string | undefined>;
    getRequiredFields?(): string[];
    listQueue?(): NotificationSenderQueueEntry[];
    getQueueItem?(notificationId: string): NotificationSenderQueueEntry | null;
}
