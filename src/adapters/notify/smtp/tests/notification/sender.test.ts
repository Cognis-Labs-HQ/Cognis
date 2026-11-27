import { createTestSender } from "../fixtures/sender.js";
import test from "node:test";
import assert from "node:assert/strict";
import network from "node:net";
import {
    SmtpNotificationSender,
    SmtpTemporaryError,
} from "../../notification-sender.js";
import { SmtpRateLimiter } from "../../notification-queue.js";
import { createNotificationSender } from "../../notification-sender-factory.js";
test("createNotificationSender always returns a sender instance", () => {
    const sender = createNotificationSender({});
    assert.ok(sender instanceof SmtpNotificationSender);
    assert.equal(sender.isConfigured(), false);
});
test("createNotificationSender returns a sender when host is configured", () => {
    const sender = createNotificationSender({
        COGNIS_SMTP_HOST: "mail.example.com",
    });
    assert.ok(sender instanceof SmtpNotificationSender);
    assert.equal(sender.senderId, "smtp");
});
test("createNotificationSender applies defaults for port, secure mode, and from address", () => {
    const environment = { COGNIS_SMTP_HOST: "smtp.example.com" };
    const sender = createNotificationSender(environment);
    assert.ok(sender !== null);
    assert.equal(sender.senderId, "smtp");
});
test("createNotificationSender accepts explicit port, secure mode, and credentials", () => {
    const environment = {
        COGNIS_SMTP_HOST: "smtp.example.com",
        COGNIS_SMTP_PORT: "465",
        COGNIS_SMTP_SECURE: "tls",
        COGNIS_SMTP_FROM: "no-reply@example.com",
        COGNIS_SMTP_USER: "user@example.com",
        COGNIS_SMTP_PASS: "s3cret",
    };
    const sender = createNotificationSender(environment);
    assert.ok(sender instanceof SmtpNotificationSender);
    assert.equal(sender.senderId, "smtp");
});
test("SmtpNotificationSender.send rejects when recipientEmail is absent", async () => {
    const sender = await createTestSender({
        host: "smtp.example.com",
        port: 587,
        from: "no-reply@example.com",
        secure: "starttls",
    });
    await assert.rejects(
        () =>
            sender.send({
                purpose: "test",
                category: "account_alert",
                recipientUsername: "alice",
                subject: "Test",
                body: "Hello",
            }),
        /smtp_sender_requires_recipient_email/,
    );
});
test("SmtpNotificationSender.getConfig returns current configuration without password", async () => {
    const sender = await createTestSender({
        host: "smtp.example.com",
        port: 587,
        from: "no-reply@example.com",
        secure: "starttls",
        user: "user@example.com",
    });
    const config = sender.getConfig();
    assert.equal(config.host, "smtp.example.com");
    assert.equal(config.port, 587);
    assert.equal(config.from, "no-reply@example.com");
    assert.equal(config.secure, "starttls");
    assert.equal(config.user, "user@example.com");
    assert.ok(!Object.prototype.hasOwnProperty.call(config, "pass"));
});
test("SmtpNotificationSender.setConfig updates host and port", async () => {
    const sender = await createTestSender({
        host: "old.example.com",
        port: 587,
        from: "no-reply@example.com",
        secure: "starttls",
    });
    sender.setConfig({ host: "new.example.com", port: 465 });
    const config = sender.getConfig();
    assert.equal(config.host, "new.example.com");
    assert.equal(config.port, 465);
});
test("SmtpNotificationSender exposes configurable verification code length", async () => {
    const sender = await createTestSender({
        host: "smtp.example.com",
        port: 587,
        from: "no-reply@example.com",
        secure: "starttls",
        codeLength: 8,
    });
    assert.equal(sender.getCodeLength(), 8);
    assert.equal(sender.getConfig().codeLength, 8);
    sender.setConfig({ codeLength: 12 });
    assert.equal(sender.getCodeLength(), 10);
    assert.equal(sender.getConfig().codeLength, 10);
});
test("SmtpNotificationSender.senderName returns descriptive name", async () => {
    const sender = await createTestSender({
        host: "smtp.example.com",
        port: 587,
        from: "no-reply@example.com",
        secure: "starttls",
    });
    assert.equal(typeof sender.senderName, "string");
    assert.ok(sender.senderName.length > 0);
});
test("SmtpNotificationSender.sendTestEmail rejects when to address is empty", async () => {
    const sender = await createTestSender({
        host: "smtp.example.com",
        port: 587,
        from: "no-reply@example.com",
        secure: "starttls",
    });
    await assert.rejects(
        () => sender.sendTestEmail("test", ""),
        /smtp_test_email_requires_recipient/,
    );
});
test("SmtpNotificationSender.enqueueEmail returns a waiting rate-limit entry immediately", async () => {
    const now = Date.now();
    const rateLimiter = new SmtpRateLimiter(60_000, () => now);
    rateLimiter.record("alice@example.com", now);
    const sender = await createTestSender(
        {
            host: "smtp.example.com",
            port: 587,
            from: "no-reply@example.com",
            secure: "starttls",
        },
        undefined,
        async () => new Promise(() => {}),
        () => rateLimiter,
    );
    const queued = await sender.enqueueEmail(
        { purpose: "test", recipientEmail: "alice@example.com", variables: {} },
        { subject: "Code", body: "123456" },
    );
    assert.equal(queued.status, "waiting_rate_limit");
    assert.equal(queued.recipientEmail, "alice@example.com");
    assert.equal(typeof queued.availableAt, "string");
});

