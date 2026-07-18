import { SmtpNotificationSender } from "./notification-sender.js";

export function createNotificationSender(
    env: Record<string, string | undefined>,
): SmtpNotificationSender {
    const host = env["COGNIS_SMTP_HOST"] ?? "";
    const port = Number.parseInt(env["COGNIS_SMTP_PORT"] ?? "587", 10);
    const from = env["COGNIS_SMTP_FROM"] ?? (host ? `cognis@${host}` : "");
    const senderName = env["COGNIS_SMTP_SENDER_NAME"];
    const user = env["COGNIS_SMTP_USER"];
    const password = env["COGNIS_SMTP_PASS"];
    const rawSecure = env["COGNIS_SMTP_SECURE"] ?? "starttls";
    const secure =
        rawSecure === "tls"
            ? "tls"
            : rawSecure === "none"
              ? "none"
              : "starttls";
    const allowSelfSigned = env["COGNIS_SMTP_ALLOW_SELF_SIGNED"] === "true";
    const authDisabled = env["COGNIS_SMTP_AUTH_DISABLED"] === "true";
    const ehloHostname = env["HOST"];
    const externalHost =
        env["EXTERNAL_HOST"] ?? (env["HOST"] ? `http://${env["HOST"]}` : "");
    const rawCodeLength = env["COGNIS_SMTP_CODE_LENGTH"];
    const codeLength = rawCodeLength
        ? Number.parseInt(rawCodeLength, 10)
        : undefined;

    const envSnapshot: Record<string, string | undefined> = {
        host: env["COGNIS_SMTP_HOST"],
        port: env["COGNIS_SMTP_PORT"],
        from: env["COGNIS_SMTP_FROM"],
        senderName: env["COGNIS_SMTP_SENDER_NAME"],
        user: env["COGNIS_SMTP_USER"],
        secure: env["COGNIS_SMTP_SECURE"],
        allowSelfSigned: env["COGNIS_SMTP_ALLOW_SELF_SIGNED"],
        authDisabled: env["COGNIS_SMTP_AUTH_DISABLED"],
        codeLength: env["COGNIS_SMTP_CODE_LENGTH"],
    };

    return new SmtpNotificationSender(
        {
            host,
            port,
            from,
            senderName,
            user,
            password,
            secure,
            allowSelfSigned,
            authDisabled,
            ehloHostname,
            externalHost,
            codeLength,
        },
        envSnapshot,
    );
}
