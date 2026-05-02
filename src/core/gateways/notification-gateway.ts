export interface NotificationEnvelope {
  category: string;
  recipientUsername: string;
  recipientEmail?: string;
  subject: string;
  body: string;
  metadata?: Record<string, unknown>;
}

export interface NotificationSender {
  readonly senderId: string;
  send(envelope: NotificationEnvelope): Promise<void>;
}

export interface NotificationGateway {
  registerSender(sender: NotificationSender): void;
  dispatch(envelope: NotificationEnvelope): Promise<{ dispatched: string[] }>;
}
