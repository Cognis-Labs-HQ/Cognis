/** Account-only profile reads must never use a Share guest's identity. */
export function canLoadOwnProfile(ctx) {
    const account = String(localStorage.getItem("cognis_account") ?? "").trim();
    return (
        Boolean(account && localStorage.getItem("cognis_access_token")) &&
        !account.startsWith("share:") &&
        ctx.capabilities.get("session:isGuest")?.() !== true
    );
}
