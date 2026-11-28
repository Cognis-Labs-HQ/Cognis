import { clampVerificationCodeLength } from "../../../gateways/reuse/verification-codes.js";
import { bootstrapNotifyAdapter } from "./bootstrap.js";

import type {
    NotifyAdapterBootstrapCtx,
    NotificationCategory,
    NotificationChannelRegistration,
} from "../../../gateways/notify/contracts/sender.js";

import type {
    EmailActionInput,
    NotificationActionMessage,
} from "./contracts/action-delivery.js";
import type { BootstrapDisposer } from "@cognis/core";
import { requireBootstrapScope } from "@cognis/core";
import { openSession, upgradeToTls } from "./smtp-session.js";
import { randomUUID } from "node:crypto";

import type {
    NotificationEnvelope,
    NotificationSender,
    NotificationSenderQueueEntry,
} from "../../../gateways/notify/contracts/sender.js";
import { renderEmailLayout } from "./email-layout.js";
import type { EmailPresentation } from "./email-templates.js";
import {
    encodeHeaderPhrase,
    foldHeader,
    formatAddressHeader,
    makeMessageId,
    sanitizeHeader,
    sanitizeSmtpPath,
} from "./message-headers.js";
import {
    buildAttachmentMimeParts,
    type MimeAttachment,
} from "./mime-attachments.js";
import { dotStuff, isTemporaryCode, stripHtmlTags } from "./mime-utils.js";
import {
    SmtpNotificationQueue,
    SmtpRateLimiter,
} from "./notification-queue.js";
import { EMAIL_DELIVERY_RATE_LIMIT_MILLISECONDS } from "./rate-limit.js";

export interface SmtpConfig {
    host: string;
    port: number;
    from: string;
    senderName?: string;
    user?: string;
    password?: string;
    secure: "none" | "tls" | "starttls";
    allowSelfSigned?: boolean;
    authDisabled?: boolean;
    ehloHostname?: string;
    greylistRetries?: number;
    greylistRetryDelayMs?: number;
    externalHost?: string;
    codeLength?: number;
}
export class SmtpTemporaryError extends Error {
    constructor(message: string) {
        super(message);
        this.name = "SmtpTemporaryError";
    }
}
const MAX_QP_LINE_LENGTH = 76;
function normalizeNewlines(value: string): string {
    return value.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
}

function encodeQuotedPrintable(input: string): string {
    const normalized = normalizeNewlines(input);
    const encodedLines = normalized.split("\n").map((line) => {
        let encoded = "";
        for (const byte of Buffer.from(line, "utf8")) {
            if (
                byte === 9 ||
                (byte >= 32 && byte <= 60) ||
                (byte >= 62 && byte <= 126)
            ) {
                encoded += String.fromCharCode(byte);
            } else {
                encoded += `=${byte.toString(16).toUpperCase().padStart(2, "0")}`;
            }
        }
        return encoded.replace(
            /[ \t]$/g,
            (character) =>
                `=${character.charCodeAt(0).toString(16).toUpperCase().padStart(2, "0")}`,
        );
    });

    const wrapped: string[] = [];
    for (const encodedLine of encodedLines) {
        let remaining = encodedLine;
        while (remaining.length > MAX_QP_LINE_LENGTH) {
            let take = MAX_QP_LINE_LENGTH - 1;
            while (take > 0 && remaining[take - 1] === "=") take--;
            if (take > 1 && remaining[take - 2] === "=") take -= 2;
            wrapped.push(`${remaining.slice(0, take)}=`);
            remaining = remaining.slice(take);
        }
        wrapped.push(remaining);
    }
    return wrapped.join("\r\n");
}

