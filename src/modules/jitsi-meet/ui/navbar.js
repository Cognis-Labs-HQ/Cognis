import { apiFetch } from "/static/reuse/api-client.js";
import { createI18n } from "/static/reuse/i18n.js";

const i18n = await createI18n({
    componentStringBaseUrls: ["/static/modules/jitsi-meet/languages"],
});
const LISTENER_BOUND_KEY = "__jitsiMeetNavbarListenersBound";

async function syncMeetingLink() {
    const topnav = document.querySelector(".topnav");
    if (!(topnav instanceof HTMLElement)) return;

    let link = topnav.querySelector("[data-meeting-link]");
    if (!(link instanceof HTMLAnchorElement)) {
        link = document.createElement("a");
        link.setAttribute("data-meeting-link", "true");
        link.dataset.navOrder = "50";
        link.dataset.mobilePriority = "4";
        topnav.appendChild(link);
    }
    link.href = "/meetings";

    link.textContent = i18n.t("ui.reuse.meetings");
    try {
        const response = await apiFetch("/api/v1/modules/jitsi-meet/ping");
        if (!response.ok) {
            link.setAttribute("hidden", "");
            return;
        }
        const payload = await response.json();
        if (payload?.data?.ready !== true) {
            link.setAttribute("hidden", "");
            return;
        }
        link.removeAttribute("hidden");
    } catch {
        link.setAttribute("hidden", "");
    }
}

syncMeetingLink();
if (!globalThis[LISTENER_BOUND_KEY]) {
    window.addEventListener("focus", syncMeetingLink);
    window.addEventListener("cognis:navbar-refresh", syncMeetingLink);
    globalThis[LISTENER_BOUND_KEY] = true;
}
