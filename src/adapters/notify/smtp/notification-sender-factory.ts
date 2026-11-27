import { clampVerificationCodeLength } from "../../../gateways/reuse/verification-codes.js";
import { SmtpNotificationSender } from "./notification-sender.js";

export function createNotificationSender(
    environment: Record<string, string | undefined>,
): SmtpNotificationSender {
    const host = environment["COGNIS_SMTP_HOST"] ?? "";
    const port = Number.parseInt(environment["COGNIS_SMTP_PORT"] ?? "587", 10);
    const from =
        environment["COGNIS_SMTP_FROM"] ?? (host ? `cognis@${host}` : "");
    const senderName = environment["COGNIS_SMTP_SENDER_NAME"];
    const user = environment["COGNIS_SMTP_USER"];
    const password = environment["COGNIS_SMTP_PASS"];
    const rawSecure = environment["COGNIS_SMTP_SECURE"] ?? "starttls";
    const secure =
        rawSecure === "tls"
            ? "tls"
            : rawSecure === "none"
              ? "none"
              : "starttls";
    const allowSelfSigned =
        environment["COGNIS_SMTP_ALLOW_SELF_SIGNED"] === "true";
    const authDisabled = environment["COGNIS_SMTP_AUTH_DISABLED"] === "true";
    const ehloHostname = environment["HOST"];
    const externalHost =
        environment["EXTERNAL_HOST"] ??
        (environment["HOST"] ? `http://${environment["HOST"]}` : "");
    const rawCodeLength = environment["COGNIS_SMTP_CODE_LENGTH"];
    const codeLength = rawCodeLength
        ? clampVerificationCodeLength(rawCodeLength)
        : undefined;

    const environmentSnapshot: Record<string, string | undefined> = {
        host: environment["COGNIS_SMTP_HOST"],
        port: environment["COGNIS_SMTP_PORT"],
        from: environment["COGNIS_SMTP_FROM"],
        senderName: environment["COGNIS_SMTP_SENDER_NAME"],
        user: environment["COGNIS_SMTP_USER"],
        secure: environment["COGNIS_SMTP_SECURE"],
        allowSelfSigned: environment["COGNIS_SMTP_ALLOW_SELF_SIGNED"],
        authDisabled: environment["COGNIS_SMTP_AUTH_DISABLED"],
        codeLength: environment["COGNIS_SMTP_CODE_LENGTH"],
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
        environmentSnapshot,
    );
}