async function buildMessage(
    from: string,
    recipient: string,
    subject: string,
    body: string,
    options: {
        theme?: string;
        presentation?: EmailPresentation;
        externalHost?: string;
        verifyUrl?: string;
        verifyButtonLabel?: string;
        senderName?: string;
        messageIdDomain?: string;
        attachments?: MimeAttachment[];
    } = {},
): Promise<string> {
    const { htmlBody, textBody } = await renderEmailLayout(
        subject,
        body,
        options,
    );
    const boundary = `cognis-${randomUUID()}`;
    const hasAttachments =
        Array.isArray(options.attachments) && options.attachments.length > 0;
    const mixedBoundary = hasAttachments ? `cognis-mixed-${randomUUID()}` : "";
    const headers = [
        foldHeader("From", formatAddressHeader(from, options.senderName)),
        foldHeader("To", formatAddressHeader(recipient)),
        foldHeader("Subject", encodeHeaderPhrase(subject)),
        `Date: ${new Date().toUTCString()}`,
        `Message-ID: ${makeMessageId(from, options.messageIdDomain ?? options.externalHost)}`,
        "MIME-Version: 1.0",
        "Auto-Submitted: auto-generated",
        "X-Auto-Response-Suppress: All",
        foldHeader(
            "Content-Type",
            hasAttachments
                ? `multipart/mixed; boundary="${mixedBoundary}"`
                : `multipart/alternative; boundary="${boundary}"`,
        ),
    ];

    const alternativeBody = [
        `--${boundary}`,
        "Content-Type: text/plain; charset=UTF-8",
        "Content-Transfer-Encoding: quoted-printable",
        "",
        encodeQuotedPrintable(textBody),
        `--${boundary}`,
        "Content-Type: text/html; charset=UTF-8",
        "Content-Transfer-Encoding: quoted-printable",
        "",
        encodeQuotedPrintable(htmlBody),
        `--${boundary}--`,
    ].join("\r\n");

    const attachmentBody = hasAttachments
        ? buildAttachmentMimeParts(
              (options.attachments ?? []) as MimeAttachment[],
              mixedBoundary,
          )
        : "";

    const mimeBody = hasAttachments
        ? [
              `--${mixedBoundary}`,
              foldHeader(
                  "Content-Type",
                  `multipart/alternative; boundary=\"${boundary}\"`,
              ),
              "",
              alternativeBody,
              attachmentBody,
              `--${mixedBoundary}--`,
              "",
          ].join("\r\n")
        : [alternativeBody, ""].join("\r\n");

    return `${dotStuff(`${headers.join("\r\n")}\r\n\r\n${mimeBody}`)}\r\n.\r\n`;
}

async function sendMail(
    config: SmtpConfig,
    recipient: string,
    subject: string,
    body: string,
    theme?: string,
    verifyUrl?: string,
    verifyButtonLabel?: string,
    attachments?: MimeAttachment[],
    signal?: AbortSignal,
    presentation?: EmailPresentation,
): Promise<void> {
    let session = await openSession(
        config.host,
        config.port,
        config.secure,
        config.allowSelfSigned,
        signal,
    );

    try {
        const greeting = await session.read();
        if (greeting.code !== 220) {
            const message = `smtp_unexpected_greeting:${greeting.code}`;
            throw isTemporaryCode(greeting.code)
                ? new SmtpTemporaryError(message)
                : new Error(message);
        }

        const ehloHostname = sanitizeHeader(config.ehloHostname ?? "localhost");
        let ehlo = await session.cmd(`EHLO ${ehloHostname || "localhost"}`);
        if (ehlo.code !== 250) {
            throw new Error(`smtp_ehlo_failed:${ehlo.code}`);
        }

        if (config.secure === "starttls") {
            const starttls = await session.cmd("STARTTLS");
            if (starttls.code !== 220) {
                throw new Error(`smtp_starttls_failed:${starttls.code}`);
            }
            session = await upgradeToTls(
                session,
                config.host,
                config.allowSelfSigned,
                signal,
            );
            ehlo = await session.cmd(`EHLO ${ehloHostname || "localhost"}`);
            if (ehlo.code !== 250) {
                throw new Error(`smtp_ehlo_after_tls_failed:${ehlo.code}`);
            }
        }

        if (!config.authDisabled && config.user && config.password) {
            // SASL PLAIN format: \0authcid\0password (RFC 4616)
            const credentials = Buffer.from(
                `\0${config.user}\0${config.password}`,
            ).toString("base64");
            const auth = await session.cmd(`AUTH PLAIN ${credentials}`);
            if (auth.code !== 235) {
                throw new Error(`smtp_auth_failed:${auth.code}`);
            }
        }

        const mailFromAddress = sanitizeSmtpPath(config.from);
        const recipientAddress = sanitizeSmtpPath(recipient);
        const mailFrom = await session.cmd(`MAIL FROM:<${mailFromAddress}>`);
        if (mailFrom.code !== 250) {
            const message = `smtp_mail_from_failed:${mailFrom.code}`;
            throw isTemporaryCode(mailFrom.code)
                ? new SmtpTemporaryError(message)
                : new Error(message);
        }

        const rcptTo = await session.cmd(`RCPT TO:<${recipientAddress}>`);
        if (rcptTo.code !== 250 && rcptTo.code !== 251) {
            const message = `smtp_rcpt_to_failed:${rcptTo.code}`;
            throw isTemporaryCode(rcptTo.code)
                ? new SmtpTemporaryError(message)
                : new Error(message);
        }

        const dataCommand = await session.cmd("DATA");
        if (dataCommand.code !== 354) {
            const message = `smtp_data_cmd_failed:${dataCommand.code}`;
            throw isTemporaryCode(dataCommand.code)
                ? new SmtpTemporaryError(message)
                : new Error(message);
        }

        session.writeRaw(
            await buildMessage(config.from, recipient, subject, body, {
                theme,
                presentation,
                externalHost: config.externalHost,
                verifyUrl,
                verifyButtonLabel,
                senderName: config.senderName,
                messageIdDomain: config.ehloHostname ?? config.host,
                attachments,
            }),
        );
        const sent = await session.read();
        if (sent.code !== 250) {
            const message = `smtp_message_rejected:${sent.code}`;
            throw isTemporaryCode(sent.code)
                ? new SmtpTemporaryError(message)
                : new Error(message);
        }

        await session.cmd("QUIT");
    } finally {
        session.destroy();
    }
}

