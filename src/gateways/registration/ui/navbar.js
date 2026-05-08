import { createI18n } from "/static/reuse/i18n.js";

async function isRegistrationGatewayEnabled() {
    try {
        const response = await fetch("/api/v1/gateways/registration");
        if (!response.ok) return false;
        const payload = await response.json();
        return payload?.data?.status !== "disabled";
    } catch {
        return false;
    }
}

async function isInviteAdapterEnabled() {
    try {
        const token = localStorage.getItem("cognis_token");
        const response = await fetch("/api/v1/registration/state", {
            headers: {
                authorization: token ? `Bearer ${token}` : "",
            },
        });
        if (!response.ok) return false;
        const payload = await response.json();
        return payload?.data?.inviteEnabled === true;
    } catch {
        return false;
    }
}

async function registerInviteMenuEntry() {
    const role = localStorage.getItem("cognis_role");
    const isFounder = localStorage.getItem("cognis_is_founder") === "true";
    if (role === "admin" || !isFounder) return;
    if (!(await isRegistrationGatewayEnabled())) return;
    if (!(await isInviteAdapterEnabled())) return;

    const dropdown = document.querySelector("#profile-dropdown");
    if (!(dropdown instanceof HTMLUListElement)) return;
    if (dropdown.querySelector('a[href="/invite"]')) return;

    const i18n = await createI18n().catch(() => null);
    if (!i18n) return;
    const label = i18n.t("ui.reuse.menu.invite");
    const entry = document.createElement("li");
    const link = document.createElement("a");
    link.className = "dropdown-item";
    link.href = "/invite";
    link.textContent = label;
    entry.appendChild(link);

    const logoutItem =
        dropdown.querySelector("#profile-logout")?.closest("li") ?? null;
    if (logoutItem) {
        dropdown.insertBefore(entry, logoutItem);
        return;
    }
    dropdown.appendChild(entry);
}

registerInviteMenuEntry();
