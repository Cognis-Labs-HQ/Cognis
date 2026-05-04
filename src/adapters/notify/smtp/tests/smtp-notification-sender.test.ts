import test from "node:test";
import assert from "node:assert/strict";
import net from "node:net";
import {
    SmtpNotificationSender,
    SmtpTemporaryError,
    createNotificationSender,
} from "../smtp-notification-sender.js";

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
    const env = { COGNIS_SMTP_HOST: "smtp.example.com" };
    const sender = createNotificationSender(env);
    assert.ok(sender !== null);
    assert.equal(sender.senderId, "smtp");
});

test("createNotificationSender accepts explicit port, secure mode, and credentials", () => {
    const env = {
        COGNIS_SMTP_HOST: "smtp.example.com",
        COGNIS_SMTP_PORT: "465",
        COGNIS_SMTP_SECURE: "tls",
        COGNIS_SMTP_FROM: "no-reply@example.com",
        COGNIS_SMTP_USER: "user@example.com",
        COGNIS_SMTP_PASS: "s3cret",
    };
    const sender = createNotificationSender(env);
    assert.ok(sender instanceof SmtpNotificationSender);
    assert.equal(sender.senderId, "smtp");
});

test("SmtpNotificationSender.send rejects when recipientEmail is absent", async () => {
    const sender = new SmtpNotificationSender({
        host: "smtp.example.com",
        port: 587,
        from: "no-reply@example.com",
        secure: "starttls",
    });

    await assert.rejects(
        () =>
            sender.send({
                category: "account_alert",
                recipientUsername: "alice",
                subject: "Test",
                body: "Hello",
            }),
        /smtp_sender_requires_recipient_email/,
    );
});

