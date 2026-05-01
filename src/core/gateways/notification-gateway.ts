export interface NotificationMessage {
  channel: 'email';
  recipient: string;
  subject: string;
  body: string;
}

export interface NotificationDeliveryResult {
  delivered: boolean;
  adapter: string;
  detail?: string;
}

export interface NotificationGateway {
  deliver(message: NotificationMessage): Promise<NotificationDeliveryResult>;
}
