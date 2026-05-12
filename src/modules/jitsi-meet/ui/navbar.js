import { apiFetch } from "/static/reuse/api-client.js";

if (!globalThis._jitsiNavbarInitialized) {
    globalThis._jitsiNavbarInitialized = true;

    const meetingsLink = document.querySelector("[data-meetings-link]");

    async function syncMeetingsLink() {
        if (!meetingsLink) return;
        try {
            const response = await apiFetch("/api/v1/modules/jitsi-meet/ping");
            if (response.ok) {
                meetingsLink.removeAttribute("hidden");
                return;
            }
        } catch {}
        meetingsLink.setAttribute("hidden", "");
    }

    syncMeetingsLink();
    window.addEventListener("focus", syncMeetingsLink);
    window.addEventListener("cognis:navbar-refresh", syncMeetingsLink);
}
