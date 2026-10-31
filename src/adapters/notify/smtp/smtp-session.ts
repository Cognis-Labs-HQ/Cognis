import net from "node:net";
import tls from "node:tls";

interface SmtpResponse {
    code: number;
    text: string;
}

export class SmtpSession {
    private buf = "";
    private failure?: Error;
    private rejectPending?: (error: Error) => void;
    private readonly onError = (error: Error) => {
        this.failure = error;
        this.rejectPending?.(error);
        this.rejectPending = undefined;
        this.pending = null;
    };
    private readonly onClose = () =>
        this.onError(this.failure ?? new Error("smtp_connection_closed"));
    private readonly onTimeout = () =>
        this.sock.destroy(new Error("smtp_timeout"));
    private pending: ((r: SmtpResponse) => void) | null = null;
    private readonly listener: (d: string) => void;

    constructor(private readonly sock: net.Socket | tls.TLSSocket) {
        this.listener = (d: string) => {
            this.buf += d;
            this.processBuffer();
        };
        sock.setEncoding("utf8");
        sock.on("data", this.listener);
        sock.on("error", this.onError);
        sock.on("close", this.onClose);
        sock.on("timeout", this.onTimeout);
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
                this.rejectPending = undefined;
                resolve({ code, text: line.length > 4 ? line.slice(4) : "" });
                return;
            }
        }
    }

    read(): Promise<SmtpResponse> {
        if (this.failure) return Promise.reject(this.failure);
        return new Promise((resolve, reject) => {
            this.rejectPending = reject;
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
        this.sock.removeListener("error", this.onError);
        this.sock.removeListener("close", this.onClose);
        this.sock.removeListener("timeout", this.onTimeout);
    }

    get socket(): net.Socket | tls.TLSSocket {
        return this.sock;
    }

    destroy(): void {
        this.sock.destroy();
    }
}

export const SMTP_TIMEOUT_MS = 30_000;

export async function openSession(
    host: string,
    port: number,
    secure: "tls" | "none" | "starttls",
    allowSelfSigned?: boolean,
    signal?: AbortSignal,
): Promise<SmtpSession> {
    if (secure === "tls") {
        const sock = await new Promise<tls.TLSSocket>((resolve, reject) => {
            const tlsSock = tls.connect({
                host,
                port,
                rejectUnauthorized: !allowSelfSigned,
                signal,
            });
            tlsSock.once("secureConnect", () => resolve(tlsSock));
            tlsSock.once("error", reject);
        });
        return new SmtpSession(sock);
    }

    const sock = await new Promise<net.Socket>((resolve, reject) => {
        const plainSock = net.createConnection({ host, port, signal });
        plainSock.once("connect", () => resolve(plainSock));
        plainSock.once("error", reject);
    });
    return new SmtpSession(sock);
}

export async function upgradeToTls(
    session: SmtpSession,
    allowSelfSigned?: boolean,
    signal?: AbortSignal,
): Promise<SmtpSession> {
    session.detach();
    const rawSock = session.socket as net.Socket;
    const tlsSock = await new Promise<tls.TLSSocket>((resolve, reject) => {
        const newTlsSock = tls.connect({
            socket: rawSock,
            rejectUnauthorized: !allowSelfSigned,
            signal,
        });
        newTlsSock.once("secureConnect", () => resolve(newTlsSock));
        newTlsSock.once("error", reject);
    });
    return new SmtpSession(tlsSock);
}