const DEFAULT_GREYLIST_RETRIES = 2;
const DEFAULT_GREYLIST_RETRY_DELAY_MILLISECONDS = 5 * 60 * 1000;

async function waitForRetry(
    sleep: (milliseconds: number) => Promise<void>,
    delay: number,
    signal?: AbortSignal,
): Promise<void> {
    if (!signal) return sleep(delay);
    signal.throwIfAborted();
    let rejectAbort!: () => void;
    const aborted = new Promise<never>((_resolve, reject) => {
        rejectAbort = () => reject(signal.reason);
        signal.addEventListener("abort", rejectAbort, { once: true });
    });
    try {
        await Promise.race([sleep(delay), aborted]);
    } finally {
        signal.removeEventListener("abort", rejectAbort);
    }
}

async function sendMailWithRetry(
    config: SmtpConfig,
    recipient: string,
    subject: string,
    body: string,
    sleep: (milliseconds: number) => Promise<void>,
    theme?: string,
    verifyUrl?: string,
    verifyButtonLabel?: string,
    attachments?: MimeAttachment[],
    signal?: AbortSignal,
    presentation?: EmailPresentation,
): Promise<void> {
    const maxRetries = config.greylistRetries ?? DEFAULT_GREYLIST_RETRIES;
    const delayMilliseconds =
        config.greylistRetryDelayMs ??
        DEFAULT_GREYLIST_RETRY_DELAY_MILLISECONDS;

    let lastError: unknown;
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
        if (attempt > 0) {
            await waitForRetry(sleep, delayMilliseconds, signal);
        }
        signal?.throwIfAborted();
        try {
            await sendMail(
                config,
                recipient,
                subject,
                body,
                theme,
                verifyUrl,
                verifyButtonLabel,
                attachments,
                signal,
                presentation,
            );
            return;
        } catch (error) {
            signal?.throwIfAborted();
            if (error instanceof SmtpTemporaryError && attempt < maxRetries) {
                lastError = error;
                continue;
            }
            throw error;
        }
    }
    throw lastError;
}

export class SmtpNotificationSender implements NotificationSender {
    readonly senderId = "smtp";
    readonly requiresVerifiedEmail = true;
    readonly senderName = "SMTP Email";

    private readonly environmentSnapshot: Record<string, string | undefined>;
    private readonly sleep: (milliseconds: number) => Promise<void>;
    private deliveryEnabled = true;
    private recipientTheme: (email: string) => Promise<"light" | "dark"> =
        async () => "light";

    setRecipientThemeResolver(
        resolve: (email: string) => Promise<"light" | "dark">,
    ): void {
        this.recipientTheme = resolve;
    }

    async getRecipientTheme(email: string): Promise<"light" | "dark"> {
        return (await this.recipientTheme(email)) === "dark" ? "dark" : "light";
    }

