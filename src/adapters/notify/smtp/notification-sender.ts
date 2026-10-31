import { requireBootstrapScope } from "@cognis/core";
import { openSession, upgradeToTls, SMTP_TIMEOUT_MS } from "./smtp-session.js";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { randomUUID } from "node:crypto";
import type {
    NotificationEnvelope,
    NotificationSender,
    NotificationSenderQueueEntry,
} from "../../../gateways/notify/gateway.js";
import { encodeBasicHtmlEntities } from "./html-entities.js";
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
import {
    buildRegistrationInviteEmailMessage,
    buildVerificationEmailMessage,
} from "./message-builders.js";
import { SMTP_VERIFICATION_RATE_LIMIT_MS } from "./rate-limit.js";
import { clampSmtpVerificationCodeLength } from "@cognis/core";
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
let cachedEmailTemplate: string | null = null;
async function loadEmailTemplate(): Promise<string> {
    if (cachedEmailTemplate !== null) return cachedEmailTemplate;
    const templatePath = fileURLToPath(
        new URL("./templates/notification.html", import.meta.url),
    );
    cachedEmailTemplate = await readFile(templatePath, "utf8");
    return cachedEmailTemplate;
}
function escapeHtmlForEmail(text: string): string {
    return encodeBasicHtmlEntities(text);
}
interface ThemePalette {
    bgOuter: string;
    bgHeader: string;
    bgContent: string;
    bgCard: string;
    bgFooter: string;
    colorAccent: string;
    colorAccent2: string;
    colorText: string;
    colorBodyText: string;
    colorMuted: string;
    colorFooterText: string;
    colorDivider: string;
    colorDiamond: string;
    shadowColor: string;
}
const DARK_PALETTE: ThemePalette = {
    bgOuter: "#0a1628",
    bgHeader: "linear-gradient(135deg,#071421 0%,#0f2d3a 60%,#112b25 100%)",
    bgContent: "#0d1f35",
    bgCard: "rgba(255,255,255,0.04)",
    bgFooter: "#081529",
    colorAccent: "#2a7f62",
    colorAccent2: "#3aa783",
    colorText: "#e2e8f0",
    colorBodyText: "#c8d8e8",
    colorMuted: "#4a8fa8",
    colorFooterText: "#4a6a85",
    colorDivider: "rgba(42,127,98,0.25)",
    colorDiamond: "#2a5068",
    shadowColor: "rgba(0,0,0,0.45)",
};
const LIGHT_PALETTE: ThemePalette = {
    bgOuter: "#e8eef9",
    bgHeader: "linear-gradient(135deg,#f0f7ff 0%,#e8f3ff 60%,#e8f5f0 100%)",
    bgContent: "#ffffff",
    bgCard: "rgba(248,250,255,0.96)",
    bgFooter: "#f4f8ff",
    colorAccent: "#0f766e",
    colorAccent2: "#0d9488",
    colorText: "#0f172a",
    colorBodyText: "#1e293b",
    colorMuted: "#475569",
    colorFooterText: "#64748b",
    colorDivider: "rgba(15,118,110,0.25)",
    colorDiamond: "#94a3b8",
    shadowColor: "rgba(15,23,42,0.15)",
};
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
            (char) =>
                `=${char.charCodeAt(0).toString(16).toUpperCase().padStart(2, "0")}`,
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
    to: string,
    subject: string,
    body: string,
    options: {
        theme?: string;
        externalHost?: string;
        verifyUrl?: string;
        verifyButtonLabel?: string;
        senderName?: string;
        messageIdDomain?: string;
        attachments?: MimeAttachment[];
    } = {},
): Promise<string> {
    const palette = options.theme === "dark" ? DARK_PALETTE : LIGHT_PALETTE;
    const externalHost = options.externalHost ?? "";
    const iconUrl = externalHost
        ? `${externalHost}/assets/icons/cognis-icon.png`
        : "";
    const brandIcon = iconUrl
        ? `<td style="vertical-align:middle;padding-right:12px;">
              <img src="${escapeHtmlForEmail(iconUrl)}" alt="Cognis" width="36" height="36" border="0" style="display:block;border-radius:6px;outline:none;text-decoration:none;" />
            </td>`
        : "";
    const footerBrandLink = externalHost
        ? `<a href="${escapeHtmlForEmail(externalHost)}" style="color:${palette.colorAccent2};text-decoration:none;">Cognis</a>`
        : `<span style="color:${palette.colorAccent2};">Cognis</span>`;

    const verifyButton = options.verifyUrl
        ? `<tr>
            <td style="background:${palette.bgContent};padding:0 36px 24px;text-align:center;">
              <a href="${escapeHtmlForEmail(options.verifyUrl)}"
                style="display:inline-block;padding:13px 32px;background:${palette.colorAccent};color:#ffffff;text-decoration:none;border-radius:6px;font-weight:700;font-size:15px;letter-spacing:0.04em;font-family:Arial,Helvetica,sans-serif;">
                ${escapeHtmlForEmail(options.verifyButtonLabel ?? "Verify Email Address")}
              </a>
            </td>
          </tr>`
        : "";

    function renderBodyWithLinks(rawBody: string): string {
        const urlPattern = /https?:\/\/[^\s<]+/g;
        let html = "";
        let cursor = 0;
        for (const match of rawBody.matchAll(urlPattern)) {
            const index = match.index ?? 0;
            const rawUrl = match[0];
            html += escapeHtmlForEmail(rawBody.slice(cursor, index));
            const safeUrl = escapeHtmlForEmail(rawUrl);
            html += `<a href="${safeUrl}" style="color:${palette.colorAccent2};text-decoration:underline;">${safeUrl}</a>`;
            cursor = index + rawUrl.length;
        }
        html += escapeHtmlForEmail(rawBody.slice(cursor));
        return html.replace(/\n/g, "<br>");
    }

    const template = await loadEmailTemplate();
    const htmlBody = template
        .replace(/\{\{subject\}\}/g, escapeHtmlForEmail(subject))
        .replace(/\{\{body\}\}/g, renderBodyWithLinks(body))
        .replace(/\{\{verifyButton\}\}/g, verifyButton)
        .replace(/\{\{brandIcon\}\}/g, brandIcon)
        .replace(/\{\{footerBrandLink\}\}/g, footerBrandLink)
        .replace(/\{\{externalHost\}\}/g, escapeHtmlForEmail(externalHost))
        .replace(/\{\{bgOuter\}\}/g, palette.bgOuter)
        .replace(/\{\{bgHeader\}\}/g, palette.bgHeader)
        .replace(/\{\{bgContent\}\}/g, palette.bgContent)
        .replace(/\{\{bgCard\}\}/g, palette.bgCard)
        .replace(/\{\{bgFooter\}\}/g, palette.bgFooter)
        .replace(/\{\{colorAccent\}\}/g, palette.colorAccent)
        .replace(/\{\{colorAccent2\}\}/g, palette.colorAccent2)
        .replace(/\{\{colorText\}\}/g, palette.colorText)
        .replace(/\{\{colorBodyText\}\}/g, palette.colorBodyText)
        .replace(/\{\{colorMuted\}\}/g, palette.colorMuted)
        .replace(/\{\{colorFooterText\}\}/g, palette.colorFooterText)
        .replace(/\{\{colorDivider\}\}/g, palette.colorDivider)
        .replace(/\{\{colorDiamond\}\}/g, palette.colorDiamond)
        .replace(/\{\{shadowColor\}\}/g, palette.shadowColor);

    const textBody = [
        subject,
        "",
        stripHtmlTags(renderBodyWithLinks(body)),
        ...(options.verifyUrl
            ? [
                  "",
                  `${options.verifyButtonLabel ?? "Verify Email Address"}: ${options.verifyUrl}`,
              ]
            : []),
        "",
        "-- ",
        "Cognis automated notification. Please do not reply to this message.",
    ].join("\n");
    const boundary = `cognis-${randomUUID()}`;
    const hasAttachments =
        Array.isArray(options.attachments) && options.attachments.length > 0;
    const mixedBoundary = hasAttachments ? `cognis-mixed-${randomUUID()}` : "";
    const headers = [
        foldHeader("From", formatAddressHeader(from, options.senderName)),
        foldHeader("To", formatAddressHeader(to)),
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
    to: string,
    subject: string,
    body: string,
    theme?: string,
    verifyUrl?: string,
    verifyButtonLabel?: string,
    attachments?: MimeAttachment[],
    signal?: AbortSignal,
): Promise<void> {
    let session = await openSession(
        config.host,
        config.port,
        config.secure,
        config.allowSelfSigned,
        signal,
    );

    try {
        session.socket.setTimeout(SMTP_TIMEOUT_MS);

        const greeting = await session.read();
        if (greeting.code !== 220) {
            const msg = `smtp_unexpected_greeting:${greeting.code}`;
            throw isTemporaryCode(greeting.code)
                ? new SmtpTemporaryError(msg)
                : new Error(msg);
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
            const creds = Buffer.from(
                `\0${config.user}\0${config.password}`,
            ).toString("base64");
            const auth = await session.cmd(`AUTH PLAIN ${creds}`);
            if (auth.code !== 235) {
                throw new Error(`smtp_auth_failed:${auth.code}`);
            }
        }

        const mailFromAddress = sanitizeSmtpPath(config.from);
        const recipientAddress = sanitizeSmtpPath(to);
        const mailFrom = await session.cmd(`MAIL FROM:<${mailFromAddress}>`);
        if (mailFrom.code !== 250) {
            const msg = `smtp_mail_from_failed:${mailFrom.code}`;
            throw isTemporaryCode(mailFrom.code)
                ? new SmtpTemporaryError(msg)
                : new Error(msg);
        }

        const rcptTo = await session.cmd(`RCPT TO:<${recipientAddress}>`);
        if (rcptTo.code !== 250 && rcptTo.code !== 251) {
            const msg = `smtp_rcpt_to_failed:${rcptTo.code}`;
            throw isTemporaryCode(rcptTo.code)
                ? new SmtpTemporaryError(msg)
                : new Error(msg);
        }

        const dataCmd = await session.cmd("DATA");
        if (dataCmd.code !== 354) {
            const msg = `smtp_data_cmd_failed:${dataCmd.code}`;
            throw isTemporaryCode(dataCmd.code)
                ? new SmtpTemporaryError(msg)
                : new Error(msg);
        }

        session.writeRaw(
            await buildMessage(config.from, to, subject, body, {
                theme,
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
            const msg = `smtp_message_rejected:${sent.code}`;
            throw isTemporaryCode(sent.code)
                ? new SmtpTemporaryError(msg)
                : new Error(msg);
        }

        await session.cmd("QUIT");
    } finally {
        session.destroy();
    }
}

const DEFAULT_GREYLIST_RETRIES = 2;
const DEFAULT_GREYLIST_RETRY_DELAY_MS = 5 * 60 * 1000;

async function waitForRetry(
    sleep: (ms: number) => Promise<void>,
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
    to: string,
    subject: string,
    body: string,
    sleep: (ms: number) => Promise<void>,
    theme?: string,
    verifyUrl?: string,
    verifyButtonLabel?: string,
    attachments?: MimeAttachment[],
    signal?: AbortSignal,
): Promise<void> {
    const maxRetries = config.greylistRetries ?? DEFAULT_GREYLIST_RETRIES;
    const delayMs =
        config.greylistRetryDelayMs ?? DEFAULT_GREYLIST_RETRY_DELAY_MS;

    let lastError: unknown;
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
        if (attempt > 0) {
            await waitForRetry(sleep, delayMs, signal);
        }
        signal?.throwIfAborted();
        try {
            await sendMail(
                config,
                to,
                subject,
                body,
                theme,
                verifyUrl,
                verifyButtonLabel,
                attachments,
                signal,
            );
            return;
        } catch (err) {
            signal?.throwIfAborted();
            if (err instanceof SmtpTemporaryError && attempt < maxRetries) {
                lastError = err;
                continue;
            }
            throw err;
        }
    }
    throw lastError;
}

export class SmtpNotificationSender implements NotificationSender {
    readonly senderId = "smtp";
    readonly senderName = "SMTP Email";

    private readonly envSnapshot: Record<string, string | undefined>;
    private readonly sleep: (ms: number) => Promise<void>;
    private readonly queues = new Map<string, SmtpNotificationQueue>();
    private readonly createRateLimiter: () => SmtpRateLimiter;

    constructor(
        private config: SmtpConfig,
        envSnapshot?: Record<string, string | undefined>,
        sleep?: (ms: number) => Promise<void>,
        createRateLimiter?: () => SmtpRateLimiter,
    ) {
        this.envSnapshot = envSnapshot ?? {};
        this.sleep =
            sleep ??
            ((ms) =>
                new Promise((resolve) => {
                    const timer = setTimeout(resolve, ms);
                    timer.unref();
                }));
        this.createRateLimiter =
            createRateLimiter ??
            (() => new SmtpRateLimiter(SMTP_VERIFICATION_RATE_LIMIT_MS));
    }

    registerPurpose(purpose: string): () => void {
        requireBootstrapScope();
        if (!purpose || this.queues.has(purpose))
            throw new Error("smtp_purpose_conflict");
        const controller = new AbortController();
        const queue = new SmtpNotificationQueue(
            this.createRateLimiter(),
            this.sleep,
            async (payload) => {
                await sendMailWithRetry(
                    (payload.config as SmtpConfig | undefined) ?? this.config,
                    payload.recipientEmail,
                    payload.subject,
                    payload.body,
                    this.sleep,
                    payload.theme,
                    payload.verifyUrl,
                    payload.verifyButtonLabel,
                    payload.attachments ?? [],
                    controller.signal,
                );
            },
            purpose,
        );
        this.queues.set(purpose, queue);
        return () => {
            controller.abort();
            queue.close();
            if (this.queues.get(purpose) === queue) this.queues.delete(purpose);
        };
    }

    private requireQueue(purpose: unknown): SmtpNotificationQueue {
        const queue =
            typeof purpose === "string" ? this.queues.get(purpose) : undefined;
        if (!queue) throw new Error("smtp_purpose_unregistered");
        return queue;
    }

    getEnvValues(): Record<string, string | undefined> {
        return { ...this.envSnapshot };
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
                DEFAULT_GREYLIST_RETRY_DELAY_MS,
            codeLength: this.getCodeLength(),
        };
    }

    getCodeLength(): number {
        return clampSmtpVerificationCodeLength(this.config.codeLength);
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
            this.config.codeLength = clampSmtpVerificationCodeLength(
                config.codeLength,
            );
        }
    }

    listQueue(): NotificationSenderQueueEntry[] {
        return [...this.queues.values()]
            .flatMap((queue) => queue.listQueue())
            .sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt));
    }

    getQueueItem(notificationId: string): NotificationSenderQueueEntry | null {
        return (
            [...this.queues.values()]
                .map((queue) => queue.getQueueItem(notificationId))
                .find(Boolean) ?? null
        );
    }

    async sendVerificationEmail(
        purpose: string,
        to: string,
        code: string,
        verifyUrl?: string,
        theme?: string,
    ): Promise<void> {
        const queued = await this.queueVerificationEmail(
            purpose,
            to,
            code,
            verifyUrl,
            theme,
        );
        const notificationId = queued.notificationId?.trim();
        if (!notificationId) {
            throw new Error("smtp_queue_item_missing");
        }
        await this.requireQueue(purpose).waitForResult(notificationId);
    }

    async queueVerificationEmail(
        purpose: string,
        to: string,
        code: string,
        verifyUrl?: string,
        theme?: string,
    ) {
        if (!to) throw new Error("smtp_requires_recipient");
        const messageType = verifyUrl
            ? "email-address-verification"
            : "verification-code";
        const { subject, body } = buildVerificationEmailMessage(
            messageType,
            code,
        );
        const queued = this.requireQueue(purpose).enqueue({
            purpose,
            recipientEmail: to,
            subject,
            body,
            theme,
            verifyUrl,
        });
        const notificationId = queued.notificationId?.trim();
        if (!notificationId) {
            throw new Error("smtp_queue_item_missing");
        }
        const queueItem =
            this.requireQueue(purpose).getQueueItem(notificationId);
        if (!queueItem) {
            throw new Error("smtp_queue_item_missing");
        }
        return queueItem;
    }

    async sendRegistrationInviteEmail(
        purpose: string,
        to: string,
        inviterDisplayName: string,
        inviteUrl: string,
        theme?: string,
    ): Promise<void> {
        if (!to) throw new Error("smtp_requires_recipient");
        const { subject, body } = buildRegistrationInviteEmailMessage(
            inviterDisplayName,
            inviteUrl,
        );
        const queued = this.requireQueue(purpose).enqueue({
            purpose,
            recipientEmail: to,
            subject,
            body,
            theme,
            verifyUrl: inviteUrl,
            verifyButtonLabel: "Sign Up",
        });
        await this.requireQueue(purpose).waitForResult(queued.notificationId);
    }

    async sendOneTimeLoginEmail(
        purpose: string,
        to: string,
        loginUrl: string,
        options?: {
            theme?: string;
            subject?: string;
            body?: string;
            actionLabel?: string;
        },
    ): Promise<void> {
        if (!to) throw new Error("smtp_requires_recipient");
        if (!loginUrl) throw new Error("smtp_requires_login_url");
        const theme = options?.theme;
        const subject = options?.subject?.trim();
        const body = options?.body?.trim();
        if (!subject || !body) {
            throw new Error(
                "One-time login email subject and body are required.",
            );
        }
        const queued = this.requireQueue(purpose).enqueue({
            purpose,
            recipientEmail: to,
            subject,
            body,
            theme,
            verifyUrl: loginUrl,
            verifyButtonLabel: options?.actionLabel,
        });
        await this.requireQueue(purpose).waitForResult(queued.notificationId);
    }

    async sendTestEmail(
        purpose: string,
        to: string,
        overrideConfig?: Record<string, unknown>,
    ): Promise<void> {
        if (!to) throw new Error("smtp_test_email_requires_recipient");
        let cfg = this.config;
        if (overrideConfig && typeof overrideConfig === "object") {
            const merged: SmtpConfig = { ...this.config };
            if (typeof overrideConfig.host === "string")
                merged.host = overrideConfig.host;
            if (typeof overrideConfig.port === "number")
                merged.port = overrideConfig.port;
            if (typeof overrideConfig.from === "string")
                merged.from = overrideConfig.from;
            if (typeof overrideConfig.senderName === "string")
                merged.senderName = overrideConfig.senderName;
            if (typeof overrideConfig.user === "string")
                merged.user = overrideConfig.user;
            if (typeof overrideConfig.password === "string")
                merged.password = overrideConfig.password;
            if (
                overrideConfig.secure === "none" ||
                overrideConfig.secure === "tls" ||
                overrideConfig.secure === "starttls"
            ) {
                merged.secure = overrideConfig.secure;
            }
            if (typeof overrideConfig.allowSelfSigned === "boolean")
                merged.allowSelfSigned = overrideConfig.allowSelfSigned;
            if (typeof overrideConfig.authDisabled === "boolean")
                merged.authDisabled = overrideConfig.authDisabled;
            cfg = merged;
        }
        const queued = this.requireQueue(purpose).enqueue({
            purpose,
            recipientEmail: to,
            subject: "Cognis SMTP Test",
            body: "This is a test email from Cognis.",
            config: cfg,
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
        const theme =
            typeof envelope.metadata?.theme === "string"
                ? envelope.metadata.theme
                : undefined;
        return this.requireQueue(envelope.purpose).enqueue({
            purpose: envelope.purpose!,
            attachments: envelope.attachments,
            recipientEmail: envelope.recipientEmail,
            recipientUsername: envelope.recipientUsername,
            category: envelope.category,
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
