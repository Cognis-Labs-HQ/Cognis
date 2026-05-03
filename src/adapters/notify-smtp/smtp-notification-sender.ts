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

async function openSession(host: string, port: number, secure: 'tls' | 'none' | 'starttls'): Promise<SmtpSession> {
  if (secure === 'tls') {
    const sock = await new Promise<tls.TLSSocket>((resolve, reject) => {
      const tlsSock = tls.connect({ host, port });
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

async function upgradeToTls(session: SmtpSession): Promise<SmtpSession> {
  session.detach();
  const rawSock = session.socket as net.Socket;
  const tlsSock = await new Promise<tls.TLSSocket>((resolve, reject) => {
    const newTlsSock = tls.connect({ socket: rawSock });
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
  let session = await openSession(config.host, config.port, config.secure);

  try {
    session.socket.setTimeout(SMTP_TIMEOUT_MS);

    const greeting = await session.read();
    if (greeting.code !== 220) {
      throw new Error(`smtp_unexpected_greeting:${greeting.code}`);
    }

    let ehlo = await session.cmd('EHLO localhost');
    if (ehlo.code !== 250) {
      throw new Error(`smtp_ehlo_failed:${ehlo.code}`);
    }

    if (config.secure === 'starttls') {
      const starttls = await session.cmd('STARTTLS');
      if (starttls.code !== 220) {
        throw new Error(`smtp_starttls_failed:${starttls.code}`);
      }
      session = await upgradeToTls(session);
      ehlo = await session.cmd('EHLO localhost');
      if (ehlo.code !== 250) {
        throw new Error(`smtp_ehlo_after_tls_failed:${ehlo.code}`);
      }
    }

    if (config.user && config.password) {
      // SASL PLAIN format: \0authcid\0password (RFC 4616)
      const creds = Buffer.from(`\0${config.user}\0${config.password}`).toString('base64');
      const auth = await session.cmd(`AUTH PLAIN ${creds}`);
      if (auth.code !== 235) {
        throw new Error(`smtp_auth_failed:${auth.code}`);
      }
    }

    const mailFrom = await session.cmd(`MAIL FROM:<${config.from}>`);
    if (mailFrom.code !== 250) {
      throw new Error(`smtp_mail_from_failed:${mailFrom.code}`);
    }

    const rcptTo = await session.cmd(`RCPT TO:<${to}>`);
    if (rcptTo.code !== 250 && rcptTo.code !== 251) {
      throw new Error(`smtp_rcpt_to_failed:${rcptTo.code}`);
    }

    const dataCmd = await session.cmd('DATA');
    if (dataCmd.code !== 354) {
      throw new Error(`smtp_data_cmd_failed:${dataCmd.code}`);
    }

    session.writeRaw(buildMessage(config.from, to, subject, body));
    const sent = await session.read();
    if (sent.code !== 250) {
      throw new Error(`smtp_message_rejected:${sent.code}`);
    }

    await session.cmd('QUIT');
  } finally {
    session.destroy();
  }
}

export class SmtpNotificationSender implements NotificationSender {
  readonly senderId = 'smtp';
  readonly senderName = 'SMTP Email';

  constructor(private config: SmtpConfig) {}

  getConfig(): Record<string, unknown> {
    return {
      host: this.config.host,
      port: this.config.port,
      from: this.config.from,
      user: this.config.user,
      secure: this.config.secure,
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
  }

  async sendTestEmail(to: string): Promise<void> {
    if (!to) throw new Error('smtp_test_email_requires_recipient');
    await sendMail(this.config, to, 'Cognis SMTP Test', 'This is a test email from Cognis.');
  }

  async send(envelope: NotificationEnvelope): Promise<void> {
    if (!envelope.recipientEmail) {
      throw new Error('smtp_sender_requires_recipient_email');
    }
    await sendMail(this.config, envelope.recipientEmail, envelope.subject, envelope.body);
  }
}

export function createNotificationSender(env: Record<string, string | undefined>): SmtpNotificationSender | null {
  const host = env['COGNIS_SMTP_HOST'];
  if (!host) return null;

  const port = Number.parseInt(env['COGNIS_SMTP_PORT'] ?? '587', 10);
  const from = env['COGNIS_SMTP_FROM'] ?? `cognis@${host}`;
  const user = env['COGNIS_SMTP_USER'];
  const password = env['COGNIS_SMTP_PASS'];
  const rawSecure = env['COGNIS_SMTP_SECURE'] ?? 'starttls';
  const secure = rawSecure === 'tls' ? 'tls' : rawSecure === 'none' ? 'none' : 'starttls';

  return new SmtpNotificationSender({ host, port, from, user, password, secure });
}
