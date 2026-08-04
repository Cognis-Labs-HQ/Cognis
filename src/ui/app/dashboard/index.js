import { apiFetch } from "../../reuse/api-client.js";
import { fetchUpcomingEvents } from "/static/gateways/calendar/calendar-api.js";
import { applyDocumentTitle, createI18n } from "../../reuse/i18n.js";
import { createPageComposer } from "../../reuse/page-composer/index.js";
import { mountWhenDirect } from "../../reuse/page-entry.js";
import { escapeHtml } from "../../reuse/escape-html.js";
import { formatDateTime } from "../../reuse/timestamp.js";
import {
    buildAnalogueClockMarkup,
    buildDigitalClockMarkup,
    createDateTimeFormatters,
    mountLiveClock,
} from "../../reuse/clock-display.js";
import { getRoleLabel } from "../../reuse/access-role.js";
import { loadDynamicContributions } from "../../reuse/dynamic-contribution-loader.js";
import { uiCtx } from "../../reuse/ui-ctx.js";

async function loadAccountInfo(account) {
    if (!account) return null;
    const cachedAccountInfo = uiCtx.capabilities.get(
        "session:getAccountInfo",
    )?.(account);
    if (cachedAccountInfo) return cachedAccountInfo;
    try {
        const response = await apiFetch(
            `/api/v1/users/${encodeURIComponent(account)}/info`,
        );
        if (!response.ok) return null;
        const payload = await response.json();
        return payload?.data ?? null;
    } catch {
        return null;
    }
}

async function loadDashboardExtensions({ i18n, account, role }) {
    try {
        const response = await apiFetch("/api/v1/ui/page-extensions/dashboard");
        if (!response.ok) return [];
        const payload = await response.json();
        return loadDynamicContributions(payload?.data, {
            exportName: "createPageElement",
            buildArgs: () => ({
                i18n,
                account,
                role,
            }),
            onError: () => {},
        });
    } catch {
        return [];
    }
}