test("createNotificationSender.getEnvValues returns env snapshot fields", () => {
    const environment = {
        COGNIS_SMTP_HOST: "smtp.example.com",
        COGNIS_SMTP_PORT: "465",
        COGNIS_SMTP_FROM: "no-reply@example.com",
        COGNIS_SMTP_USER: "user@example.com",
        COGNIS_SMTP_SECURE: "tls",
    };
    const sender = createNotificationSender(environment);
    const environmentValues = sender.getEnvValues();
    assert.equal(environmentValues["host"], "smtp.example.com");
    assert.equal(environmentValues["port"], "465");
    assert.equal(environmentValues["from"], "no-reply@example.com");
    assert.equal(environmentValues["user"], "user@example.com");
    assert.equal(environmentValues["secure"], "tls");
});
test("createNotificationSender.getEnvValues returns undefined fields when env is empty", () => {
    const sender = createNotificationSender({});
    const environmentValues = sender.getEnvValues();
    assert.equal(environmentValues["host"], undefined);
    assert.equal(environmentValues["port"], undefined);
    assert.equal(environmentValues["from"], undefined);
    assert.equal(environmentValues["user"], undefined);
    assert.equal(environmentValues["secure"], undefined);
});

test("SmtpNotificationSender.getRequiredFields requires auth fields by default", () => {
    const sender = createNotificationSender({});
    const required = sender.getRequiredFields();
    assert.deepEqual(required, ["host", "from", "user", "password"]);
});

test("SmtpNotificationSender.getRequiredFields omits auth fields when authentication is disabled", () => {
    const sender = createNotificationSender({
        COGNIS_SMTP_AUTH_DISABLED: "true",
    });
    const required = sender.getRequiredFields();
    assert.deepEqual(required, ["host", "from"]);
});

test("SmtpNotificationSender.setConfig applies allowSelfSigned and authDisabled", async () => {
    const sender = await createTestSender({
        host: "smtp.example.com",
        port: 587,
        from: "no-reply@example.com",
        secure: "starttls",
    });
    sender.setConfig({ allowSelfSigned: true, authDisabled: true });
    const config = sender.getConfig();
    assert.equal(config.allowSelfSigned, true);
    assert.equal(config.authDisabled, true);
});

test("createNotificationSender reads COGNIS_SMTP_ALLOW_SELF_SIGNED and COGNIS_SMTP_AUTH_DISABLED", () => {
    const sender = createNotificationSender({
        COGNIS_SMTP_HOST: "smtp.example.com",
        COGNIS_SMTP_ALLOW_SELF_SIGNED: "true",
        COGNIS_SMTP_AUTH_DISABLED: "true",
    });
    const config = sender.getConfig();
    assert.equal(config.allowSelfSigned, true);
    assert.equal(config.authDisabled, true);
});

test("createNotificationSender uses HOST env var as ehloHostname", () => {
    const sender = createNotificationSender({
        COGNIS_SMTP_HOST: "smtp.example.com",
        HOST: "my-server.example.com",
    });
    const config = sender.getConfig();
    assert.equal(config.host, "smtp.example.com");
});

