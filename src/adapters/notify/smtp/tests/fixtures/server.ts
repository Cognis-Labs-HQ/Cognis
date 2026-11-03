import net from "node:net";

type MockSmtpServer = {
    host: string;
    port: number;
    close: () => Promise<void>;
};

export function createMockSmtpServer(
    handleConnection: (conn: net.Socket) => void,
): Promise<MockSmtpServer> {
    return new Promise((resolve) => {
        const server = net.createServer((conn) => {
            handleConnection(conn);
        });
        server.listen(0, "127.0.0.1", () => {
            const addr = server.address() as net.AddressInfo;
            resolve({
                host: "127.0.0.1",
                port: addr.port,
                close: () =>
                    new Promise<void>((res, rej) =>
                        server.close((err) => (err ? rej(err) : res())),
                    ),
            });
        });
    });
}

export function smtpSuccessHandler(conn: net.Socket): void {
    let buf = "";
    let dataMode = false;
    conn.setEncoding("utf8");
    conn.write("220 mock.example.com SMTP\r\n");

    conn.on("data", (chunk: string) => {
        buf += chunk;
        const lines = buf.split("\r\n");
        buf = lines.pop() ?? "";
        for (const line of lines) {
            if (dataMode) {
                if (line === ".") {
                    dataMode = false;
                    conn.write("250 OK\r\n");
                }
                continue;
            }
            if (!line) continue;
            const upper = line.toUpperCase();
            if (upper.startsWith("EHLO") || upper.startsWith("HELO")) {
                conn.write("250 OK\r\n");
            } else if (upper.startsWith("MAIL FROM")) {
                conn.write("250 OK\r\n");
            } else if (upper.startsWith("RCPT TO")) {
                conn.write("250 OK\r\n");
            } else if (upper === "DATA") {
                dataMode = true;
                conn.write("354 Start mail input\r\n");
            } else if (upper.startsWith("QUIT")) {
                conn.write("221 Bye\r\n");
                conn.end();
            }
        }
    });
}
