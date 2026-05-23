import { escapeHtml } from "/static/reuse/escape-html.js";
import { extendI18n } from "/static/reuse/i18n.js";

export async function createPageElement({ i18n }) {
    const moduleI18n = await extendI18n(
        i18n,
        "/static/modules/analytics/languages",
    );

    return {
        id: "analytics-dashboard-overview",
        label: moduleI18n.t("module.analytics.dashboard.element.label"),
        gridSize: { default: [4, 2], min: [3, 2], max: [6, 3] },
        render: () => `
      <h3>${escapeHtml(moduleI18n.t("module.analytics.dashboard.element.label"))}</h3>
      <p>${escapeHtml(moduleI18n.t("module.analytics.dashboard.element.description"))}</p>
      <a href="/analytics" class="btn-confirm btn-animated">${escapeHtml(moduleI18n.t("module.analytics.dashboard.element.open"))}</a>
    `,
    };
}