    private readonly purposeActivations = new Map<
        string,
        { activate(): void; suspend(): void; diagnostic: boolean }
    >();
    private readonly queues = new Map<string, SmtpNotificationQueue>();
    private readonly createRateLimiter: () => SmtpRateLimiter;

    constructor(
        private config: SmtpConfig,
        environmentSnapshot?: Record<string, string | undefined>,
        sleep?: (milliseconds: number) => Promise<void>,
        createRateLimiter?: () => SmtpRateLimiter,
    ) {
        this.environmentSnapshot = environmentSnapshot ?? {};
        this.sleep =
            sleep ??
            ((ms) =>
                new Promise((resolve) => {
                    const timer = setTimeout(resolve, ms);
                    timer.unref();
                }));
        this.createRateLimiter =
            createRateLimiter ??
            (() => new SmtpRateLimiter(EMAIL_DELIVERY_RATE_LIMIT_MILLISECONDS));
    }

    async bootstrap(ctx: NotifyAdapterBootstrapCtx): Promise<void> {
        await bootstrapNotifyAdapter(ctx, this);
    }

    test?: (
        recipient: string,
        config?: Record<string, unknown>,
    ) => Promise<void>;

    registerChannel(
        category: NotificationCategory,
    ): NotificationChannelRegistration {
        const purpose = `channel:${category.id}`;
        return Object.assign(this.registerPurpose(purpose), {
            send: (envelope: NotificationEnvelope) =>
                this.send({ ...envelope, purpose }),
            sendTracked: (envelope: NotificationEnvelope) =>
                this.sendTracked({ ...envelope, purpose }),
        });
    }

    registerPurpose(
        purpose: string,
        { diagnostic = false }: { diagnostic?: boolean } = {},
    ): BootstrapDisposer {
        requireBootstrapScope();
        if (!purpose || this.purposeActivations.has(purpose))
            throw new Error("smtp_purpose_conflict");
        let queue: SmtpNotificationQueue | undefined;
        let controller: AbortController | undefined;
        const activate = () => {
            if (this.queues.has(purpose))
                throw new Error("smtp_purpose_conflict");
            const activeController = new AbortController();
            controller = activeController;
            queue = new SmtpNotificationQueue(
                this.createRateLimiter(),
                this.sleep,
                async (payload) => {
                    await sendMailWithRetry(
                        (payload.config as SmtpConfig | undefined) ??
                            this.config,
                        payload.recipientEmail,
                        payload.subject,
                        payload.body,
                        this.sleep,
                        payload.theme,
                        payload.verifyUrl,
                        payload.verifyButtonLabel,
                        payload.attachments ?? [],
                        activeController.signal,
                        payload.presentation,
                    );
                },
                purpose,
            );
            this.queues.set(purpose, queue);
        };
        const resource = {
            diagnostic,
            activate,
            suspend: () => {
                controller?.abort();
                queue?.close();
                if (this.queues.get(purpose) === queue)
                    this.queues.delete(purpose);
            },
        };
        this.purposeActivations.set(purpose, resource);
        if (this.deliveryEnabled || diagnostic) activate();
        const dispose: BootstrapDisposer = () => {
            resource.suspend();
            if (this.purposeActivations.get(purpose) === resource)
                this.purposeActivations.delete(purpose);
        };
        dispose.reactivate = () => {
            if (this.purposeActivations.has(purpose))
                throw new Error("smtp_purpose_conflict");
            this.purposeActivations.set(purpose, resource);
            if (this.deliveryEnabled || diagnostic) activate();
        };
        return dispose;
    }

    setDeliveryEnabled(enabled: boolean): void {
        if (this.deliveryEnabled === enabled) return;
        this.deliveryEnabled = enabled;
        for (const resource of this.purposeActivations.values()) {
            if (resource.diagnostic) continue;
            if (enabled) resource.activate();
            else resource.suspend();
        }
    }

    async waitForEmail(purpose: string, notificationId: string): Promise<void> {
        await this.requireQueue(purpose).waitForResult(notificationId);
    }

