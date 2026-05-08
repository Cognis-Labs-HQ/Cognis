import { createI18n } from "/static/reuse/i18n.js";

async function registerInviteMenuEntry() {
    const role = localStorage.getItem("cognis_role");
    const isFounder = localStorage.getItem("cognis_is_founder") === "true";
    if (role !== "admin" || !isFounder) return;

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

    const usersItem = dropdown.querySelector('a[href="/users"]')?.closest("li");
    if (usersItem?.nextSibling) {
        dropdown.insertBefore(entry, usersItem.nextSibling);
        return;
    }
    dropdown.appendChild(entry);
}

registerInviteMenuEntry();
