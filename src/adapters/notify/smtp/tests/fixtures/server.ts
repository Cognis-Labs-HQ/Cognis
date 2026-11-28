import network from "node:net";

type MockSmtpServer = {
    host: string;
    port: number;
    close: () => Promise<void>;
};

export function createMockSmtpServer(
    handleConnection: (connection: network.Socket) => void,
): Promise<MockSmtpServer> {
    return new Promise((resolve) => {
        const server = network.createServer((connection) => {
            handleConnection(connection);
        });
        server.listen(0, "127.0.0.1", () => {
            const address = server.address() as network.AddressInfo;
            resolve({
                host: "127.0.0.1",
                port: address.port,
                close: () =>
                    new Promise<void>((res, reject) =>
                        server.close((error) =>
                            error ? reject(error) : res(),
                        ),
                    ),
            });
        });
    });
}

export function smtpSuccessHandler(connection: network.Socket): void {
    let buffer = "";
    let dataMode = false;
    connection.setEncoding("utf8");
    connection.write("220 mock.example.com SMTP\r\n");

    connection.on("data", (chunk: string) => {
        buffer += chunk;
        const lines = buffer.split("\r\n");
        buffer = lines.pop() ?? "";
        for (const line of lines) {
            if (dataMode) {
                if (line === ".") {
                    dataMode = false;
                    connection.write("250 OK\r\n");
                }
                continue;
            }
            if (!line) continue;
            const upper = line.toUpperCase();
            if (upper.startsWith("EHLO") || upper.startsWith("HELO")) {
                connection.write("250 OK\r\n");
            } else if (upper.startsWith("MAIL FROM")) {
                connection.write("250 OK\r\n");
            } else if (upper.startsWith("RCPT TO")) {
                connection.write("250 OK\r\n");
            } else if (upper === "DATA") {
                dataMode = true;
                connection.write("354 Start mail input\r\n");
            } else if (upper.startsWith("QUIT")) {
                connection.write("221 Bye\r\n");
                connection.end();
            }
        }
    });
}
