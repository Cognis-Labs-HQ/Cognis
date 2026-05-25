interface NotifySmtpTestError {
    code: string;
    message: string;
    details?: Record<string, unknown>;
}

/**
 * Maps an internal SMTP failure stage token to a user-facing SMTP command label.
 *
 * @param {string} smtpStage Internal SMTP stage identifier from adapter errors.
 * @returns {string} Human-readable SMTP command label for UI/API error messages.
 */
function normalizeSmtpCommand(smtpStage: string): string {
    const stageToCommand: Record<string, string> = {
        ehlo: "EHLO",
        ehlo_after_tls: "EHLO (after STARTTLS)",
        starttls: "STARTTLS",
        auth: "AUTH",
        mail_from: "MAIL FROM",
        rcpt_to: "RCPT TO",
        data_cmd: "DATA",
        message_rejected: "MESSAGE BODY",
    };
    const mappedCommand = stageToCommand[smtpStage];
    if (mappedCommand) return mappedCommand;
    return smtpStage.replace(/_/g, " ").toUpperCase();
}

/**
 * Normalizes raw SMTP adapter test-email errors into a structured API error.
 *
 * @example
 * const apiError = buildSmtpTestError(new Error('smtp_rcpt_to_failed:550'));
 * // => { code: 'smtp_test_failed', message: 'SMTP test failed at RCPT TO (550).', ... }
 *
 * @param {unknown} error Original thrown value from SMTP test email execution.
 * @returns {NotifySmtpTestError} Safe, structured error payload for API responses.
 */
export function buildSmtpTestError(error: unknown): NotifySmtpTestError {
    const rawError =
        error instanceof Error
            ? error.message
            : String(error ?? "smtp_test_failed");

    if (rawError === "smtp_test_email_requires_recipient") {
        return {
            code: "bad_request",
            message: "Recipient email address is required.",
            details: {
                smtpError: rawError,
            },
        };
    }

    // Expected stage tokens include ehlo, ehlo_after_tls, starttls, auth,
    // mail_from, rcpt_to, data_cmd, and message_rejected.
    const failedStageMatch = rawError.match(/^smtp_([a-z_]+)_failed:(\d{3})$/);
    if (failedStageMatch) {
        const smtpStage = failedStageMatch[1];
        const smtpCode = Number.parseInt(failedStageMatch[2], 10);
        const smtpCommand = normalizeSmtpCommand(smtpStage);
        return {
            code: "smtp_test_failed",
            message: `SMTP test failed at ${smtpCommand} (${smtpCode}).`,
            details: {
                smtpCommand,
                smtpCode,
                smtpError: rawError,
            },
        };
    }

    if (rawError.startsWith("smtp_")) {
        return {
            code: "smtp_test_failed",
            message: `SMTP test failed (${rawError}).`,
            details: {
                smtpError: rawError,
            },
        };
    }

    return {
        code: "test_failed",
        message: "Failed to send test email.",
    };
}
