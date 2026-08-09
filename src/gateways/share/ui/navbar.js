import { createI18n } from "/static/reuse/i18n.js";

async function registerSharesMenuEntry() {
    const dropdown = document.querySelector("#profile-dropdown");
    if (!(dropdown instanceof HTMLUListElement)) return;
    if (dropdown.querySelector('a[href="/shares"]')) return;
    const i18n = await createI18n({
        componentStringBaseUrls: ["/static/gateways/share/languages"],
    });
    const entry = document.createElement("li");
    const link = document.createElement("a");
    link.className = "dropdown-item";
    link.href = "/shares";
    link.textContent = i18n.t("share.shares.title");
    entry.appendChild(link);
    const logoutItem =
        dropdown.querySelector("#profile-logout")?.closest("li") ?? null;
    dropdown.insertBefore(entry, logoutItem);
}

if (typeof document !== "undefined") {
    void registerSharesMenuEntry();
}
