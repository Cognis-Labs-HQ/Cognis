import net from "node:net";
import tls from "node:tls";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import type { NotificationEnvelope, NotificationSender } from "@cognis/core";

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
}

export class SmtpTemporaryError extends Error {
    constructor(message: string) {
        super(message);
        this.name = "SmtpTemporaryError";
    }
}

function isTemporaryCode(code: number): boolean {
    return code >= 400 && code < 500;
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
    return text
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#x27;");
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

async function buildMessage(
    from: string,
    to: string,
    subject: string,
    body: string,
    options: { theme?: string; externalHost?: string; verifyUrl?: string } = {},
): Promise<string> {
    const palette = options.theme === "dark" ? DARK_PALETTE : LIGHT_PALETTE;
    const externalHost = options.externalHost ?? "";
    const iconUrl = externalHost
        ? `${externalHost}/assets/icons/cognis-icon.png`
        : "";

    const verifyButton = options.verifyUrl
        ? `<tr>
            <td style="background:${palette.bgContent};padding:0 36px 24px;text-align:center;">
              <a href="${escapeHtmlForEmail(options.verifyUrl)}"
                style="display:inline-block;padding:13px 32px;background:${palette.colorAccent};color:#ffffff;text-decoration:none;border-radius:6px;font-weight:700;font-size:15px;letter-spacing:0.04em;font-family:Arial,Helvetica,sans-serif;">
                Verify Email Address
              </a>
            </td>
          </tr>`
        : "";

    const template = await loadEmailTemplate();
    const htmlBody = template
        .replace(/\{\{subject\}\}/g, escapeHtmlForEmail(subject))
        .replace(
            /\{\{body\}\}/g,
            escapeHtmlForEmail(body).replace(/\n/g, "<br>"),
        )
        .replace(/\{\{verifyButton\}\}/g, verifyButton)
        .replace(/\{\{iconUrl\}\}/g, escapeHtmlForEmail(iconUrl))
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

    const fromHeader = from;

    const normalised = htmlBody.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
    const dotStuffed = normalised
        .split("\n")
        .map((line) => (line.startsWith(".") ? `.${line}` : line))
        .join("\r\n");

    return (
        [
            `From: ${fromHeader}`,
            `To: ${to}`,
            `Subject: ${subject}`,
            "MIME-Version: 1.0",
            "Content-Type: text/html; charset=utf-8",
            "",
            dotStuffed,
        ].join("\r\n") + "\r\n.\r\n"
    );
}

interface SmtpResponse {
    code: number;
    text: string;
}

class SmtpSession {
    private buf = "";
    private pending: ((r: SmtpResponse) => void) | null = null;
    private readonly listener: (d: string) => void;

    constructor(private readonly sock: net.Socket | tls.TLSSocket) {
        this.listener = (d: string) => {
            this.buf += d;
            this.processBuffer();
        };
        sock.setEncoding("utf8");
        sock.on("data", this.listener);
    }

    private processBuffer(): void {
        while (true) {
            const end = this.buf.indexOf("\r\n");
            if (end === -1) break;
            const line = this.buf.slice(0, end);
            this.buf = this.buf.slice(end + 2);
            if (line.length < 3) continue;
            const code = Number.parseInt(line.slice(0, 3), 10);
            const isContinuation = line.length > 3 && line[3] === "-";
            if (!isContinuation && this.pending) {
                const resolve = this.pending;
                this.pending = null;
                resolve({ code, text: line.length > 4 ? line.slice(4) : "" });
                return;
            }
        }
    }

    read(): Promise<SmtpResponse> {
        return new Promise((resolve) => {
            this.pending = resolve;
            this.processBuffer();
        });
    }

    cmd(command: string): Promise<SmtpResponse> {
        this.sock.write(`${command}\r\n`);
        return this.read();
    }

    writeRaw(data: string): void {
        this.sock.write(data);
    }

    detach(): void {
        this.sock.removeListener("data", this.listener);
    }

    get socket(): net.Socket | tls.TLSSocket {
        return this.sock;
    }

    destroy(): void {
        this.sock.destroy();
    }
}

const SMTP_TIMEOUT_MS = 30_000;

async function openSession(
    host: string,
    port: number,
    secure: "tls" | "none" | "starttls",
    allowSelfSigned?: boolean,
): Promise<SmtpSession> {
    if (secure === "tls") {
        const sock = await new Promise<tls.TLSSocket>((resolve, reject) => {
            const tlsSock = tls.connect({
                host,
                port,
                rejectUnauthorized: !allowSelfSigned,
            });
            tlsSock.once("secureConnect", () => resolve(tlsSock));
            tlsSock.once("error", reject);
        });
        return new SmtpSession(sock);
    }

    const sock = await new Promise<net.Socket>((resolve, reject) => {
        const plainSock = net.createConnection({ host, port });
        plainSock.once("connect", () => resolve(plainSock));
        plainSock.once("error", reject);
    });
    return new SmtpSession(sock);
}

async function upgradeToTls(
    session: SmtpSession,
    allowSelfSigned?: boolean,
): Promise<SmtpSession> {
    session.detach();
    const rawSock = session.socket as net.Socket;
    const tlsSock = await new Promise<tls.TLSSocket>((resolve, reject) => {
        const newTlsSock = tls.connect({
            socket: rawSock,
            rejectUnauthorized: !allowSelfSigned,
        });
        newTlsSock.once("secureConnect", () => resolve(newTlsSock));
        newTlsSock.once("error", reject);
    });
    return new SmtpSession(tlsSock);
}

async function sendMail(
    config: SmtpConfig,
    to: string,
    subject: string,
    body: string,
    theme?: string,
    verifyUrl?: string,
): Promise<void> {
    let session = await openSession(
        config.host,
        config.port,
        config.secure,
        config.allowSelfSigned,
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

        let ehlo = await session.cmd(
            `EHLO ${config.ehloHostname ?? "localhost"}`,
        );
        if (ehlo.code !== 250) {
            throw new Error(`smtp_ehlo_failed:${ehlo.code}`);
        }

        if (config.secure === "starttls") {
            const starttls = await session.cmd("STARTTLS");
            if (starttls.code !== 220) {
                throw new Error(`smtp_starttls_failed:${starttls.code}`);
            }
            session = await upgradeToTls(session, config.allowSelfSigned);
            ehlo = await session.cmd(
                `EHLO ${config.ehloHostname ?? "localhost"}`,
            );
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

        const mailFrom = await session.cmd(`MAIL FROM:<${config.from}>`);
        if (mailFrom.code !== 250) {
            const msg = `smtp_mail_from_failed:${mailFrom.code}`;
            throw isTemporaryCode(mailFrom.code)
                ? new SmtpTemporaryError(msg)
                : new Error(msg);
        }

        const rcptTo = await session.cmd(`RCPT TO:<${to}>`);
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
const DEFAULT_RATE_LIMIT_MS = 60_000;

export class SmtpRateLimiter {
    private readonly lastSent = new Map<string, number>();

    constructor(
        private readonly minIntervalMs: number,
        private readonly now: () => number = () => Date.now(),
    ) {}

    /**
     * Returns true if `recipient` is within the rate-limit window and
     * a new email must not be sent. Returns false when a send is allowed.
     */
    isThrottled(recipient: string): boolean {
        const last = this.lastSent.get(recipient);
        if (last === undefined) return false;
        return this.now() - last < this.minIntervalMs;
    }

    record(recipient: string): void {
        this.lastSent.set(recipient, this.now());
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
): Promise<void> {
    const maxRetries = config.greylistRetries ?? DEFAULT_GREYLIST_RETRIES;
    const delayMs =
        config.greylistRetryDelayMs ?? DEFAULT_GREYLIST_RETRY_DELAY_MS;

    let lastError: unknown;
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
        if (attempt > 0) {
            await sleep(delayMs);
        }
        try {
            await sendMail(config, to, subject, body, theme, verifyUrl);
            return;
        } catch (err) {
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
    private readonly rateLimiter: SmtpRateLimiter;

    constructor(
        private config: SmtpConfig,
        envSnapshot?: Record<string, string | undefined>,
        sleep?: (ms: number) => Promise<void>,
        rateLimiter?: SmtpRateLimiter,
    ) {
        this.envSnapshot = envSnapshot ?? {};
        this.sleep =
            sleep ??
            ((ms) => new Promise((resolve) => setTimeout(resolve, ms)));
        this.rateLimiter =
            rateLimiter ?? new SmtpRateLimiter(DEFAULT_RATE_LIMIT_MS);
    }

    getEnvValues(): Record<string, string | undefined> {
        return { ...this.envSnapshot };
    }

    getRequiredFields(): string[] {
        return ["host", "from"];
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
            user: this.config.user,
            secure: this.config.secure,
            allowSelfSigned: this.config.allowSelfSigned ?? false,
            authDisabled: this.config.authDisabled ?? false,
            greylistRetries:
                this.config.greylistRetries ?? DEFAULT_GREYLIST_RETRIES,
            greylistRetryDelayMs:
                this.config.greylistRetryDelayMs ??
                DEFAULT_GREYLIST_RETRY_DELAY_MS,
        };
    }

    setConfig(config: Record<string, unknown>): void {
        if (typeof config.host === "string") this.config.host = config.host;
        if (typeof config.port === "number") this.config.port = config.port;
        if (typeof config.from === "string") this.config.from = config.from;
        if (typeof config.senderName === "string")
            this.config.senderName = config.senderName;
        if (typeof config.user === "string") this.config.user = config.user;
        if (typeof config.password === "string")
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
    }

    async sendVerificationEmail(
        to: string,
        code: string,
        verifyUrl?: string,
        theme?: string,
    ): Promise<void> {
        if (!to) throw new Error("smtp_requires_recipient");
        if (this.rateLimiter.isThrottled(to)) {
            throw new Error("smtp_rate_limited");
        }
        this.rateLimiter.record(to);
        const subject = "Verify your email address";
        const body = verifyUrl
            ? `Your verification code is: ${code}\n\nOr click the button below to verify your email address directly.\n\nBoth the code and the link expire in 15 minutes.`
            : `Your verification code is: ${code}\n\nThis code expires in 15 minutes.`;
        await sendMailWithRetry(
            this.config,
            to,
            subject,
            body,
            this.sleep,
            theme,
            verifyUrl,
        );
    }

    async sendTestEmail(
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
        await sendMailWithRetry(
            cfg,
            to,
            "Cognis SMTP Test",
            "This is a test email from Cognis.",
            this.sleep,
            undefined,
            undefined,
        );
    }

    async send(envelope: NotificationEnvelope): Promise<void> {
        if (!envelope.recipientEmail) {
            throw new Error("smtp_sender_requires_recipient_email");
        }
        if (this.rateLimiter.isThrottled(envelope.recipientEmail)) {
            throw new Error("smtp_rate_limited");
        }
        this.rateLimiter.record(envelope.recipientEmail);
        const theme =
            typeof envelope.metadata?.theme === "string"
                ? envelope.metadata.theme
                : undefined;
        await sendMailWithRetry(
            this.config,
            envelope.recipientEmail,
            envelope.subject,
            envelope.body,
            this.sleep,
            theme,
            undefined,
        );
    }
}

export function createNotificationSender(
    env: Record<string, string | undefined>,
): SmtpNotificationSender {
    const host = env["COGNIS_SMTP_HOST"] ?? "";
    const port = Number.parseInt(env["COGNIS_SMTP_PORT"] ?? "587", 10);
    const from = env["COGNIS_SMTP_FROM"] ?? (host ? `cognis@${host}` : "");
    const senderName = env["COGNIS_SMTP_SENDER_NAME"];
    const user = env["COGNIS_SMTP_USER"];
    const password = env["COGNIS_SMTP_PASS"];
    const rawSecure = env["COGNIS_SMTP_SECURE"] ?? "starttls";
    const secure =
        rawSecure === "tls"
            ? "tls"
            : rawSecure === "none"
              ? "none"
              : "starttls";
    const allowSelfSigned = env["COGNIS_SMTP_ALLOW_SELF_SIGNED"] === "true";
    const authDisabled = env["COGNIS_SMTP_AUTH_DISABLED"] === "true";
    const ehloHostname = env["HOST"];
    const externalHost =
        env["EXTERNAL_HOST"] ?? (env["HOST"] ? `http://${env["HOST"]}` : "");

    const envSnapshot: Record<string, string | undefined> = {
        host: env["COGNIS_SMTP_HOST"],
        port: env["COGNIS_SMTP_PORT"],
        from: env["COGNIS_SMTP_FROM"],
        senderName: env["COGNIS_SMTP_SENDER_NAME"],
        user: env["COGNIS_SMTP_USER"],
        secure: env["COGNIS_SMTP_SECURE"],
        allowSelfSigned: env["COGNIS_SMTP_ALLOW_SELF_SIGNED"],
        authDisabled: env["COGNIS_SMTP_AUTH_DISABLED"],
    };

    return new SmtpNotificationSender(
        {
            host,
            port,
            from,
            senderName,
            user,
            password,
            secure,
            allowSelfSigned,
            authDisabled,
            ehloHostname,
            externalHost,
        },
        envSnapshot,
    );
}
