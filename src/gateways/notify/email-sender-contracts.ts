import type { NotificationSenderQueueEntry } from "./gateway.js";

export interface VerificationEmailSender {
    canSendVerificationEmail(): boolean;
    queueVerificationEmail?(
        purpose: string,
        to: string,
        code: string,
        verifyUrl?: string,
        theme?: string,
    ): Promise<NotificationSenderQueueEntry>;
    sendVerificationEmail(
        purpose: string,
        to: string,
        code: string,
        verifyUrl?: string,
        theme?: string,
    ): Promise<void>;
}

export interface OneTimeLoginEmailSender {
    canSendOneTimeLoginEmail(): boolean;
    sendOneTimeLoginEmail(
        purpose: string,
        to: string,
        loginUrl: string,
        options?: {
            theme?: string;
            subject?: string;
            body?: string;
            actionLabel?: string;
        },
    ): Promise<void>;
}

export interface RegistrationInviteEmailSender {
    canSendRegistrationInviteEmail(): boolean;
    sendRegistrationInviteEmail(
        purpose: string,
        to: string,
        inviterDisplayName: string,
        inviteUrl: string,
        theme?: string,
    ): Promise<void>;
}

export type SenderWithVerification = Omit<
    VerificationEmailSender,
    "canSendVerificationEmail"
> & { isConfigured?(): boolean };
export type SenderWithRegistrationInvite = Omit<
    RegistrationInviteEmailSender,
    "canSendRegistrationInviteEmail"
> & { isConfigured?(): boolean };
export type SenderWithOneTimeLogin = Omit<
    OneTimeLoginEmailSender,
    "canSendOneTimeLoginEmail"
> & { isConfigured?(): boolean };
