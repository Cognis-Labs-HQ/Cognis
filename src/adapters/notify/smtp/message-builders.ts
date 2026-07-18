export type VerificationEmailMessageType =
    | "verification-code"
    | "email-address-verification";

export function buildVerificationEmailMessage(
    type: VerificationEmailMessageType,
    code: string,
): {
    subject: string;
    body: string;
} {
    if (type === "verification-code") {
        return {
            subject: "Your verification code",
            body: `Your verification code is: ${code}\n\nThis code expires in 15 minutes.`,
        };
    }

    return {
        subject: "Verify your email address",
        body: `Your verification code is: ${code}\n\nOr click the button below to verify your email address directly.\n\nBoth the code and the link expire in 15 minutes.`,
    };
}

export function buildRegistrationInviteEmailMessage(
    inviterDisplayName: string,
    inviteUrl: string,
): {
    subject: string;
    body: string;
} {
    return {
        subject: `${inviterDisplayName} invited you to join Cognis`,
        body: `🎁 ${inviterDisplayName} wants you to join Cognis.\n\nUse this secure invitation link to finish account creation:\n${inviteUrl}\n\nThis invitation expires in 24 hours and can only be used once.`,
    };
}
