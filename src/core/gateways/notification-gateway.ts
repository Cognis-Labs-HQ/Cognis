export interface NotificationEnvelope {
  category: string;
  recipientUsername: string;
  recipientEmail?: string;
  subject: string;
  body: string;
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
}

export interface NotificationSender {
  readonly senderId: string;
  readonly senderName?: string;
  send(envelope: NotificationEnvelope): Promise<void>;
  getConfig?(): Record<string, unknown>;
  setConfig?(config: Record<string, unknown>): void;
  sendTestEmail?(to: string): Promise<void>;
}

export interface NotificationGateway {
  registerSender(sender: NotificationSender): void;
  dispatch(envelope: NotificationEnvelope): Promise<{ dispatched: string[] }>;
  registerCategory(id: string, label: string): void;
  listSenders(): NotificationSenderInfo[];
  listCategories(): NotificationCategory[];
}
