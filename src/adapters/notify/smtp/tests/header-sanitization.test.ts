import { createTestSender } from "./fixtures/sender.js";
import test from "node:test";
import assert from "node:assert/strict";
import network from "node:net";

type MockSmtpServer = {
    host: string;
    port: number;
    close: () => Promise<void>;
};

function createMockSmtpServer(
    handleConnection: (
        connection: network.Socket,
        attemptNumber: number,
    ) => void,
): Promise<MockSmtpServer> {
    let attempts = 0;
    return new Promise((resolve) => {
        const server = network.createServer((connection) => {
            attempts++;
            handleConnection(connection, attempts);
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

const noOperationSleep = () => Promise.resolve();

test("SmtpNotificationSender strips CR/LF from display name in Subject header", async () => {
    let capturedData = "";

    const server = await createMockSmtpServer((connection) => {
        connection.setEncoding("utf8");
        connection.write("220 mock.example.com SMTP\r\n");

        connection.on("data", (chunk: string) => {
            capturedData += chunk;
            const upper = chunk.toUpperCase();
            if (upper.includes("EHLO") || upper.includes("HELO"))
                connection.write("250 OK\r\n");
            if (upper.includes("MAIL FROM")) connection.write("250 OK\r\n");
            if (upper.includes("RCPT TO")) connection.write("250 OK\r\n");
            if (upper.includes("\r\nDATA\r\n") || chunk.trim() === "DATA")
                connection.write("354 Start mail input\r\n");
            if (chunk.includes("\r\n.\r\n")) connection.write("250 OK\r\n");
            if (upper.includes("QUIT")) {
                connection.write("221 Bye\r\n");
                connection.end();
            }
        });
    });

    try {
        const sender = await createTestSender(
            {
                host: server.host,
                port: server.port,
                from: "test@example.com",
                secure: "none",
                greylistRetries: 0,
            },
            undefined,
            noOperationSleep,
        );
        const maliciousName =
            "Attacker\r\nBcc: victim@evil.example.com\r\nX-Injected: yes";
        const inviteUrl = "https://cognis.example.com/register?token=abc";
        await sender.send({
            purpose: "test",
            category: "test",
            recipientUsername: "target",
            recipientEmail: "target@example.com",
            subject: `${maliciousName} invited you`,
            body: maliciousName,
            metadata: { verifyUrl: inviteUrl, verifyButtonLabel: "Sign Up" },
        });
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
