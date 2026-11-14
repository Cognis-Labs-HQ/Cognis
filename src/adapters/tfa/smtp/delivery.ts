export interface DeliveryReceipt {
    notificationId: string;
    status: "queued" | "waiting_rate_limit" | "sending" | "sent" | "failed";
    createdAt: string;
    updatedAt: string;
    availableAt?: string;
    error?: string;
}

export interface VerificationDelivery {
    receipt: DeliveryReceipt;
    completion: Promise<DeliveryReceipt>;
}

export interface SmtpTfaAdapterContext {
    canSendVerificationEmail?: () => boolean;
    getEmailDeliveryPolicy?: () => {
        minimumIntervalMs: number;
        codeLength: number;
    };
    deliverVerificationEmail?: (
        recipient: string,
        code: string,
        lifetime: { signal: AbortSignal; expiresAt: number },
    ) => Promise<VerificationDelivery>;
    getPrimaryEmail?: (accountId: string) => Promise<string | null>;
    log?: (
        level: string,
        message: string,
        metadata?: Record<string, unknown>,
    ) => void;
}
