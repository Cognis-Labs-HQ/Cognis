import test from "node:test";
import assert from "node:assert/strict";
import net from "node:net";
import { SmtpNotificationSender } from "../notification-sender.js";

type MockSmtpServer = {
    host: string;
    port: number;
    close: () => Promise<void>;
};

function createMockSmtpServer(
    handleConnection: (conn: net.Socket, attemptNumber: number) => void,
): Promise<MockSmtpServer> {
    let attempts = 0;
    return new Promise((resolve) => {
        const server = net.createServer((conn) => {
            attempts++;
            handleConnection(conn, attempts);
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

const noopSleep = () => Promise.resolve();

test("SmtpNotificationSender strips CR/LF from display name in Subject header", async () => {
    let capturedData = "";

    const server = await createMockSmtpServer((conn) => {
        conn.setEncoding("utf8");
        conn.write("220 mock.example.com SMTP\r\n");

        conn.on("data", (chunk: string) => {
            capturedData += chunk;
            const upper = chunk.toUpperCase();
            if (upper.includes("EHLO") || upper.includes("HELO"))
                conn.write("250 OK\r\n");
            if (upper.includes("MAIL FROM")) conn.write("250 OK\r\n");
            if (upper.includes("RCPT TO")) conn.write("250 OK\r\n");
            if (upper.includes("\r\nDATA\r\n") || chunk.trim() === "DATA")
                conn.write("354 Start mail input\r\n");
            if (chunk.includes("\r\n.\r\n")) conn.write("250 OK\r\n");
            if (upper.includes("QUIT")) {
                conn.write("221 Bye\r\n");
                conn.end();
            }
        });
    });

    try {
        const sender = new SmtpNotificationSender(
            {
                host: server.host,
                port: server.port,
                from: "test@example.com",
                secure: "none",
                greylistRetries: 0,
            },
            undefined,
            noopSleep,
        );
        const maliciousName =
            "Attacker\r\nBcc: victim@evil.example.com\r\nX-Injected: yes";
        const inviteUrl = "https://cognis.example.com/register?token=abc";
        await sender.sendRegistrationInviteEmail(
            "target@example.com",
            maliciousName,
            inviteUrl,
        );
        const headerSection = capturedData.split("\r\n\r\n")[0] ?? "";
        const headerLines = headerSection.split("\r\n");
        const subjectLine = headerLines.find((line) =>
            line.startsWith("Subject:"),
        );
        assert.ok(subjectLine, "Subject header should be present");
        const injectedBccHeader = headerLines.some((line) =>
            /^Bcc:/i.test(line),
        );
        assert.equal(
            injectedBccHeader,
            false,
            "No Bcc header should be injected into the SMTP headers",
        );
        const injectedCustomHeader = headerLines.some((line) =>
            /^X-Injected:/i.test(line),
        );
        assert.equal(
            injectedCustomHeader,
            false,
            "No X-Injected header should be injected into the SMTP headers",
        );
        assert.ok(
            subjectLine.includes("Attacker"),
            "Subject header should retain the sanitized display name",
        );
    } finally {
        await server.close();
    }
});
