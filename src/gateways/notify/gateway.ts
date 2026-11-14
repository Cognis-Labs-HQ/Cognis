import type { BootstrapLog } from "@cognis/core";
import { bootstrapAdapter } from "../reuse/adapter-bootstrap.js";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import {
    resolveComponentEnabledState,
    requireBootstrapScope,
    type BootstrapDisposer,
    type CapabilityStore,
} from "@cognis/core";

export type {
    NotifyAdapterBootstrapCtx,
    NotificationEnvelope,
    NotificationCategory,
    NotificationSenderInfo,
    NotificationQueueStatus,
    NotificationSenderQueueEntry,
    NotificationQueueEntry,
    NotificationDispatchError,
    NotificationDispatchReceipt,
    NotificationDispatchResult,
    NotificationChannelRegistration,
    NotificationSender,
} from "./contracts/sender.js";

import type {
    NotifyAdapterBootstrapCtx,
    NotificationEnvelope,
    NotificationCategory,
    NotificationSenderInfo,
    NotificationQueueStatus,
    NotificationSenderQueueEntry,
    NotificationQueueEntry,
    NotificationDispatchError,
    NotificationDispatchReceipt,
    NotificationDispatchResult,
    NotificationChannelRegistration,
    NotificationSender,
} from "./contracts/sender.js";

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

function isSenderWithTrackedSend(sender: {
    sendTracked?: unknown;
}): sender is SenderWithTrackedSend {
    return typeof sender.sendTracked === "function";
}

function isSenderWithQueueList(
    sender: NotificationSender,
): sender is NotificationSender & SenderWithQueueList {
    return typeof sender.listQueue === "function";
}

function isSenderWithQueueItem(
    sender: NotificationSender,
): sender is NotificationSender & SenderWithQueueItem {
    return typeof sender.getQueueItem === "function";
}

export class CoreNotificationGateway implements NotificationGateway {
    private readonly adapterSenders = new Map<string, NotificationSender>();
    private readonly senders = new Map<string, NotificationSender>();
    private readonly channelRegistrations = new Map<
        string,
        {
            owners: Set<string>;
            queues: Map<string, NotificationChannelRegistration>;
        }
    >();
    private readonly categories = new Map<string, string>();
    private readonly disabledSenders = new Set<string>();
    private readonly configurationFailures = new Set<string>();
    private readonly configurationTransactions = new Map<
        string,
        Promise<void>
    >();
    private readonly senderRequires = new Map<string, string[]>();
    private readonly alwaysOnSenders = new Set<string>();
    private readonly senderEnabledChangeListeners = new Map<
        string,
        (senderId: string, enabled: boolean) => Promise<void> | void
    >();
    private readonly senderConfigChangeListeners = new Map<
        string,
        (
            senderId: string,
            config: Record<string, unknown>,
        ) => Promise<void> | void
    >();

    constructor(
        private readonly prefStore: NotificationPreferenceStore,
        private readonly configStore?: NotificationConfigStore,
        private readonly emailStore?: NotificationEmailStore,
        private readonly log?: BootstrapLog,
    ) {}

    registerAlwaysOnSender(senderId: string): void {
        this.alwaysOnSenders.add(senderId);
    }

    isAlwaysOn(senderId: string): boolean {
        return this.alwaysOnSenders.has(senderId);
    }

    registerSender(sender: NotificationSender, requires?: string[]): void {
        const previous = this.senders.get(sender.senderId);
        if (
            previous &&
            previous !== sender &&
            this.configurationTransactions.has(sender.senderId)
        ) {
            throw new Error("notification_configuration_in_progress");
        }
        this.senders.set(sender.senderId, sender);
        if (requires && requires.length > 0) {
            this.senderRequires.set(sender.senderId, requires);
        }
    }

    registerCategory(id: string, label: string): void {
        const scopedSenders = [...this.senders.values()].filter(
            (sender) => sender.registerChannel,
        );
        if (!scopedSenders.length) {
            this.categories.set(id, label);
            return;
        }
        const scope = requireBootstrapScope();
        let registration = this.channelRegistrations.get(id);
        if (registration && !registration.owners.size) {
            registration.queues = new Map(
                scopedSenders.map((sender) => [
                    sender.senderId,
                    sender.registerChannel!({ id, label }),
                ]),
            );
        }
        if (!registration) {
            registration = {
                owners: new Set(),
                queues: new Map(
                    scopedSenders.map((sender) => [
                        sender.senderId,
                        sender.registerChannel!({ id, label }),
                    ]),
                ),
            };
            this.channelRegistrations.set(id, registration);
        }
        if (registration.owners.has(scope.owner)) return;
        let owned = registration;
        owned.owners.add(scope.owner);
        this.categories.set(id, label);
        const dispose: BootstrapDisposer = async () => {
            if (!owned.owners.delete(scope.owner) || owned.owners.size) return;
            this.categories.delete(id);
            this.channelRegistrations.delete(id);
            for (const cleanup of owned.queues.values()) await cleanup();
        };
        dispose.reactivate = async () => {
            const active = this.channelRegistrations.get(id);
            if (active) owned = active;
            else {
                for (const cleanup of owned.queues.values())
                    await cleanup.reactivate?.();
                this.channelRegistrations.set(id, owned);
            }
            owned.owners.add(scope.owner);
            this.categories.set(id, label);
        };
        scope.registerDisposer(dispose);
    }