export async function mount(root, { signal } = {}) {
    const i18n = await createI18n();
    applyDocumentTitle(i18n, "ui.page.title.dashboard");

    const account = localStorage.getItem("cognis_account") ?? "";
    const displayName = localStorage.getItem("cognis_display_name") ?? account;
    const role = localStorage.getItem("cognis_role") ?? "user";

    let info = null;
    let upcomingCalendarEvents = null;
    const accountInfoPromise = loadAccountInfo(account);
    const upcomingEventsPromise = fetchUpcomingEvents(5);
    const extensionElementsPromise = loadDashboardExtensions({
        i18n,
        account,
        role,
    });
    const { formatDateValue, formatDateTimeValue } = createDateTimeFormatters({
        dateFallback: i18n.t("ui.app.dashboard.never"),
        dateTimeFallback: i18n.t("ui.app.dashboard.never"),
    });

    const elements = [
        {
            id: "app-icon",
            label: i18n.t("ui.app.dashboard.element.app_icon.label"),
            pinned: true,
            gridSize: { default: [2, 2], min: [2, 2], max: [4, 4] },
            render: () => `
      <div class="dashboard-app-icon">
        <img src="/static/assets/icons/cognis-icon.png" alt="${i18n.t("ui.shared.brand.name")}" class="dashboard-app-icon-img" />
        <span class="dashboard-app-icon-name">${i18n.t("ui.shared.brand.name")}</span>
      </div>
    `,
        },
        {
            id: "welcome",
            label: i18n.t("ui.app.dashboard.element.welcome.label"),
            gridSize: { default: [4, 2], min: [2, 2] },
            render: () => `
      <h2 class="dashboard-welcome-heading">${i18n.t("ui.layout.greeting")} ${displayName}</h2>
      <p class="dashboard-welcome-account">${account}</p>
    `,
        },
        {
            id: "account-info",
            label: i18n.t("ui.app.dashboard.element.account.label"),
            gridSize: { default: [4, 3], min: [3, 2] },
            render: () => `
      <h3>${i18n.t("ui.app.dashboard.element.account.label")}</h3>
      <dl class="dashboard-info-list">
        <dt>${i18n.t("ui.app.dashboard.role")}</dt>
        <dd>${escapeHtml(i18n.t(`ui.reuse.role_${role}`) || role)}</dd>
        <dt>${i18n.t("ui.app.dashboard.member_since")}</dt>
        <dd>${info === null ? "…" : formatDateValue(info?.createdAt ?? null)}</dd>
      </dl>
    `,
        },
        {
            id: "last-login",
            label: i18n.t("ui.app.dashboard.element.last_login.label"),
            gridSize: { default: [3, 2], min: [2, 2] },
            render: () => `
      <h3>${i18n.t("ui.app.dashboard.element.last_login.label")}</h3>
      <p class="dashboard-last-seen">
        ${i18n.t("ui.app.dashboard.last_seen")}: <strong>${info === null ? "…" : formatDateTimeValue(info?.lastLogin ?? null)}</strong>
      </p>
    `,
        },
        {
            id: "digital-clock",
            label: i18n.t("ui.app.dashboard.element.digital_clock.label"),
            gridSize: { default: [5, 2], min: [4, 2], max: [6, 2] },
            render: () => `
      <div class="dashboard-clock dashboard-clock--digital">
        <div class="dashboard-clock-display" id="dashboard-digital-clock-display"></div>
        <span class="dashboard-clock-tz" id="dashboard-digital-clock-tz"></span>
      </div>
    `,
            onRender: () => {
                mountLiveClock({
                    displayId: "dashboard-digital-clock-display",
                    tzId: "dashboard-digital-clock-tz",
                    renderClock: buildDigitalClockMarkup,
                });
            },
        },
        {
            id: "analogue-clock",
            label: i18n.t("ui.app.dashboard.element.analogue_clock.label"),
            gridSize: { default: [4, 2], min: [3, 2], max: [5, 2] },
            render: () => `
      <div class="dashboard-clock dashboard-clock--analogue">
        <div class="dashboard-clock-display" id="dashboard-analogue-clock-display"></div>
        <span class="dashboard-clock-tz" id="dashboard-analogue-clock-tz"></span>
      </div>
    `,
            onRender: () => {
                mountLiveClock({
                    displayId: "dashboard-analogue-clock-display",
                    tzId: "dashboard-analogue-clock-tz",
                    renderClock: buildAnalogueClockMarkup,
                });
            },
        },
        {
            id: "calendar-upcoming",
            label: i18n.t("ui.app.dashboard.element.calendar_upcoming.label"),
            gridSize: { default: [6, 3], min: [4, 2], max: [8, 4] },
            render: () => `
      <h3>${i18n.t("ui.app.dashboard.element.calendar_upcoming.label")}</h3>
      ${
          upcomingCalendarEvents === null
              ? `<p aria-busy="true">…</p>`
              : upcomingCalendarEvents.length > 0
                ? `<ul class="dashboard-info-list">${upcomingCalendarEvents
                      .map(
                          (event) => `<li>
            <a href="/calendar?calendarId=${encodeURIComponent(event.calendarId)}&eventId=${encodeURIComponent(event.id)}" class="dashboard-upcoming-event-link">
              <strong>${escapeHtml(event.title)}</strong>
              <span>${escapeHtml(formatDateTime(event.startAt))}</span>
              ${event.calendarName ? `<span>${escapeHtml(String(event.calendarName))}</span>` : ""}
            </a>
          </li>`,
                      )
                      .join("")}</ul>`
                : `<p>${escapeHtml(i18n.t("ui.app.dashboard.element.calendar_upcoming.empty"))}</p>`
      }
    `,
        },
    ];

    const composer = createPageComposer(root, {
        allowCustomization: true,
        elements,
        preferenceKey: "dashboard-layout",
        i18n,
        pageContext: {
            title: i18n.t("ui.reuse.dashboard"),
            subtitle: i18n.t("ui.app.dashboard.page_subtitle"),
        },
    });

    await composer.init();

    void accountInfoPromise.then((accountInfo) => {
        if (signal?.aborted) return;
        info = accountInfo ?? {};
        composer.refreshElements(["account-info", "last-login"]);
    });
    void upcomingEventsPromise
        .then((events) => {
            if (signal?.aborted) return;
            upcomingCalendarEvents = events;
            composer.refreshElements(["calendar-upcoming"]);
        })
        .catch(() => {
            if (signal?.aborted) return;
            upcomingCalendarEvents = [];
            composer.refreshElements(["calendar-upcoming"]);
        });
    void extensionElementsPromise.then((extensionElements) => {
        if (signal?.aborted || extensionElements.length === 0) return;
        elements.push(...extensionElements);
        composer.refresh(elements);
    });
}

await mountWhenDirect(mount);