    async enqueueEmail(
        input: EmailActionInput,
        message: NotificationActionMessage,
        theme?: "light" | "dark",
    ): Promise<
        NotificationSenderQueueEntry & { sent: true; notificationId: string }
    > {
        const queued = this.requireQueue(input.purpose).enqueue({
            purpose: input.purpose,
            recipientEmail: input.recipientEmail,
            subject: message.subject,
            body: message.body,
            theme:
                theme ?? (await this.getRecipientTheme(input.recipientEmail)),
            presentation: message.presentation as EmailPresentation | undefined,
            verifyUrl: message.actionUrl,
            verifyButtonLabel: message.actionLabel,
            config: {
                ...this.resolveDeliveryConfig({
                    ...input.config,
                    ...(message.senderName
                        ? { senderName: message.senderName }
                        : {}),
                }),
            },
        });
        return {
            sent: true,
            ...this.requireQueue(input.purpose).getQueueItem(
                queued.notificationId,
            )!,
        };
    }

    private resolveDeliveryConfig(
        overrides?: Record<string, unknown>,
    ): SmtpConfig {
        const config = { ...this.config };
        if (!overrides) return config;
        for (const field of [
            "host",
            "from",
            "senderName",
            "user",
            "password",
        ] as const) {
            const value = overrides[field];
            if (
                typeof value === "string" &&
                (field !== "password" || value !== "")
            )
                config[field] = value;
        }
        if (
            typeof overrides.port === "number" &&
            Number.isInteger(overrides.port) &&
            overrides.port > 0 &&
            overrides.port <= 65535
        )
            config.port = overrides.port;
        if (
            overrides.secure === "none" ||
            overrides.secure === "tls" ||
            overrides.secure === "starttls"
        )
            config.secure = overrides.secure;
        for (const field of ["allowSelfSigned", "authDisabled"] as const)
            if (typeof overrides[field] === "boolean")
                config[field] = overrides[field];
        return config;
    }

    private requireQueue(purpose: unknown): SmtpNotificationQueue {
        const queue =
            typeof purpose === "string" ? this.queues.get(purpose) : undefined;
        if (!queue) throw new Error("smtp_purpose_unregistered");
        return queue;
    }

    readonly stringsBaseUrl = "/static/adapters/notify/smtp/languages";

    getConfigSchema(): import("../../../gateways/notify/contracts/sender.js").NotificationConfigField[] {
        const field = (
            key: string,
            type: "text" | "password" | "number" | "boolean" = "text",
            label = key,
        ) => ({ key, type, label: `adapter.smtp.config.${label}` });
        const authentication = { field: "authDisabled", equals: false };
        return [
            field("host"),
            field("port", "number"),
            field("from"),
            field("senderName", "text", "sender_name"),
            {
                ...field("secure"),
                type: "select",
                options: ["none", "starttls", "tls"].map((value) => ({
                    value,
                    labelKey: `adapter.smtp.config.secure_${value}`,
                })),
            },
            field("authDisabled", "boolean", "auth_disabled"),
            {
                ...field("user"),
                visibleWhen: authentication,
                requiredWhen: authentication,
            },
            {
                ...field("password", "password"),
                visibleWhen: authentication,
                requiredWhen: authentication,
            },
            field("allowSelfSigned", "boolean", "allow_self_signed"),
            field("codeLength", "number", "code_length"),
            field("greylistRetries", "number", "greylist_retries"),
            field("greylistRetryDelayMs", "number", "greylist_retry_delay"),
        ];
    }

    getConfiguredSecretFields(): string[] {
        return this.config.password ? ["password"] : [];
    }

    getTestSchema(): import("../../../gateways/notify/contracts/sender.js").NotificationConfigField[] {
        return [
            {
                key: "to",
                label: "adapter.smtp.config.test_recipient",
                type: "email",
            },
        ];
    }

    getEnvValues(): Record<string, string | undefined> {
        return { ...this.environmentSnapshot };
    }

    getRequiredFields(): string[] {
        const requiredFields = ["host", "from"];
        if (!this.config.authDisabled) {
            requiredFields.push("user", "password");
        }
        return requiredFields;
    }

    isConfigured(): boolean {
        return Boolean(this.config.host);
    }

