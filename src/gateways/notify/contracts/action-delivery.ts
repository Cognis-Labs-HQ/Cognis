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
    NotificationActionReceipt & {
        sent: true;
        notificationId: string;
    }
>;

export interface NotificationActionReceipt {
    notificationId: string;
    status: "queued" | "waiting_rate_limit" | "sending" | "sent" | "failed";
    createdAt: string;
    updatedAt: string;
    availableAt?: string;
    error?: string;
    recipientEmail?: string;
    subject?: string;
    purpose?: string;
}