test("SmtpNotificationSender.getConfig returns current configuration without password", () => {
    const sender = new SmtpNotificationSender({
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

test("SmtpNotificationSender.setConfig updates host and port", () => {
    const sender = new SmtpNotificationSender({
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

test("SmtpNotificationSender.senderName returns descriptive name", () => {
    const sender = new SmtpNotificationSender({
        host: "smtp.example.com",
        port: 587,
        from: "no-reply@example.com",
        secure: "starttls",
    });
    assert.equal(typeof sender.senderName, "string");
    assert.ok(sender.senderName.length > 0);
});

test("SmtpNotificationSender.sendTestEmail rejects when to address is empty", async () => {
    const sender = new SmtpNotificationSender({
        host: "smtp.example.com",
        port: 587,
        from: "no-reply@example.com",
        secure: "starttls",
    });
    await assert.rejects(
        () => sender.sendTestEmail(""),
        /smtp_test_email_requires_recipient/,
    );
});

test("createNotificationSender.getEnvValues returns env snapshot fields", () => {
    const env = {
        COGNIS_SMTP_HOST: "smtp.example.com",
        COGNIS_SMTP_PORT: "465",
        COGNIS_SMTP_FROM: "no-reply@example.com",
        COGNIS_SMTP_USER: "user@example.com",
        COGNIS_SMTP_SECURE: "tls",
    };
    const sender = createNotificationSender(env);
    const envValues = sender.getEnvValues();
    assert.equal(envValues["host"], "smtp.example.com");
    assert.equal(envValues["port"], "465");
    assert.equal(envValues["from"], "no-reply@example.com");
    assert.equal(envValues["user"], "user@example.com");
    assert.equal(envValues["secure"], "tls");
});

test("createNotificationSender.getEnvValues returns undefined fields when env is empty", () => {
    const sender = createNotificationSender({});
    const envValues = sender.getEnvValues();
    assert.equal(envValues["host"], undefined);
    assert.equal(envValues["port"], undefined);
    assert.equal(envValues["from"], undefined);
    assert.equal(envValues["user"], undefined);
    assert.equal(envValues["secure"], undefined);
});

test("SmtpNotificationSender.getRequiredFields returns host and from", () => {
    const sender = createNotificationSender({});
    const required = sender.getRequiredFields();
    assert.deepEqual(required, ["host", "from"]);
});

test("SmtpNotificationSender.setConfig applies allowSelfSigned and authDisabled", () => {
    const sender = new SmtpNotificationSender({
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

function smtpSuccessHandler(conn: net.Socket): void {
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

const noopSleep = () => Promise.resolve();

test("SmtpNotificationSender retries after greylisting (4xx on MAIL FROM) and succeeds on second attempt", async () => {
    let sleepCallCount = 0;
    const trackingSleep = () => {
        sleepCallCount++;
        return Promise.resolve();
    };

    const server = await createMockSmtpServer((conn, attempt) => {
        let buf = "";
        conn.setEncoding("utf8");
        conn.write("220 mock.example.com SMTP\r\n");

        conn.on("data", (chunk: string) => {
            buf += chunk;
            const lines = buf.split("\r\n");
            buf = lines.pop() ?? "";

            for (const line of lines) {
                if (!line) continue;
                const upper = line.toUpperCase();
                if (upper.startsWith("EHLO") || upper.startsWith("HELO")) {
                    conn.write("250 OK\r\n");
                } else if (upper.startsWith("MAIL FROM")) {
                    if (attempt === 1) {
                        conn.write("451 Greylisted, please retry later\r\n");
                    } else {
                        conn.write("250 OK\r\n");
                    }
                } else if (upper.startsWith("RCPT TO")) {
                    conn.write("250 OK\r\n");
                } else if (upper === "DATA") {
                    conn.write("354 Start mail input\r\n");
                } else if (line === ".") {
                    conn.write("250 OK\r\n");
                } else if (upper.startsWith("QUIT")) {
                    conn.write("221 Bye\r\n");
                    conn.end();
                }
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
                greylistRetries: 1,
            },
            undefined,
            trackingSleep,
        );
        await sender.send({
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

    const server = await createMockSmtpServer((conn) => {
        connectionCount++;
        let buf = "";
        conn.setEncoding("utf8");
        conn.write("220 mock.example.com SMTP\r\n");

        conn.on("data", (chunk: string) => {
            buf += chunk;
            const lines = buf.split("\r\n");
            buf = lines.pop() ?? "";

            for (const line of lines) {
                if (!line) continue;
                const upper = line.toUpperCase();
                if (upper.startsWith("EHLO") || upper.startsWith("HELO")) {
                    conn.write("250 OK\r\n");
                } else if (upper.startsWith("MAIL FROM")) {
                    conn.write("550 User unknown\r\n");
                }
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
                greylistRetries: 2,
            },
            undefined,
            noopSleep,
        );
        await assert.rejects(
            () =>
                sender.send({
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
    const server = await createMockSmtpServer((conn) => {
        let buf = "";
        conn.setEncoding("utf8");
        conn.write("220 mock.example.com SMTP\r\n");

        conn.on("data", (chunk: string) => {
            buf += chunk;
            const lines = buf.split("\r\n");
            buf = lines.pop() ?? "";

            for (const line of lines) {
                if (!line) continue;
                const upper = line.toUpperCase();
                if (upper.startsWith("EHLO") || upper.startsWith("HELO")) {
                    conn.write("250 OK\r\n");
                } else if (upper.startsWith("MAIL FROM")) {
                    conn.write("451 Greylisted\r\n");
                }
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
                greylistRetries: 1,
            },
            undefined,
            noopSleep,
        );
        await assert.rejects(
            () =>
                sender.send({
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

    const server = await createMockSmtpServer((conn) => {
        connectionCount++;
        let buf = "";
        conn.setEncoding("utf8");
        conn.write("220 mock.example.com SMTP\r\n");

        conn.on("data", (chunk: string) => {
            buf += chunk;
            const lines = buf.split("\r\n");
            buf = lines.pop() ?? "";

            for (const line of lines) {
                if (!line) continue;
                const upper = line.toUpperCase();
                if (upper.startsWith("EHLO") || upper.startsWith("HELO")) {
                    conn.write("250 OK\r\n");
                } else if (upper.startsWith("MAIL FROM")) {
                    conn.write("451 Greylisted\r\n");
                }
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
        await assert.rejects(
            () =>
                sender.send({
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

test("SmtpNotificationSender.getConfig includes greylistRetries and greylistRetryDelayMs", () => {
    const sender = new SmtpNotificationSender({
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

test("SmtpNotificationSender.setConfig updates greylistRetries and greylistRetryDelayMs", () => {
    const sender = new SmtpNotificationSender({
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
                externalHost: "https://cognis.example.com",
            },
            undefined,
            noopSleep,
        );
        await sender.send({
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
        assert.ok(
            capturedData.includes(
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

test("SmtpNotificationSender email uses dark theme colors when theme is dark", async () => {
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
        await sender.send({
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
        await sender.send({
            category: "test",
            recipientUsername: "alice",
            recipientEmail: "alice@example.com",
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