    getConfig(): Record<string, unknown> {
        return {
            host: this.config.host,
            port: this.config.port,
            from: this.config.from,
            senderName: this.config.senderName ?? "",
            user: this.config.user ?? "",
            password: "",
            secure: this.config.secure,
            allowSelfSigned: this.config.allowSelfSigned ?? false,
            authDisabled: this.config.authDisabled ?? false,
            greylistRetries:
                this.config.greylistRetries ?? DEFAULT_GREYLIST_RETRIES,
            greylistRetryDelayMs:
                this.config.greylistRetryDelayMs ??
                DEFAULT_GREYLIST_RETRY_DELAY_MILLISECONDS,
            codeLength: this.getCodeLength(),
        };
    }

    getCodeLength(): number {
        return clampVerificationCodeLength(this.config.codeLength);
    }

    setConfig(config: Record<string, unknown>): void {
        if (typeof config.host === "string") this.config.host = config.host;
        if (typeof config.port === "number") this.config.port = config.port;
        if (typeof config.from === "string") this.config.from = config.from;
        if (typeof config.senderName === "string")
            this.config.senderName = config.senderName;
        if (typeof config.user === "string") this.config.user = config.user;
        if (typeof config.password === "string" && config.password !== "")
            this.config.password = config.password;
        if (
            config.secure === "none" ||
            config.secure === "tls" ||
            config.secure === "starttls"
        ) {
            this.config.secure = config.secure;
        }
        if (typeof config.allowSelfSigned === "boolean")
            this.config.allowSelfSigned = config.allowSelfSigned;
        if (typeof config.authDisabled === "boolean")
            this.config.authDisabled = config.authDisabled;
        if (typeof config.greylistRetries === "number")
            this.config.greylistRetries = config.greylistRetries;
        if (typeof config.greylistRetryDelayMs === "number")
            this.config.greylistRetryDelayMs = config.greylistRetryDelayMs;
        if (typeof config.codeLength === "number") {
            this.config.codeLength = clampVerificationCodeLength(
                config.codeLength,
            );
        }
    }

    listQueue(): NotificationSenderQueueEntry[] {
        return [...this.queues.values()]
            .flatMap((queue) => queue.listQueue())
            .sort(
                (leftEntry, rightEntry) =>
                    Date.parse(rightEntry.updatedAt) -
                    Date.parse(leftEntry.updatedAt),
            );
    }

    getQueueItem(notificationId: string): NotificationSenderQueueEntry | null {
        return (
            [...this.queues.values()]
                .map((queue) => queue.getQueueItem(notificationId))
                .find(Boolean) ?? null
        );
    }

    async sendTestEmail(
        purpose: string,
        recipient: string,
        overrideConfig?: Record<string, unknown>,
    ): Promise<void> {
        if (!recipient) throw new Error("smtp_test_email_requires_recipient");
        const configuration = this.resolveDeliveryConfig(overrideConfig);
        const theme = await this.getRecipientTheme(recipient);
        const queued = this.requireQueue(purpose).enqueue({
            purpose,
            recipientEmail: recipient,
            subject: "Cognis SMTP Test",
            body: "This is a test email from Cognis.",
            config: { ...configuration },
            theme,
        });
        await this.requireQueue(purpose).waitForResult(queued.notificationId);
    }

    async send(envelope: NotificationEnvelope): Promise<void> {
        if (!envelope.recipientEmail) {
            throw new Error("smtp_sender_requires_recipient_email");
        }
        const queued = await this.sendTracked(envelope);
        await this.requireQueue(envelope.purpose).waitForResult(
            queued.notificationId,
        );
    }

    async sendTracked(
        envelope: NotificationEnvelope,
    ): Promise<{ notificationId: string }> {
        if (!envelope.recipientEmail) {
            throw new Error("smtp_sender_requires_recipient_email");
        }
        const theme = await this.getRecipientTheme(envelope.recipientEmail);
        return this.requireQueue(envelope.purpose).enqueue({
            purpose: envelope.purpose!,
            attachments: envelope.attachments,
            recipientEmail: envelope.recipientEmail,
            recipientUsername: envelope.recipientUsername,
            category: envelope.category,
            presentation: envelope.presentation as
                EmailPresentation | undefined,
            subject: envelope.subject,
            body: envelope.body,
            theme,
            verifyUrl:
                typeof envelope.metadata?.verifyUrl === "string"
                    ? envelope.metadata.verifyUrl
                    : undefined,
            verifyButtonLabel:
                typeof envelope.metadata?.verifyButtonLabel === "string"
                    ? envelope.metadata.verifyButtonLabel
                    : undefined,
        });
    }
}
