export function shouldShowInviteMenuEntry({
    role,
    isFounder,
    gatewayEnabled,
    inviteEnabled,
    canInvite,
}) {
    const normalizedRole = String(role ?? "").trim();
    if (gatewayEnabled !== true) return false;
    if (canInvite === false) return false;
    if (inviteEnabled !== true) return false;
    if (normalizedRole === "owner") return true;
    if (normalizedRole === "admin") return false;
    return isFounder === true;
}
