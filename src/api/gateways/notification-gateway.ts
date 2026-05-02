import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import type { NotificationEnvelope, NotificationGateway, NotificationSender } from '@cognis/core';

export interface NotificationPreferenceStore {
  getSenderIds(recipientUsername: string, category: string): Promise<string[]>;
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

  constructor(private readonly prefStore: NotificationPreferenceStore) {}

  registerSender(sender: NotificationSender): void {
    this.senders.set(sender.senderId, sender);
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
          const sender = (mod.createNotificationSender as (env: Record<string, string | undefined>) => NotificationSender | null)(
            process.env as Record<string, string | undefined>
          );
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

    for (const id of senderIds) {
      const sender = this.senders.get(id);
      if (sender) {
        await sender.send(envelope);
        dispatched.push(id);
      }
    }

    return { dispatched };
  }
}