    listSenders(): NotificationSenderInfo[] {
        return Array.from(this.senders.values()).map((sender) => {
            const requires = this.senderRequires.get(sender.senderId);
            const alwaysOn = this.alwaysOnSenders.has(sender.senderId);
            return {
                senderId: sender.senderId,
                name: sender.senderName ?? sender.senderId,
                ...(sender.version ? { version: sender.version } : {}),
                ...(sender.publisher ? { publisher: sender.publisher } : {}),
                active:
                    !this.disabledSenders.has(sender.senderId) &&
                    (typeof sender.isConfigured === "function"
                        ? sender.isConfigured()
                        : typeof sender.getConfig === "function"),
                supportsTest: typeof sender.test === "function",
                requiresVerifiedEmail: sender.requiresVerifiedEmail === true,
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

    private async runSenderConfigurationTransaction<Result>(
        senderId: string,
        operation: (sender: NotificationSender) => Promise<Result>,
    ): Promise<Result> {
        const sender = this.senders.get(senderId);
        if (!sender) throw new Error("notification_sender_unavailable");
        const previous = this.configurationTransactions.get(senderId);
        let release!: () => void;
        const pending = new Promise<void>((resolve) => {
            release = resolve;
        });
        this.configurationTransactions.set(senderId, pending);
        await previous;
        try {
            return await operation(sender);
        } finally {
            if (this.configurationTransactions.get(senderId) === pending) {
                this.configurationTransactions.delete(senderId);
            }
            release();
        }
    }

    private async persistProviderConfig(
        sender: NotificationSender,
        config: Record<string, unknown>,
        updateSettings = true,
    ): Promise<{
        config: Record<string, unknown>;
        enabled: boolean;
        enabledChanged: boolean;
    }> {
        const senderId = sender.senderId;
        const { enabled, ...senderConfig } = config;
        const wasEnabled = this.isSenderEnabled(senderId);
        const isEnabled = resolveComponentEnabledState({
            persistedEnabled: enabled,
            defaultEnabled: wasEnabled,
            locked: this.alwaysOnSenders.has(senderId),
        });
        const log = this.log;
        let normalizedConfig: Record<string, unknown>;
        let previousConfig: Record<string, unknown> | null | undefined;
        let persistConfig: Record<string, unknown>;
        try {
            normalizedConfig = updateSettings
                ? (sender.normalizeConfig?.(senderConfig) ?? senderConfig)
                : senderConfig;
            const update = { ...normalizedConfig };
            if (update.password === "") delete update.password;
            previousConfig = await this.configStore?.getConfig(senderId);
            persistConfig = {
                ...previousConfig,
                ...update,
                enabled: isEnabled,
            };
            await this.configStore?.saveConfig(senderId, persistConfig);
        } catch (error) {
            log?.(
                "error",
                "Notification provider configuration could not be saved.",
                {
                    component: "notify-gateway",
                    operation: "saveProviderConfig",
                    senderId,
                    errorName:
                        error instanceof Error ? error.name : "UnknownError",
                },
            );
            throw error;
        }
        try {
            if (updateSettings) sender.setConfig?.(normalizedConfig);
            sender?.setDeliveryEnabled?.(isEnabled);
        } catch (error) {
            this.disabledSenders.add(senderId);
            this.configurationFailures.add(senderId);
            log?.(
                "error",
                "Notification provider configuration could not be applied.",
                {
                    component: "notify-gateway",
                    operation: "saveProviderConfig",
                    senderId,
                    errorName:
                        error instanceof Error ? error.name : "UnknownError",
                },
            );
            try {
                sender?.setDeliveryEnabled?.(false);
            } finally {
                await this.configStore?.saveConfig(senderId, {
                    ...previousConfig,
                    enabled: false,
                });
            }
            throw new Error("notification_configuration_failed");
        }
        if (!isEnabled) {
            this.disabledSenders.add(senderId);
        } else {
            this.disabledSenders.delete(senderId);
        }
        if (updateSettings) this.configurationFailures.delete(senderId);
        log?.("info", "Notification provider configuration saved.", {
            component: "notify-gateway",
            operation: "saveProviderConfig",
            senderId,
        });
        const secretFields = new Set(
            updateSettings
                ? [
                      ...(sender.getConfigSchema?.() ?? [])
                          .filter((field) => field.type === "password")
                          .map((field) => field.key),
                      ...(sender.getConfiguredSecretFields?.() ?? []),
                  ]
                : [],
        );
        const publicConfig = Object.fromEntries(
            Object.entries(normalizedConfig).filter(
                ([field]) => !secretFields.has(field),
            ),
        );
        return {
            config: { ...publicConfig, enabled: isEnabled },
            enabled: isEnabled,
            enabledChanged: wasEnabled !== isEnabled,
        };
    }

    async saveProviderConfig(
        senderId: string,
        config: Record<string, unknown>,
    ): Promise<void> {
        const submitted = { ...config };
        const change = await this.runSenderConfigurationTransaction(
            senderId,
            (sender) => this.persistProviderConfig(sender, submitted),
        );
        await this.notifySenderConfigChange(senderId, change.config);
        if (change.enabledChanged) {
            await this.notifySenderEnabledChange(senderId, change.enabled);
        }
    }

    async updateProviderConfig(
        senderId: string,
        patch: Record<string, unknown>,
    ): Promise<void> {
        const submitted = { ...patch };
        const change = await this.runSenderConfigurationTransaction(
            senderId,
            async (sender) => {
                const existing = sender.getConfig?.();
                if (!existing) return null;
                return this.persistProviderConfig(sender, {
                    ...existing,
                    ...submitted,
                    enabled: this.isSenderEnabled(senderId),
                });
            },
        );
        if (!change) return;
        await this.notifySenderConfigChange(senderId, change.config);
        if (change.enabledChanged) {
            await this.notifySenderEnabledChange(senderId, change.enabled);
        }
    }

    async loadPersistedConfigs(): Promise<void> {
        if (!this.configStore) return;
        for (const senderId of this.senders.keys()) {
            await this.runSenderConfigurationTransaction(
                senderId,
                async (sender) => {
                    const config = await this.configStore!.getConfig(senderId);
                    if (!config) return;
                    if (
                        !resolveComponentEnabledState({
                            persistedEnabled: config.enabled,
                            defaultEnabled: true,
                            locked: this.alwaysOnSenders.has(senderId),
                        })
                    ) {
                        this.disabledSenders.add(senderId);
                    } else {
                        this.disabledSenders.delete(senderId);
                    }
                    sender.setDeliveryEnabled?.(
                        !this.disabledSenders.has(senderId),
                    );
                    if (typeof sender.setConfig === "function") {
                        const { enabled, ...senderConfig } = config;
                        sender.setConfig(senderConfig);
                    }
                },
            );
        }
    }

    async enableSender(senderId: string): Promise<void> {
        const change = await this.runSenderConfigurationTransaction(
            senderId,
            (sender) => {
                if (this.configurationFailures.has(senderId)) {
                    throw new Error("notification_configuration_failed");
                }
                return this.persistProviderConfig(
                    sender,
                    { enabled: true },
                    false,
                );
            },
        );
        if (change.enabledChanged) {
            await this.notifySenderEnabledChange(senderId, change.enabled);
        }
    }

    async disableSender(senderId: string): Promise<void> {
        const change = await this.runSenderConfigurationTransaction(
            senderId,
            (sender) => {
                if (this.alwaysOnSenders.has(senderId)) {
                    throw new Error("adapter_locked");
                }
                return this.persistProviderConfig(
                    sender,
                    { enabled: false },
                    false,
                );
            },
        );
        if (change.enabledChanged) {
            await this.notifySenderEnabledChange(senderId, change.enabled);
        }
    }

    isSenderEnabled(senderId: string): boolean {
        return (
            this.senders.has(senderId) && !this.disabledSenders.has(senderId)
        );
    }

    onSenderEnabledChange(
        listenerId: string,
        listener: (senderId: string, enabled: boolean) => Promise<void> | void,
    ): void {
        this.senderEnabledChangeListeners.set(listenerId, listener);
    }

    onSenderConfigChange(
        listenerId: string,
        listener: (
            senderId: string,
            config: Record<string, unknown>,
        ) => Promise<void> | void,
    ): void {
        this.senderConfigChangeListeners.set(listenerId, listener);
    }

    private async notifySenderConfigChange(
        senderId: string,
        config: Record<string, unknown>,
    ): Promise<void> {
        for (const listener of this.senderConfigChangeListeners.values()) {
            await listener(senderId, config);
        }
    }

    private async notifySenderEnabledChange(
        senderId: string,
        enabled: boolean,
    ): Promise<void> {
        for (const listener of this.senderEnabledChangeListeners.values()) {
            await listener(senderId, enabled);
        }
    }

    getSenderAdminContract(senderId: string): {
        schema: import("./contracts/sender.js").NotificationConfigField[];
        testSchema: import("./contracts/sender.js").NotificationConfigField[];
        stringsBaseUrl?: string;
        configuredSecretFields: string[];
        config: Record<string, unknown>;
        envValues: Record<string, string | undefined>;
        requiredFields: string[];
        supportsTest: boolean;
        locked: boolean;
    } | null {
        const sender = this.senders.get(senderId);
        if (!sender?.getConfig) return null;
        return {
            schema: sender.getConfigSchema?.() ?? [],
            testSchema: sender.getTestSchema?.() ?? [],
            stringsBaseUrl: sender.stringsBaseUrl,
            configuredSecretFields: sender.getConfiguredSecretFields?.() ?? [],
            config: sender.getConfig(),
            envValues: sender.getEnvValues?.() ?? {},
            requiredFields: sender.getRequiredFields?.() ?? [],
            supportsTest: typeof sender.test === "function",
            locked: this.alwaysOnSenders.has(senderId),
        };
    }

    hasSender(senderId: string): boolean {
        return this.senders.has(senderId);
    }

    async testSender(
        senderId: string,
        recipient: string,
        config?: Record<string, unknown>,
    ): Promise<void> {
        const sender = this.senders.get(senderId);
        if (!sender?.test)
            throw new Error("notification_sender_test_unavailable");
        await sender.test(recipient, config);
    }

    async sendWithSender(
        senderId: string,
        envelope: NotificationEnvelope,
    ): Promise<{ sent: true; notificationId?: string }> {
        const sender = this.senders.get(senderId);
        if (!sender) throw new Error("notification_sender_unavailable");
        if (sender.sendTracked) {
            return {
                sent: true,
                ...(await sender.sendTracked(envelope)),
            };
        }
        await sender.send(envelope);
        return { sent: true };
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
                const pkg = JSON.parse(raw) as {
                    main?: string;
                    version?: string;
                };
                if (!pkg.main) continue;

                let requires: string[] | undefined;
                let publisher: string | undefined;
                try {
                    const manifestRaw = await readFile(
                        path.join(adaptersRoot, entry, "manifest.json"),
                        "utf8",
                    );
                    const manifest = JSON.parse(manifestRaw) as {
                        requires?: string[];
                        publisher?: string;
                    };
                    publisher = manifest.publisher;
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
                    if (sender && pkg.version) {
                        Object.assign(sender, { version: pkg.version });
                    }
                    if (sender && publisher) {
                        Object.assign(sender, { publisher });
                    }
                    if (sender) {
                        this.registerSender(sender, requires);
                        this.adapterSenders.set(entry, sender);
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

        const modules = new Map<string, Record<string, unknown>>();
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

            modules.set(entry, mod);
        }

        const initialized = new Set<string>();
        for (const sender of this.senders.values()) {
            if (!sender.bootstrap) continue;
            const owner =
                [...this.adapterSenders].find(
                    ([, candidate]) => candidate === sender,
                )?.[0] ?? sender.senderId;
            await bootstrapAdapter(
                "notify",
                owner,
                ctx,
                modules.get(owner) ?? {},
                () => sender.bootstrap!(ctx),
            );
            initialized.add(owner);
        }

        for (const [entry, mod] of modules) {
            if (initialized.has(entry)) continue;
            const ownedSender = this.adapterSenders.get(entry);
            const bootstrap =
                !ownedSender?.bootstrap &&
                typeof mod.bootstrapNotifyAdapter === "function"
                    ? (mod.bootstrapNotifyAdapter as (
                          ctx: NotifyAdapterBootstrapCtx,
                      ) => Promise<void> | void)
                    : undefined;
            if (!bootstrap && mod.defineContracts === undefined) continue;
            await bootstrapAdapter("notify", entry, ctx, mod, async () => {
                await bootstrap?.(ctx);
            });
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
                const delivery =
                    this.channelRegistrations
                        .get(envelope.category)
                        ?.queues.get(id) ?? sender;
                if (isSenderWithTrackedSend(delivery)) {
                    const receipt =
                        await delivery.sendTracked(resolvedEnvelope);
                    notifications.push({
                        senderId: id,
                        notificationId: receipt.notificationId,
                    });
                } else {
                    await delivery.send(resolvedEnvelope);
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
