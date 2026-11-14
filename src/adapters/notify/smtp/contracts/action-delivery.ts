import type { NotificationDeliveryReceipt } from "../../../../gateways/notify/contracts/sender.js";

/** Public ctx delivery contracts: callers own message construction and local action identifiers. */
export interface NotificationActionMessage {
    subject: string;
    body: string;
    senderName?: string;
    actionUrl?: string;
    actionLabel?: string;
    presentation?: Record<string, unknown>;
}

export type NotificationAction = (
    variables: Record<string, string>,
) => NotificationActionMessage | Promise<NotificationActionMessage>;

export type RegisterNotificationAction = (
    id: string,
    action: NotificationAction,
    options?: { factory?: string; options?: Record<string, unknown> },
) => Promise<string>;

export interface EmailActionInput {
    purpose: string;
    recipientEmail: string;
    variables: Record<string, string>;
    config?: Record<string, unknown>;
}

export type SendEmailAction = (input: EmailActionInput) => Promise<
    NotificationDeliveryReceipt & {
        sent: true;
        notificationId: string;
    }
>;

export interface DeliverEmailInput extends EmailActionInput {
    signal: AbortSignal;
    expiresAt: number;
}

export interface EmailDelivery {
    receipt: NotificationDeliveryReceipt;
    completion: Promise<NotificationDeliveryReceipt>;
}

export type DeliverEmailAction = (
    input: DeliverEmailInput,
) => Promise<EmailDelivery>;
