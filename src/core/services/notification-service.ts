import type { NotificationDeliveryResult, NotificationMessage } from '../gateways/notification-gateway.js';

export interface NotificationAdapter {
  id: string;
  canDeliver(message: NotificationMessage): boolean;
  deliver(message: NotificationMessage): Promise<NotificationDeliveryResult>;
}

export class NotificationService {
  private adapters: NotificationAdapter[] = [];

  clearAdapters() {
    this.adapters = [];
  }

  registerAdapter(adapter: NotificationAdapter) {
    this.adapters = this.adapters.filter((candidate) => candidate.id !== adapter.id);
    this.adapters.push(adapter);
  }

  async deliver(message: NotificationMessage): Promise<NotificationDeliveryResult> {
    const adapter = this.adapters.find((candidate) => candidate.canDeliver(message));
    if (!adapter) {
      return { delivered: false, adapter: 'none', detail: 'No enabled adapter can deliver this message.' };
    }
    return adapter.deliver(message);
  }
}
