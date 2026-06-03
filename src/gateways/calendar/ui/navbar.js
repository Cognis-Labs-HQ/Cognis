import { createI18n } from "/static/reuse/i18n.js";

const i18n = await createI18n({
    componentStringBaseUrls: ["/static/gateways/calendar/ui/languages"],
});

function ensureCalendarNavbarLink() {
    const topnav = document.querySelector(".topnav");
    if (!topnav) return;
    if (topnav.querySelector('a[href="/calendar"]')) return;

    const link = document.createElement("a");
    link.href = "/calendar";
    link.textContent = i18n.t("ui.reuse.calendar");
    link.dataset.navOrder = "30";
    link.dataset.mobilePriority = "2";
    topnav.appendChild(link);
}

ensureCalendarNavbarLink();
