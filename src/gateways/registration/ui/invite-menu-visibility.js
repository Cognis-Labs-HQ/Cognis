export function shouldShowInviteMenuEntry({
    role,
    isFounder,
    gatewayEnabled,
    inviteEnabled,
}) {
    const normalizedRole = String(role ?? "").trim();
    const isAdminRole =
        normalizedRole === "admin" || normalizedRole === "owner";
    if (isAdminRole) return false;
    if (isFounder !== true) return false;
    if (gatewayEnabled !== true) return false;
    return inviteEnabled === true;
}
