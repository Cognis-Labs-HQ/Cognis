import { createI18n } from "/static/reuse/i18n.js";

async function addFilesNavigation() {
    const nav = document.querySelector(".topnav");
    if (!nav || nav.querySelector('a[href="/files"]')) return;
    const i18n = await createI18n({
        componentStringBaseUrls: ["/static/gateways/files/languages"],
    });
    const link = document.createElement("a");
    link.href = "/files";
    link.textContent = i18n.t("gateway.files.page_title");
    nav.append(link);
}

void addFilesNavigation();
window.addEventListener("cognis:navbar-refresh", addFilesNavigation);
