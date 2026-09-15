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
    const invite = await gateway.resolveInvite(token);
    const authorized = invite?.inviteeEmail.toLowerCase() === email;
    if (authorized && invite) {
        const consumed = await gateway.consumeExternalAccountToken({
            token,
            accountId,
        });
        if (!consumed) {
            return {
                authorized: false,
                emailRequired: false,
                reason: "registration_token_consumption_failed",
            };
        }
    }
    return {
        authorized,
        emailRequired: false,
        ...(authorized
            ? { source: "registrationToken" }
            : {
                  reason: invite
                      ? "registration_token_email_mismatch"
                      : "registration_token_invalid",
              }),
    };
}
