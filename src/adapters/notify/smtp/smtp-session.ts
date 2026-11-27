import network from "node:net";
import tls from "node:tls";

interface SmtpResponse {
    code: number;
    text: string;
}

export class SmtpSession {
    private buffer = "";
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
        this.socket.destroy(new Error("smtp_timeout"));
    private pending: ((response: SmtpResponse) => void) | null = null;
    private readonly listener: (data: string) => void;

    constructor(private readonly socket: network.Socket | tls.TLSSocket) {
        this.listener = (data: string) => {
            this.buffer += data;
            this.processBuffer();
        };
        socket.setEncoding("utf8");
        socket.on("data", this.listener);
        socket.on("error", this.onError);
        socket.on("close", this.onClose);
        socket.on("timeout", this.onTimeout);
        socket.setTimeout(SMTP_TIMEOUT_MILLISECONDS);
    }

    private processBuffer(): void {
        while (true) {
            const end = this.buffer.indexOf("\r\n");
            if (end === -1) break;
            const line = this.buffer.slice(0, end);
            this.buffer = this.buffer.slice(end + 2);
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
        this.socket.write(`${command}\r\n`);
        return this.read();
    }

    writeRaw(data: string): void {
        this.socket.write(data);
    }

    detach(): void {
        this.socket.removeListener("data", this.listener);
        this.socket.removeListener("error", this.onError);
        this.socket.removeListener("close", this.onClose);
        this.socket.removeListener("timeout", this.onTimeout);
    }

    get socket(): network.Socket | tls.TLSSocket {
        return this.socket;
    }

    destroy(): void {
        this.socket.destroy();
    }
}

const SMTP_TIMEOUT_MILLISECONDS = 30_000;
export { SMTP_TIMEOUT_MILLISECONDS as SMTP_TIMEOUT_MS };

function awaitConnection<Socket extends network.Socket>(
    socket: Socket,
    event: "connect" | "secureConnect",
): Promise<Socket> {
    return new Promise((resolve, reject) => {
        const timer = setTimeout(
            () => socket.destroy(new Error("smtp_timeout")),
            SMTP_TIMEOUT_MILLISECONDS,
        );
        timer.unref?.();
        const cleanup = () => {
            clearTimeout(timer);
            socket.removeListener(event, connected);
            socket.removeListener("error", failed);
        };
        const connected = () => {
            cleanup();
            resolve(socket);
        };
        const failed = (error: Error) => {
            cleanup();
            socket.destroy();
            reject(error);
        };
        socket.once(event, connected);
        socket.once("error", failed);
    });
}

export async function openSession(
    host: string,
    port: number,
    secure: "tls" | "none" | "starttls",
    allowSelfSigned?: boolean,
    signal?: AbortSignal,
): Promise<SmtpSession> {
    const socket =
        secure === "tls"
            ? await awaitConnection(
                  tls.connect({
                      host,
                      port,
                      servername: network.isIP(host) ? undefined : host,
                      rejectUnauthorized: !allowSelfSigned,
                      signal,
                  }),
                  "secureConnect",
              )
            : await awaitConnection(
                  network.createConnection({ host, port, signal }),
                  "connect",
              );
    return new SmtpSession(socket);
}

export async function upgradeToTls(
    session: SmtpSession,
    host: string,
    allowSelfSigned?: boolean,
    signal?: AbortSignal,
): Promise<SmtpSession> {
    session.detach();
    const socket = await awaitConnection(
        tls.connect({
            socket: session.socket,
            host,
            servername: network.isIP(host) ? undefined : host,
            rejectUnauthorized: !allowSelfSigned,
            signal,
        }),
        "secureConnect",
    );
    return new SmtpSession(socket);
}