test("createNotificationSender falls back gracefully when HOST is unset", () => {
    const sender = createNotificationSender({
        COGNIS_SMTP_HOST: "smtp.example.com",
    });
    assert.ok(sender instanceof SmtpNotificationSender);
});

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
                    new Promise<void>((currentResolve, reject) =>
                        server.close((error) =>
                            error ? reject(error) : currentResolve(),
                        ),
                    ),
            });
        });
    });
}

function smtpSuccessHandler(connection: network.Socket): void {
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

const noOperationSleep = () => Promise.resolve();

function decodeQuotedPrintableForAssertion(value: string): string {
    return value
        .replace(/=\r\n/g, "")
        .replace(/=([0-9A-F]{2})/gi, (_match, hex: string) =>
            String.fromCharCode(Number.parseInt(hex, 16)),
        );
}

function unfoldHeadersForAssertion(value: string): string {
    return value.replace(/\r\n[ \t]+/g, " ");
}

test("SmtpNotificationSender retries after greylisting (4xx on MAIL FROM) and succeeds on second attempt", async () => {
    let sleepCallCount = 0;
    const trackingSleep = () => {
        sleepCallCount++;
        return Promise.resolve();
    };

    const server = await createMockSmtpServer((connection, attempt) => {
        let buffer = "";
        connection.setEncoding("utf8");
        connection.write("220 mock.example.com SMTP\r\n");

        connection.on("data", (chunk: string) => {
            buffer += chunk;
            const lines = buffer.split("\r\n");
            buffer = lines.pop() ?? "";

            for (const line of lines) {
                if (!line) continue;
                const upper = line.toUpperCase();
                if (upper.startsWith("EHLO") || upper.startsWith("HELO")) {
                    connection.write("250 OK\r\n");
                } else if (upper.startsWith("MAIL FROM")) {
                    if (attempt === 1) {
                        connection.write(
                            "451 Greylisted, please retry later\r\n",
                        );
                    } else {
                        connection.write("250 OK\r\n");
                    }
                } else if (upper.startsWith("RCPT TO")) {
                    connection.write("250 OK\r\n");
                } else if (upper === "DATA") {
                    connection.write("354 Start mail input\r\n");
                } else if (line === ".") {
                    connection.write("250 OK\r\n");
                } else if (upper.startsWith("QUIT")) {
                    connection.write("221 Bye\r\n");
                    connection.end();
                }
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
                greylistRetries: 1,
            },
            undefined,
            trackingSleep,
        );
        await sender.send({
            purpose: "test",
            category: "test",
            recipientUsername: "alice",
            recipientEmail: "alice@example.com",
            subject: "Hi",
            body: "Test",
        });
        assert.equal(sleepCallCount, 1);
    } finally {
        await server.close();
    }
});

test("SmtpNotificationSender does not retry on permanent SMTP errors (5xx)", async () => {
    let connectionCount = 0;

    const server = await createMockSmtpServer((connection) => {
        connectionCount++;
        let buffer = "";
        connection.setEncoding("utf8");
        connection.write("220 mock.example.com SMTP\r\n");

        connection.on("data", (chunk: string) => {
            buffer += chunk;
            const lines = buffer.split("\r\n");
            buffer = lines.pop() ?? "";

            for (const line of lines) {
                if (!line) continue;
                const upper = line.toUpperCase();
                if (upper.startsWith("EHLO") || upper.startsWith("HELO")) {
                    connection.write("250 OK\r\n");
                } else if (upper.startsWith("MAIL FROM")) {
                    connection.write("550 User unknown\r\n");
                }
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
                greylistRetries: 2,
            },
            undefined,
            noOperationSleep,
        );
        await assert.rejects(
            () =>
                sender.send({
                    purpose: "test",
                    category: "test",
                    recipientUsername: "alice",
                    recipientEmail: "alice@example.com",
                    subject: "Hi",
                    body: "Test",
                }),
            /smtp_mail_from_failed:550/,
        );
        assert.equal(connectionCount, 1);
    } finally {
        await server.close();
    }
});

test("SmtpNotificationSender exhausts retries and throws SmtpTemporaryError", async () => {
    const server = await createMockSmtpServer((connection) => {
        let buffer = "";
        connection.setEncoding("utf8");
        connection.write("220 mock.example.com SMTP\r\n");

        connection.on("data", (chunk: string) => {
            buffer += chunk;
            const lines = buffer.split("\r\n");
            buffer = lines.pop() ?? "";

            for (const line of lines) {
                if (!line) continue;
                const upper = line.toUpperCase();
                if (upper.startsWith("EHLO") || upper.startsWith("HELO")) {
                    connection.write("250 OK\r\n");
                } else if (upper.startsWith("MAIL FROM")) {
                    connection.write("451 Greylisted\r\n");
                }
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
                greylistRetries: 1,
            },
            undefined,
            noOperationSleep,
        );
        await assert.rejects(
            () =>
                sender.send({
                    purpose: "test",
                    category: "test",
                    recipientUsername: "alice",
                    recipientEmail: "alice@example.com",
                    subject: "Hi",
                    body: "Test",
                }),
            SmtpTemporaryError,
        );
    } finally {
        await server.close();
    }
});

test("SmtpNotificationSender with greylistRetries:0 does not retry on 4xx", async () => {
    let connectionCount = 0;

    const server = await createMockSmtpServer((connection) => {
        connectionCount++;
        let buffer = "";
        connection.setEncoding("utf8");
        connection.write("220 mock.example.com SMTP\r\n");

        connection.on("data", (chunk: string) => {
            buffer += chunk;
            const lines = buffer.split("\r\n");
            buffer = lines.pop() ?? "";

            for (const line of lines) {
                if (!line) continue;
                const upper = line.toUpperCase();
                if (upper.startsWith("EHLO") || upper.startsWith("HELO")) {
                    connection.write("250 OK\r\n");
                } else if (upper.startsWith("MAIL FROM")) {
                    connection.write("451 Greylisted\r\n");
                }
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
        await assert.rejects(
            () =>
                sender.send({
                    purpose: "test",
                    category: "test",
                    recipientUsername: "alice",
                    recipientEmail: "alice@example.com",
                    subject: "Hi",
                    body: "Test",
                }),
            SmtpTemporaryError,
        );
        assert.equal(connectionCount, 1);
    } finally {
        await server.close();
    }
});

test("SmtpNotificationSender.getConfig includes greylistRetries and greylistRetryDelayMs", async () => {
    const sender = await createTestSender({
        host: "smtp.example.com",
        port: 587,
        from: "no-reply@example.com",
        secure: "starttls",
        greylistRetries: 3,
        greylistRetryDelayMs: 60_000,
    });
    const config = sender.getConfig();
    assert.equal(config.greylistRetries, 3);
    assert.equal(config.greylistRetryDelayMs, 60_000);
});

test("SmtpNotificationSender.setConfig updates greylistRetries and greylistRetryDelayMs", async () => {
    const sender = await createTestSender({
        host: "smtp.example.com",
        port: 587,
        from: "no-reply@example.com",
        secure: "starttls",
    });
    sender.setConfig({ greylistRetries: 5, greylistRetryDelayMs: 120_000 });
    const config = sender.getConfig();
    assert.equal(config.greylistRetries, 5);
    assert.equal(config.greylistRetryDelayMs, 120_000);
});

test("createNotificationSender reads EXTERNAL_HOST env var", () => {
    const sender = createNotificationSender({
        COGNIS_SMTP_HOST: "smtp.example.com",
        EXTERNAL_HOST: "https://cognis.example.com",
    });
    assert.ok(sender instanceof SmtpNotificationSender);
});

test("createNotificationSender derives EXTERNAL_HOST from HOST when EXTERNAL_HOST is absent", () => {
    const sender = createNotificationSender({
        COGNIS_SMTP_HOST: "smtp.example.com",
        HOST: "cognis.example.com",
    });
    assert.ok(sender instanceof SmtpNotificationSender);
});

test("SmtpNotificationSender email includes light theme colors and subject when theme is light", async () => {
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
                externalHost: "https://cognis.example.com",
            },
            undefined,
            noOperationSleep,
        );
        await sender.send({
            purpose: "test",
            category: "test",
            recipientUsername: "alice",
            recipientEmail: "alice@example.com",
            subject: "Hello World",
            body: "Test body",
            metadata: { theme: "light" },
        });
        assert.ok(
            capturedData.includes("Hello World"),
            "subject should appear in email data",
        );
        assert.ok(
            capturedData.includes("#e8eef9"),
            "light theme outer background color should be present",
        );
        const decodedTransferBody =
            decodeQuotedPrintableForAssertion(capturedData);
        assert.ok(
            decodedTransferBody.includes(
                "cognis.example.com/assets/icons/cognis-icon.png",
            ),
            "icon URL should be present",
        );
        assert.ok(
            capturedData.includes("href="),
            "Cognis hyperlink should be present",
        );
    } finally {
        await server.close();
    }
});

test("SmtpNotificationSender email uses its recipient theme rather than caller metadata", async () => {
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
        sender.setRecipientThemeResolver(async () => "dark");
        await sender.send({
            purpose: "test",
            category: "test",
            recipientUsername: "alice",
            recipientEmail: "alice@example.com",
            subject: "Dark Email",
            body: "Test body",
            metadata: { theme: "dark" },
        });
        assert.ok(
            capturedData.includes("#0a1628"),
            "dark theme outer background color should be present",
        );
    } finally {
        await server.close();
    }
});

test("SmtpNotificationSender email defaults to light theme when metadata.theme is absent", async () => {
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
        await sender.send({
            purpose: "test",
            category: "test",
            recipientUsername: "default-theme-recipient",
            recipientEmail: "default-theme-recipient@example.com",
            subject: "Default Theme",
            body: "Test body",
        });
        assert.ok(
            capturedData.includes("#e8eef9"),
            "should default to light theme outer background color",
        );
    } finally {
        await server.close();
    }
});

test("SmtpNotificationSender registration invites use Sign Up CTA and clickable invite URL in body", async () => {
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
        const inviteUrl =
            "https://cognis.example.com/register?token=test-token-value";
        await sender.send({
            purpose: "test",
            category: "test",
            recipientUsername: "alice",
            recipientEmail: "alice@example.com",
            subject: "Invitation",
            body: "Inviter invited you",
            metadata: {
                theme: "light",
                verifyUrl: inviteUrl,
                verifyButtonLabel: "Sign Up",
            },
        });
        assert.ok(
            capturedData.includes("Sign Up"),
            "registration email should use Sign Up CTA",
        );
        const decodedTransferBody =
            decodeQuotedPrintableForAssertion(capturedData);
        assert.ok(
            decodedTransferBody.includes(`href="${inviteUrl}"`),
            "registration email should include clickable invite URL link",
        );
    } finally {
        await server.close();
    }
});

test("SmtpNotificationSender emits provider-required message headers and MIME parts", async () => {
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
                from: "no-reply@example.com",
                senderName: "Cognis Notifications",
                secure: "none",
                greylistRetries: 0,
                externalHost: "https://cognis.example.com",
            },
            undefined,
            noOperationSleep,
        );
        await sender.send({
            purpose: "test",
            category: "test",
            recipientUsername: "alice",
            recipientEmail: "alice@example.com",
            subject: "Provider compliance",
            body: "A body with UTF-8: café",
        });

        const headerSection = capturedData.split("\r\n\r\n")[0] ?? "";
        assert.match(headerSection, /^Date: .+ GMT$/m);
        assert.match(
            headerSection,
            /^Message-ID: <[A-Za-z0-9._-]+@[a-z0-9.-]+>$/m,
        );
        assert.match(
            headerSection,
            /^From: Cognis Notifications <no-reply@example\.com>$/m,
        );
        assert.match(headerSection, /^MIME-Version: 1\.0$/m);
        assert.match(headerSection, /^Auto-Submitted: auto-generated$/m);
        assert.match(
            unfoldHeadersForAssertion(capturedData),
            /Content-Type: multipart\/alternative; boundary="cognis-[^"]+"/,
        );
        assert.match(capturedData, /Content-Type: text\/plain; charset=UTF-8/);
        assert.match(capturedData, /Content-Type: text\/html; charset=UTF-8/);
        assert.match(
            capturedData,
            /Content-Transfer-Encoding: quoted-printable/,
        );
        assert.ok(
            capturedData
                .split("\r\n")
                .every((line) => line.length <= 998 || line === "."),
            "SMTP data lines should stay within the RFC 5321 hard limit",
        );
    } finally {
        await server.close();
    }
});
