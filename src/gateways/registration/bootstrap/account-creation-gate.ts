import type { CoreRegistrationGateway } from "../gateway.js";

export async function authorizeAccountCreation(
    gateway: Pick<
        CoreRegistrationGateway,
        "isPublicEnabled" | "resolveInvite" | "consumeExternalAccountToken"
    >,
    gatewayEnabled: boolean,
    input: {
        accountId?: string;
        email?: string;
        registrationToken?: string;
    },
) {
    if (gatewayEnabled && gateway.isPublicEnabled()) {
        return { authorized: true, source: "public" };
    }
    const accountId = String(input.accountId ?? "").trim();
    const email = String(input.email ?? "")
        .trim()
        .toLowerCase();
    const token = String(input.registrationToken ?? "").trim();
    if (!accountId || !email || !token || !gatewayEnabled) {
        return {
            authorized: false,
            emailRequired: !email,
            reason: "registration_token_required",
        };
    }
    let invite;
    try {
        invite = await gateway.resolveInvite(token);
    } catch (error) {
        if (!(error instanceof Error) || error.message !== "invalid_token") {
            throw error;
        }
        invite = null;
    }
    const inviteEmail = String(invite?.inviteeEmail ?? "").toLowerCase();
    const authorized =
        Boolean(invite) && (!inviteEmail || inviteEmail === email);
    if (authorized && invite) {
        return {
            authorized: true,
            emailRequired: false,
            source: "registrationToken",
            commit: () =>
                gateway.consumeExternalAccountToken({
                    token,
                    accountId,
                    email,
                    emailVerified: Boolean(inviteEmail),
                }),
        };
    }
    return {
        authorized,
        emailRequired: false,
        reason: invite
            ? "registration_token_email_mismatch"
            : "registration_token_invalid",
    };
}
