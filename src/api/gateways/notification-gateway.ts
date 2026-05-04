import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import type {
  NotificationCategory,
  NotificationEnvelope,
  NotificationGateway,
  NotificationSender,
  NotificationSenderInfo,
} from '@cognis/core';

export interface NotificationPreferenceStore {
  getSenderIds(recipientUsername: string, category: string): Promise<string[]>;
}

export interface NotificationConfigStore {
  getConfig(senderId: string): Promise<Record<string, unknown> | null>;
  saveConfig(senderId: string, config: Record<string, unknown>): Promise<void>;
}

export interface NotificationEmailStore {
  getPrimaryEmail(accountId: string): Promise<string | null>;
}

export class VolatileNotificationPreferenceStore implements NotificationPreferenceStore {
  private readonly prefs = new Map<string, string[]>();

  set(recipientUsername: string, category: string, senderIds: string[]): void {
    this.prefs.set(`${recipientUsername}:${category}`, senderIds);
  }

  async getSenderIds(recipientUsername: string, category: string): Promise<string[]> {
    return this.prefs.get(`${recipientUsername}:${category}`) ?? [];
  }
}

export class CoreNotificationGateway implements NotificationGateway {
  private readonly senders = new Map<string, NotificationSender>();
  private readonly categories = new Map<string, string>();

  constructor(
    private readonly prefStore: NotificationPreferenceStore,
    private readonly configStore?: NotificationConfigStore,
    private readonly emailStore?: NotificationEmailStore,
  ) {}

  registerSender(sender: NotificationSender): void {
    this.senders.set(sender.senderId, sender);
  }

  registerCategory(id: string, label: string): void {
    this.categories.set(id, label);
  }

  listSenders(): NotificationSenderInfo[] {
    return Array.from(this.senders.values()).map((sender) => ({
      senderId: sender.senderId,
      name: sender.senderName ?? sender.senderId,
      active: typeof sender.isConfigured === 'function'
        ? sender.isConfigured()
        : typeof sender.getConfig === 'function',
    }));
  }

  listCategories(): NotificationCategory[] {
    return Array.from(this.categories.entries()).map(([id, label]) => ({ id, label }));
  }

  getProviderConfig(senderId: string): Record<string, unknown> | null {
    const sender = this.senders.get(senderId);
    if (!sender || typeof sender.getConfig !== 'function') return null;
    return sender.getConfig();
  }

  getProviderEnvValues(senderId: string): Record<string, string | undefined> | null {
    const sender = this.senders.get(senderId);
    if (!sender || typeof sender.getEnvValues !== 'function') return null;
    return sender.getEnvValues();
  }

  getProviderRequiredFields(senderId: string): string[] | null {
    const sender = this.senders.get(senderId);
    if (!sender || typeof sender.getRequiredFields !== 'function') return null;
    return sender.getRequiredFields();
  }

  async saveProviderConfig(senderId: string, config: Record<string, unknown>): Promise<void> {
    const sender = this.senders.get(senderId);
    if (sender && typeof sender.setConfig === 'function') {
      sender.setConfig(config);
    }
    await this.configStore?.saveConfig(senderId, config);
  }

  async loadPersistedConfigs(): Promise<void> {
    if (!this.configStore) return;
    for (const sender of this.senders.values()) {
      if (typeof sender.setConfig !== 'function') continue;
      const config = await this.configStore.getConfig(sender.senderId);
      if (config) sender.setConfig(config);
    }
  }

  getSender(senderId: string): NotificationSender | undefined {
    return this.senders.get(senderId);
  }

  async discoverSenders(adaptersRoot: string): Promise<void> {
    let entries: string[];
    try {
      entries = await readdir(adaptersRoot);
    } catch {
      return;
    }

    for (const entry of entries) {
      const pkgPath = path.join(adaptersRoot, entry, 'package.json');
      try {
        const raw = await readFile(pkgPath, 'utf8');
        const pkg = JSON.parse(raw) as { main?: string };
        if (!pkg.main) continue;

        const entryPath = path.resolve(adaptersRoot, entry, pkg.main);
        const mod = await import(`${entryPath}?t=${Date.now()}`);

        if (typeof mod.createNotificationSender === 'function') {
          const factory = mod.createNotificationSender as (env: Record<string, string | undefined>) => NotificationSender | null;
          const sender = factory(process.env as Record<string, string | undefined>);
          if (sender) {
            this.registerSender(sender);
          }
        }
      } catch {
        // Adapter could not be loaded — skip silently
      }
    }
  }

  async dispatch(envelope: NotificationEnvelope): Promise<{ dispatched: string[] }> {
    const senderIds = await this.prefStore.getSenderIds(envelope.recipientUsername, envelope.category);
    const dispatched: string[] = [];

    const recipientEmail = envelope.recipientEmail
      ?? (this.emailStore ? await this.emailStore.getPrimaryEmail(envelope.recipientUsername) ?? undefined : undefined);

    const resolvedEnvelope: NotificationEnvelope = recipientEmail
      ? { ...envelope, recipientEmail }
      : envelope;

    for (const id of senderIds) {
      const sender = this.senders.get(id);
      if (sender) {
        await sender.send(resolvedEnvelope);
        dispatched.push(id);
      }
    }

    return { dispatched };
  }
}
