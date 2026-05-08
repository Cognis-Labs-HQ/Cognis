import { apiFetch } from "../../reuse/api-client.js";
import { applyDocumentTitle, createI18n } from "../../reuse/i18n.js";
import { createPageComposer } from "../../reuse/page-composer.js";
import { formatDate, formatDateTime } from "../../reuse/timestamp.js";

const root = document.querySelector("#app");
const i18n = await createI18n();
applyDocumentTitle(i18n, "ui.page.title.dashboard");

const account = localStorage.getItem("cognis_account") ?? "";
const displayName = localStorage.getItem("cognis_display_name") ?? account;
const role = localStorage.getItem("cognis_role") ?? "user";

async function loadAccountInfo() {
    if (!account) return null;
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

function localFormatDate(iso) {
    return formatDate(iso, i18n.t("ui.app.dashboard.never"));
}

function localFormatDateTime(iso) {
    return formatDateTime(iso, i18n.t("ui.app.dashboard.never"));
}

const info = await loadAccountInfo();

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
        <dd>${role}</dd>
        <dt>${i18n.t("ui.app.dashboard.member_since")}</dt>
        <dd>${localFormatDate(info?.createdAt ?? null)}</dd>
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
        ${i18n.t("ui.app.dashboard.last_seen")}: <strong>${localFormatDateTime(info?.lastLogin ?? null)}</strong>
      </p>
    `,
    },
];

const composer = createPageComposer(root, {
    allowCustomization: true,
    elements,
    preferenceKey: "dashboard-layout",
    i18n,
    pageContext: {
        title: i18n.t("ui.app.dashboard.page_title"),
        subtitle: i18n.t("ui.app.dashboard.page_subtitle"),
    },
});

await composer.init();
