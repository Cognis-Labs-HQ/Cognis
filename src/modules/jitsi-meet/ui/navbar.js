import { createI18n, readPreferredLanguages } from "/static/reuse/i18n.js";

const LINK_ATTR = "data-jitsi-meet-link";

async function ensureMeetingsLink() {
    const topNav = document.querySelector(".topnav");
    if (!(topNav instanceof HTMLElement)) return;

    const existingLink = topNav.querySelector(`[${LINK_ATTR}]`);
    if (existingLink) return;

    const i18n = await createI18n({
        preferredLanguages: readPreferredLanguages(),
        componentStringBaseUrls: ["/static/modules/jitsi-meet/languages"],
    });

    const meetingsLink = document.createElement("a");
    meetingsLink.href = "/meetings";
    meetingsLink.textContent = i18n.t("module.jitsi_meet.nav_label");
    meetingsLink.setAttribute(LINK_ATTR, "true");
    topNav.appendChild(meetingsLink);
}

if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => {
        void ensureMeetingsLink();
    });
} else {
    void ensureMeetingsLink();
}
window.addEventListener("cognis:navbar-refresh", () => {
    void ensureMeetingsLink();
});
