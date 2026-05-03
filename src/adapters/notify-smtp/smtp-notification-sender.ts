import net from 'node:net';
import tls from 'node:tls';
import type { NotificationEnvelope, NotificationSender } from '@cognis/core';

export interface SmtpConfig {
  host: string;
  port: number;
  from: string;
  user?: string;
  password?: string;
  secure: 'none' | 'tls' | 'starttls';
  allowSelfSigned?: boolean;
  authDisabled?: boolean;
  ehloHostname?: string;
  greylistRetries?: number;
  greylistRetryDelayMs?: number;
}

export class SmtpTemporaryError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SmtpTemporaryError';
  }
}

function isTemporaryCode(code: number): boolean {
  return code >= 400 && code < 500;
}

interface SmtpResponse {
  code: number;
  text: string;
}

class SmtpSession {
  private buf = '';
  private pending: ((r: SmtpResponse) => void) | null = null;
  private readonly listener: (d: string) => void;

  constructor(private readonly sock: net.Socket | tls.TLSSocket) {
    this.listener = (d: string) => {
      this.buf += d;
      this.processBuffer();
    };
    sock.setEncoding('utf8');
    sock.on('data', this.listener);
  }

  private processBuffer(): void {
    while (true) {
      const end = this.buf.indexOf('\r\n');
      if (end === -1) break;
      const line = this.buf.slice(0, end);
      this.buf = this.buf.slice(end + 2);
      if (line.length < 3) continue;
      const code = Number.parseInt(line.slice(0, 3), 10);
      const isContinuation = line.length > 3 && line[3] === '-';
      if (!isContinuation && this.pending) {
        const resolve = this.pending;
        this.pending = null;
        resolve({ code, text: line.length > 4 ? line.slice(4) : '' });
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
    this.sock.removeListener('data', this.listener);
  }

  get socket(): net.Socket | tls.TLSSocket {
    return this.sock;
  }

  destroy(): void {
    this.sock.destroy();
  }
}

const SMTP_TIMEOUT_MS = 30_000;

async function openSession(host: string, port: number, secure: 'tls' | 'none' | 'starttls', allowSelfSigned?: boolean): Promise<SmtpSession> {
  if (secure === 'tls') {
    const sock = await new Promise<tls.TLSSocket>((resolve, reject) => {
      const tlsSock = tls.connect({ host, port, rejectUnauthorized: !allowSelfSigned });
      tlsSock.once('secureConnect', () => resolve(tlsSock));
      tlsSock.once('error', reject);
    });
    return new SmtpSession(sock);
  }

  const sock = await new Promise<net.Socket>((resolve, reject) => {
    const plainSock = net.createConnection({ host, port });
    plainSock.once('connect', () => resolve(plainSock));
    plainSock.once('error', reject);
  });
  return new SmtpSession(sock);
}

async function upgradeToTls(session: SmtpSession, allowSelfSigned?: boolean): Promise<SmtpSession> {
  session.detach();
  const rawSock = session.socket as net.Socket;
  const tlsSock = await new Promise<tls.TLSSocket>((resolve, reject) => {
    const newTlsSock = tls.connect({ socket: rawSock, rejectUnauthorized: !allowSelfSigned });
    newTlsSock.once('secureConnect', () => resolve(newTlsSock));
    newTlsSock.once('error', reject);
  });
  return new SmtpSession(tlsSock);
}

function buildMessage(from: string, to: string, subject: string, body: string): string {
  const normalised = body.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const dotStuffed = normalised
    .split('\n')
    .map((line) => (line.startsWith('.') ? `.${line}` : line))
    .join('\r\n');

  return [
    `From: ${from}`,
    `To: ${to}`,
    `Subject: ${subject}`,
    'MIME-Version: 1.0',
    'Content-Type: text/plain; charset=utf-8',
    '',
    dotStuffed,
  ].join('\r\n') + '\r\n.\r\n';
}

async function sendMail(config: SmtpConfig, to: string, subject: string, body: string): Promise<void> {
  let session = await openSession(config.host, config.port, config.secure, config.allowSelfSigned);

  try {
    session.socket.setTimeout(SMTP_TIMEOUT_MS);

    const greeting = await session.read();
    if (greeting.code !== 220) {
      const msg = `smtp_unexpected_greeting:${greeting.code}`;
      throw isTemporaryCode(greeting.code) ? new SmtpTemporaryError(msg) : new Error(msg);
    }

    let ehlo = await session.cmd(`EHLO ${config.ehloHostname ?? 'localhost'}`);
    if (ehlo.code !== 250) {
      throw new Error(`smtp_ehlo_failed:${ehlo.code}`);
    }

    if (config.secure === 'starttls') {
      const starttls = await session.cmd('STARTTLS');
      if (starttls.code !== 220) {
        throw new Error(`smtp_starttls_failed:${starttls.code}`);
      }
      session = await upgradeToTls(session, config.allowSelfSigned);
      ehlo = await session.cmd(`EHLO ${config.ehloHostname ?? 'localhost'}`);
      if (ehlo.code !== 250) {
        throw new Error(`smtp_ehlo_after_tls_failed:${ehlo.code}`);
      }
    }

    if (!config.authDisabled && config.user && config.password) {
      // SASL PLAIN format: \0authcid\0password (RFC 4616)
      const creds = Buffer.from(`\0${config.user}\0${config.password}`).toString('base64');
      const auth = await session.cmd(`AUTH PLAIN ${creds}`);
      if (auth.code !== 235) {
        throw new Error(`smtp_auth_failed:${auth.code}`);
      }
    }

    const mailFrom = await session.cmd(`MAIL FROM:<${config.from}>`);
    if (mailFrom.code !== 250) {
      const msg = `smtp_mail_from_failed:${mailFrom.code}`;
      throw isTemporaryCode(mailFrom.code) ? new SmtpTemporaryError(msg) : new Error(msg);
    }

    const rcptTo = await session.cmd(`RCPT TO:<${to}>`);
    if (rcptTo.code !== 250 && rcptTo.code !== 251) {
      const msg = `smtp_rcpt_to_failed:${rcptTo.code}`;
      throw isTemporaryCode(rcptTo.code) ? new SmtpTemporaryError(msg) : new Error(msg);
    }

    const dataCmd = await session.cmd('DATA');
    if (dataCmd.code !== 354) {
      const msg = `smtp_data_cmd_failed:${dataCmd.code}`;
      throw isTemporaryCode(dataCmd.code) ? new SmtpTemporaryError(msg) : new Error(msg);
    }

    session.writeRaw(buildMessage(config.from, to, subject, body));
    const sent = await session.read();
    if (sent.code !== 250) {
      const msg = `smtp_message_rejected:${sent.code}`;
      throw isTemporaryCode(sent.code) ? new SmtpTemporaryError(msg) : new Error(msg);
    }

    await session.cmd('QUIT');
  } finally {
    session.destroy();
  }
}

const DEFAULT_GREYLIST_RETRIES = 2;
const DEFAULT_GREYLIST_RETRY_DELAY_MS = 5 * 60 * 1000;

async function sendMailWithRetry(
  config: SmtpConfig,
  to: string,
  subject: string,
  body: string,
  sleep: (ms: number) => Promise<void>,
): Promise<void> {
  const maxRetries = config.greylistRetries ?? DEFAULT_GREYLIST_RETRIES;
  const delayMs = config.greylistRetryDelayMs ?? DEFAULT_GREYLIST_RETRY_DELAY_MS;

  let lastError: unknown;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    if (attempt > 0) {
      await sleep(delayMs);
    }
    try {
      await sendMail(config, to, subject, body);
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
  readonly senderId = 'smtp';
  readonly senderName = 'SMTP Email';

  private readonly envSnapshot: Record<string, string | undefined>;
  private readonly sleep: (ms: number) => Promise<void>;

  constructor(
    private config: SmtpConfig,
    envSnapshot?: Record<string, string | undefined>,
    sleep?: (ms: number) => Promise<void>,
  ) {
    this.envSnapshot = envSnapshot ?? {};
    this.sleep = sleep ?? ((ms) => new Promise((resolve) => setTimeout(resolve, ms)));
  }

  getEnvValues(): Record<string, string | undefined> {
    return { ...this.envSnapshot };
  }

  getRequiredFields(): string[] {
    return ['host', 'from'];
  }

  isConfigured(): boolean {
    return Boolean(this.config.host);
  }

  getConfig(): Record<string, unknown> {
    return {
      host: this.config.host,
      port: this.config.port,
      from: this.config.from,
      user: this.config.user,
      secure: this.config.secure,
      allowSelfSigned: this.config.allowSelfSigned ?? false,
      authDisabled: this.config.authDisabled ?? false,
      greylistRetries: this.config.greylistRetries ?? DEFAULT_GREYLIST_RETRIES,
      greylistRetryDelayMs: this.config.greylistRetryDelayMs ?? DEFAULT_GREYLIST_RETRY_DELAY_MS,
    };
  }

  setConfig(config: Record<string, unknown>): void {
    if (typeof config.host === 'string') this.config.host = config.host;
    if (typeof config.port === 'number') this.config.port = config.port;
    if (typeof config.from === 'string') this.config.from = config.from;
    if (typeof config.user === 'string') this.config.user = config.user;
    if (typeof config.password === 'string') this.config.password = config.password;
    if (config.secure === 'none' || config.secure === 'tls' || config.secure === 'starttls') {
      this.config.secure = config.secure;
    }
    if (typeof config.allowSelfSigned === 'boolean') this.config.allowSelfSigned = config.allowSelfSigned;
    if (typeof config.authDisabled === 'boolean') this.config.authDisabled = config.authDisabled;
    if (typeof config.greylistRetries === 'number') this.config.greylistRetries = config.greylistRetries;
    if (typeof config.greylistRetryDelayMs === 'number') this.config.greylistRetryDelayMs = config.greylistRetryDelayMs;
  }

  async sendTestEmail(to: string): Promise<void> {
    if (!to) throw new Error('smtp_test_email_requires_recipient');
    await sendMailWithRetry(this.config, to, 'Cognis SMTP Test', 'This is a test email from Cognis.', this.sleep);
  }

  async send(envelope: NotificationEnvelope): Promise<void> {
    if (!envelope.recipientEmail) {
      throw new Error('smtp_sender_requires_recipient_email');
    }
    await sendMailWithRetry(this.config, envelope.recipientEmail, envelope.subject, envelope.body, this.sleep);
  }
}

export function createNotificationSender(env: Record<string, string | undefined>): SmtpNotificationSender {
  const host = env['COGNIS_SMTP_HOST'] ?? '';
  const port = Number.parseInt(env['COGNIS_SMTP_PORT'] ?? '587', 10);
  const from = env['COGNIS_SMTP_FROM'] ?? (host ? `cognis@${host}` : '');
  const user = env['COGNIS_SMTP_USER'];
  const password = env['COGNIS_SMTP_PASS'];
  const rawSecure = env['COGNIS_SMTP_SECURE'] ?? 'starttls';
  const secure = rawSecure === 'tls' ? 'tls' : rawSecure === 'none' ? 'none' : 'starttls';
  const allowSelfSigned = env['COGNIS_SMTP_ALLOW_SELF_SIGNED'] === 'true';
  const authDisabled = env['COGNIS_SMTP_AUTH_DISABLED'] === 'true';
  const ehloHostname = env['HOST'];

  const envSnapshot: Record<string, string | undefined> = {
    host: env['COGNIS_SMTP_HOST'],
    port: env['COGNIS_SMTP_PORT'],
    from: env['COGNIS_SMTP_FROM'],
    user: env['COGNIS_SMTP_USER'],
    secure: env['COGNIS_SMTP_SECURE'],
    allowSelfSigned: env['COGNIS_SMTP_ALLOW_SELF_SIGNED'],
    authDisabled: env['COGNIS_SMTP_AUTH_DISABLED'],
  };

  return new SmtpNotificationSender({ host, port, from, user, password, secure, allowSelfSigned, authDisabled, ehloHostname }, envSnapshot);
}
