export function shouldShowInviteMenuEntry({
    role,
    isFounder,
    gatewayEnabled,
    inviteEnabled,
    canInvite,
}) {
    const normalizedRole = String(role ?? "").trim();
    const isAdminRole =
        normalizedRole === "admin" || normalizedRole === "owner";
    if (isAdminRole) return false;
    if (isFounder !== true) return false;
    if (gatewayEnabled !== true) return false;
    if (canInvite === false) return false;
    return inviteEnabled === true;
}
