import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import type { IncomingMessage, ServerResponse } from "node:http";
import type { CapabilityStore } from "@cognis/core";
import type { DbExecutor } from "../db/reuse/db-executor.js";

/**
 * Context passed to `bootstrapNotifyAdapter` when a notification adapter
 * exports that function. Provides the minimal surface adapters need to
 * self-register routes, static assets, and navbar plugins.
 */
export interface NotifyAdapterBootstrapCtx {
    gateway: CoreNotificationGateway;
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
    log?: (level: string, msg: string, meta?: Record<string, unknown>) => void;
    dbExecutor?: DbExecutor;
}

export interface NotificationEnvelope {
    category: string;
    recipientUsername: string;
    recipientEmail?: string;
    subject: string;
    body: string;
    senderName?: string;
    actionUrl?: string;
    metadata?: Record<string, unknown>;
}

export interface NotificationCategory {
    id: string;
    label: string;
}

export interface NotificationSenderInfo {
    senderId: string;
    name: string;
    active: boolean;
    supportsTest?: boolean;
    alwaysOn?: boolean;
    locked?: boolean;
    requires?: string[];
}

export type NotificationQueueStatus =
    | "queued"
    | "waiting_rate_limit"
    | "sending"
    | "sent"
    | "failed";

export interface NotificationSenderQueueEntry {
    notificationId: string;
    status: NotificationQueueStatus;
    createdAt: string;
    updatedAt: string;
    availableAt?: string;
    error?: string;
    recipientUsername?: string;
    recipientEmail?: string;
    category?: string;
    subject?: string;
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

export interface NotificationSender {
    readonly senderId: string;
    readonly senderName?: string;
    send(envelope: NotificationEnvelope): Promise<void>;
    sendTracked?(envelope: NotificationEnvelope): Promise<{
        notificationId: string;
    }>;
    getConfig?(): Record<string, unknown>;
    setConfig?(config: Record<string, unknown>): void;
    sendTestEmail?(to: string, config?: Record<string, unknown>): Promise<void>;
    isConfigured?(): boolean;
    getEnvValues?(): Record<string, string | undefined>;
    getRequiredFields?(): string[];
    listQueue?(): NotificationSenderQueueEntry[];
    getQueueItem?(notificationId: string): NotificationSenderQueueEntry | null;
}

export interface NotificationGateway {
    registerSender(sender: NotificationSender): void;
    dispatch(
        envelope: NotificationEnvelope,
    ): Promise<NotificationDispatchResult>;
    registerCategory(id: string, label: string): void;
    listSenders(): NotificationSenderInfo[];
    listCategories(): NotificationCategory[];
    listNotificationQueue(): NotificationQueueEntry[];
    getNotificationQueueItem(
        notificationId: string,
    ): NotificationQueueEntry | null;
}

export interface NotificationPreferenceStore {
    getSenderIds(
        recipientUsername: string,
        category: string,
    ): Promise<string[]>;
}

export interface NotificationConfigStore {
    getConfig(senderId: string): Promise<Record<string, unknown> | null>;
    saveConfig(
        senderId: string,
        config: Record<string, unknown>,
    ): Promise<void>;
}

export interface NotificationEmailStore {
    getPrimaryEmail(accountId: string): Promise<string | null>;
    getAccountIdByEmail(email: string): Promise<string | null>;
}

export interface VerificationEmailSender {
    canSendVerificationEmail(): boolean;
    queueVerificationEmail?(
        to: string,
        code: string,
        verifyUrl?: string,
        theme?: string,
    ): Promise<NotificationSenderQueueEntry>;
    sendVerificationEmail(
        to: string,
        code: string,
        verifyUrl?: string,
        theme?: string,
    ): Promise<void>;
}

export interface OneTimeLoginEmailSender {
    canSendOneTimeLoginEmail(): boolean;
    sendOneTimeLoginEmail(
        to: string,
        loginUrl: string,
        options?: {
            theme?: string;
            subject?: string;
            body?: string;
            actionLabel?: string;
        },
    ): Promise<void>;
}

export interface RegistrationInviteEmailSender {
    canSendRegistrationInviteEmail(): boolean;
    sendRegistrationInviteEmail(
        to: string,
        inviterDisplayName: string,
        inviteUrl: string,
        theme?: string,
    ): Promise<void>;
}

export class VolatileNotificationPreferenceStore implements NotificationPreferenceStore {
    private readonly prefs = new Map<string, string[]>();

    set(
        recipientUsername: string,
        category: string,
        senderIds: string[],
    ): void {
        this.prefs.set(`${recipientUsername}:${category}`, senderIds);
    }

    async getSenderIds(
        recipientUsername: string,
        category: string,
    ): Promise<string[]> {
        return this.prefs.get(`${recipientUsername}:${category}`) ?? [];
    }
}

type SenderWithVerification = {
    queueVerificationEmail?(
        to: string,
        code: string,
        verifyUrl?: string,
        theme?: string,
    ): Promise<NotificationSenderQueueEntry>;
    sendVerificationEmail(
        to: string,
        code: string,
        verifyUrl?: string,
        theme?: string,
    ): Promise<void>;
    isConfigured?(): boolean;
};

type SenderWithRegistrationInvite = {
    sendRegistrationInviteEmail(
        to: string,
        inviterDisplayName: string,
        inviteUrl: string,
        theme?: string,
    ): Promise<void>;
    isConfigured?(): boolean;
};

type SenderWithOneTimeLogin = {
    sendOneTimeLoginEmail(
        to: string,
        loginUrl: string,
        options?: {
            theme?: string;
            subject?: string;
            body?: string;
            actionLabel?: string;
        },
    ): Promise<void>;
    isConfigured?(): boolean;
};

type SenderWithTrackedSend = {
    sendTracked(
        envelope: NotificationEnvelope,
    ): Promise<{ notificationId: string }>;
};

type SenderWithQueueList = {
    listQueue(): NotificationSenderQueueEntry[];
};

type SenderWithQueueItem = {
    getQueueItem(notificationId: string): NotificationSenderQueueEntry | null;
};

function isSenderWithVerification(
    sender: NotificationSender,
): sender is NotificationSender & SenderWithVerification {
    return (
        typeof (sender as Record<string, unknown>).sendVerificationEmail ===
        "function"
    );
}

function isSenderWithRegistrationInvite(
    sender: NotificationSender,
): sender is NotificationSender & SenderWithRegistrationInvite {
    return (
        typeof (sender as Record<string, unknown>)
            .sendRegistrationInviteEmail === "function"
    );
}

function isSenderWithOneTimeLogin(
    sender: NotificationSender,
): sender is NotificationSender & SenderWithOneTimeLogin {
    return (
        typeof (sender as Record<string, unknown>).sendOneTimeLoginEmail ===
        "function"
    );
}

function isSenderWithTrackedSend(
    sender: NotificationSender,
): sender is NotificationSender & SenderWithTrackedSend {
    return (
        typeof (sender as Record<string, unknown>).sendTracked === "function"
    );
}

function isSenderWithQueueList(
    sender: NotificationSender,
): sender is NotificationSender & SenderWithQueueList {
    return typeof (sender as Record<string, unknown>).listQueue === "function";
}

function isSenderWithQueueItem(
    sender: NotificationSender,
): sender is NotificationSender & SenderWithQueueItem {
    return (
        typeof (sender as Record<string, unknown>).getQueueItem === "function"
    );
}

export class CoreNotificationGateway
    implements
        NotificationGateway,
        VerificationEmailSender,
        RegistrationInviteEmailSender,
        OneTimeLoginEmailSender
{
    private readonly senders = new Map<string, NotificationSender>();
    private readonly categories = new Map<string, string>();
    private readonly disabledSenders = new Set<string>();
    private readonly senderRequires = new Map<string, string[]>();
    private readonly alwaysOnSenders = new Set<string>();

    constructor(
        private readonly prefStore: NotificationPreferenceStore,
        private readonly configStore?: NotificationConfigStore,
        private readonly emailStore?: NotificationEmailStore,
    ) {}

    registerAlwaysOnSender(senderId: string): void {
        this.alwaysOnSenders.add(senderId);
    }

    isAlwaysOn(senderId: string): boolean {
        return this.alwaysOnSenders.has(senderId);
    }

    registerSender(sender: NotificationSender, requires?: string[]): void {
        this.senders.set(sender.senderId, sender);
        if (requires && requires.length > 0) {
            this.senderRequires.set(sender.senderId, requires);
        }
    }

    registerCategory(id: string, label: string): void {
        this.categories.set(id, label);
    }

    listSenders(): NotificationSenderInfo[] {
        return Array.from(this.senders.values()).map((sender) => {
            const requires = this.senderRequires.get(sender.senderId);
            const alwaysOn = this.alwaysOnSenders.has(sender.senderId);
            return {
                senderId: sender.senderId,
                name: sender.senderName ?? sender.senderId,
                active:
                    !this.disabledSenders.has(sender.senderId) &&
                    (typeof sender.isConfigured === "function"
                        ? sender.isConfigured()
                        : typeof sender.getConfig === "function"),
                supportsTest: typeof sender.sendTestEmail === "function",
                ...(alwaysOn ? { alwaysOn: true } : {}),
                locked: alwaysOn,
                ...(requires && requires.length > 0 ? { requires } : {}),
            };
        });
    }

    listCategories(): NotificationCategory[] {
        return Array.from(this.categories.entries()).map(([id, label]) => ({
            id,
            label,
        }));
    }

    listNotificationQueue(): NotificationQueueEntry[] {
        const queueEntries: NotificationQueueEntry[] = [];
        for (const [senderId, sender] of this.senders.entries()) {
            if (!isSenderWithQueueList(sender)) continue;
            for (const entry of sender.listQueue()) {
                queueEntries.push({ senderId, ...entry });
            }
        }
        return queueEntries.sort((a, b) => {
            const updatedAtDelta =
                Date.parse(b.updatedAt) - Date.parse(a.updatedAt);
            if (updatedAtDelta !== 0) return updatedAtDelta;
            return (
                Date.parse(b.createdAt) - Date.parse(a.createdAt) ||
                b.notificationId.localeCompare(a.notificationId)
            );
        });
    }

    getNotificationQueueItem(
        notificationId: string,
    ): NotificationQueueEntry | null {
        for (const [senderId, sender] of this.senders.entries()) {
            if (!isSenderWithQueueItem(sender)) continue;
            const item = sender.getQueueItem(notificationId);
            if (item) return { senderId, ...item };
        }
        return null;
    }

    getProviderConfig(senderId: string): Record<string, unknown> | null {
        const sender = this.senders.get(senderId);
        if (!sender || typeof sender.getConfig !== "function") return null;
        return {
            ...sender.getConfig(),
            enabled: !this.disabledSenders.has(senderId),
        };
    }

    getProviderEnvValues(
        senderId: string,
    ): Record<string, string | undefined> | null {
        const sender = this.senders.get(senderId);
        if (!sender || typeof sender.getEnvValues !== "function") return null;
        return sender.getEnvValues();
    }

    getProviderRequiredFields(senderId: string): string[] | null {
        const sender = this.senders.get(senderId);
        if (!sender || typeof sender.getRequiredFields !== "function")
            return null;
        return sender.getRequiredFields();
    }

    async saveProviderConfig(
        senderId: string,
        config: Record<string, unknown>,
    ): Promise<void> {
        const { enabled, ...senderConfig } = config;
        if (enabled === false || enabled === "false") {
            this.disabledSenders.add(senderId);
        } else {
            this.disabledSenders.delete(senderId);
        }
        const sender = this.senders.get(senderId);
        if (sender && typeof sender.setConfig === "function") {
            sender.setConfig(senderConfig);
        }
        const persistConfig: Record<string, unknown> = { ...config };
        if (persistConfig.password === "") {
            delete persistConfig.password;
        }
        await this.configStore?.saveConfig(senderId, persistConfig);
    }

    async loadPersistedConfigs(): Promise<void> {
        if (!this.configStore) return;
        for (const sender of this.senders.values()) {
            const config = await this.configStore.getConfig(sender.senderId);
            if (!config) continue;
            if (config.enabled === false || config.enabled === "false") {
                this.disabledSenders.add(sender.senderId);
            }
            if (typeof sender.setConfig === "function") {
                const { enabled, ...senderConfig } = config;
                sender.setConfig(senderConfig);
            }
        }
    }

    async enableSender(senderId: string): Promise<void> {
        this.disabledSenders.delete(senderId);
        const existing = (await this.configStore?.getConfig(senderId)) ?? null;
        await this.configStore?.saveConfig(senderId, {
            ...(existing ?? {}),
            enabled: true,
        });
    }

    async disableSender(senderId: string): Promise<void> {
        this.disabledSenders.add(senderId);
        const existing = (await this.configStore?.getConfig(senderId)) ?? null;
        await this.configStore?.saveConfig(senderId, {
            ...(existing ?? {}),
            enabled: false,
        });
    }

    getSender(senderId: string): NotificationSender | undefined {
        return this.senders.get(senderId);
    }

    canSendVerificationEmail(): boolean {
        for (const [id, sender] of this.senders.entries()) {
            if (this.disabledSenders.has(id)) continue;
            if (!isSenderWithVerification(sender)) continue;
            if (typeof sender.isConfigured === "function")
                return sender.isConfigured();
            return true;
        }
        return false;
    }

    async sendVerificationEmail(
        to: string,
        code: string,
        verifyUrl?: string,
        theme?: string,
    ): Promise<void> {
        for (const [id, sender] of this.senders.entries()) {
            if (this.disabledSenders.has(id)) continue;
            if (!isSenderWithVerification(sender)) continue;
            await sender.sendVerificationEmail(to, code, verifyUrl, theme);
            return;
        }
        throw new Error("smtp_unavailable");
    }

    async queueVerificationEmail(
        to: string,
        code: string,
        verifyUrl?: string,
        theme?: string,
    ): Promise<NotificationSenderQueueEntry> {
        for (const [id, sender] of this.senders.entries()) {
            if (this.disabledSenders.has(id)) continue;
            if (!isSenderWithVerification(sender)) continue;
            if (typeof sender.queueVerificationEmail === "function") {
                return sender.queueVerificationEmail(to, code, verifyUrl, theme);
            }
            await sender.sendVerificationEmail(to, code, verifyUrl, theme);
            return {
                notificationId: "",
                status: "sent",
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                recipientEmail: to,
            };
        }
        throw new Error("smtp_unavailable");
    }

    canSendRegistrationInviteEmail(): boolean {
        for (const [id, sender] of this.senders.entries()) {
            if (this.disabledSenders.has(id)) continue;
            if (!isSenderWithRegistrationInvite(sender)) continue;
            if (typeof sender.isConfigured === "function")
                return sender.isConfigured();
            return true;
        }
        return false;
    }

    async sendRegistrationInviteEmail(
        to: string,
        inviterDisplayName: string,
        inviteUrl: string,
        theme?: string,
    ): Promise<void> {
        for (const [id, sender] of this.senders.entries()) {
            if (this.disabledSenders.has(id)) continue;
            if (!isSenderWithRegistrationInvite(sender)) continue;
            await sender.sendRegistrationInviteEmail(
                to,
                inviterDisplayName,
                inviteUrl,
                theme,
            );
            return;
        }
        throw new Error("smtp_unavailable");
    }

    canSendOneTimeLoginEmail(): boolean {
        for (const [id, sender] of this.senders.entries()) {
            if (this.disabledSenders.has(id)) continue;
            if (!isSenderWithOneTimeLogin(sender)) continue;
            if (typeof sender.isConfigured === "function")
                return sender.isConfigured();
            return true;
        }
        return false;
    }

    async sendOneTimeLoginEmail(
        to: string,
        loginUrl: string,
        options?: {
            theme?: string;
            subject?: string;
            body?: string;
            actionLabel?: string;
        },
    ): Promise<void> {
        for (const [id, sender] of this.senders.entries()) {
            if (this.disabledSenders.has(id)) continue;
            if (!isSenderWithOneTimeLogin(sender)) continue;
            await sender.sendOneTimeLoginEmail(to, loginUrl, options);
            return;
        }
        throw new Error("smtp_unavailable");
    }

    async discoverSenders(adaptersRoot: string): Promise<void> {
        let entries: string[];
        try {
            entries = await readdir(adaptersRoot);
        } catch {
            return;
        }

        for (const entry of entries) {
            const pkgPath = path.join(adaptersRoot, entry, "package.json");
            try {
                const raw = await readFile(pkgPath, "utf8");
                const pkg = JSON.parse(raw) as { main?: string };
                if (!pkg.main) continue;

                let requires: string[] | undefined;
                try {
                    const manifestRaw = await readFile(
                        path.join(adaptersRoot, entry, "manifest.json"),
                        "utf8",
                    );
                    const manifest = JSON.parse(manifestRaw) as {
                        requires?: string[];
                    };
                    if (Array.isArray(manifest.requires)) {
                        requires = manifest.requires;
                    }
                } catch {
                    // No manifest — adapter has no declared dependencies
                }

                const entryPath = path.resolve(adaptersRoot, entry, pkg.main);
                const mod = await import(entryPath);

                if (typeof mod.createNotificationSender === "function") {
                    const factory = mod.createNotificationSender as (
                        env: Record<string, string | undefined>,
                    ) => NotificationSender | null;
                    const sender = factory(
                        process.env as Record<string, string | undefined>,
                    );
                    if (sender) {
                        this.registerSender(sender, requires);
                    }
                }
            } catch {
                // Adapter could not be loaded — skip silently
            }
        }
    }

    async bootstrapAdapters(
        adaptersRoot: string,
        ctx: NotifyAdapterBootstrapCtx,
    ): Promise<void> {
        let entries: string[];
        try {
            entries = await readdir(adaptersRoot);
        } catch {
            return;
        }

        for (const entry of entries) {
            const pkgPath = path.join(adaptersRoot, entry, "package.json");

            // Resolve the adapter module, skipping silently if the directory does
            // not contain a valid package.json or its main entry cannot be imported.
            let mod: Record<string, unknown>;
            try {
                const raw = await readFile(pkgPath, "utf8");
                const pkg = JSON.parse(raw) as { main?: string };
                if (!pkg.main) continue;

                const entryPath = path.resolve(adaptersRoot, entry, pkg.main);
                // The import path must be stable (no cache-busting query string) so that
                // the ESM module cache is shared between discoverSenders() and
                // bootstrapAdapters(). Using the same module instance ensures the
                // module-level activeStore set during bootstrap is the same one used by
                // the sender registered in discoverSenders().
                mod = await import(entryPath);
            } catch {
                continue;
            }

            if (typeof mod.bootstrapNotifyAdapter === "function") {
                const bootstrap = mod.bootstrapNotifyAdapter as (
                    ctx: NotifyAdapterBootstrapCtx,
                ) => Promise<void> | void;
                // Let bootstrap errors propagate. Adapters may throw deliberately
                // to signal fatal startup conditions (e.g. missing DATA_ENCRYPTION_KEY
                // in production) that must not be silently swallowed.
                await bootstrap(ctx);
            }
        }
    }

    async dispatch(
        envelope: NotificationEnvelope,
    ): Promise<NotificationDispatchResult> {
        const prefSenderIds = await this.prefStore.getSenderIds(
            envelope.recipientUsername,
            envelope.category,
        );
        const effectiveSenderIds = new Set([
            ...prefSenderIds,
            ...this.alwaysOnSenders,
        ]);
        const dispatched: string[] = [];
        const notifications: NotificationDispatchReceipt[] = [];
        const errors: NotificationDispatchError[] = [];

        const recipientEmail =
            envelope.recipientEmail ??
            (this.emailStore
                ? ((await this.emailStore.getPrimaryEmail(
                      envelope.recipientUsername,
                  )) ?? undefined)
                : undefined);

        const resolvedEnvelope: NotificationEnvelope = recipientEmail
            ? { ...envelope, recipientEmail }
            : envelope;

        for (const id of effectiveSenderIds) {
            if (this.disabledSenders.has(id)) continue;
            const sender = this.senders.get(id);
            if (!sender) continue;
            try {
                if (isSenderWithTrackedSend(sender)) {
                    const receipt = await sender.sendTracked(resolvedEnvelope);
                    notifications.push({
                        senderId: id,
                        notificationId: receipt.notificationId,
                    });
                } else {
                    await sender.send(resolvedEnvelope);
                }
                dispatched.push(id);
            } catch (err) {
                errors.push({
                    senderId: id,
                    error: err instanceof Error ? err.message : String(err),
                });
            }
        }

        return {
            dispatched,
            ...(notifications.length > 0 ? { notifications } : {}),
            ...(errors.length > 0 ? { errors } : {}),
        };
    }
}
