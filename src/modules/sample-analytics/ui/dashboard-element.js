import { escapeHtml } from "/static/reuse/escape-html.js";

export function createPageElement({ i18n }) {
    return {
        id: "sample-analytics-dashboard-overview",
        label: i18n.t("ui.app.dashboard.element.sample_analytics.label"),
        gridSize: { default: [4, 2], min: [3, 2], max: [6, 3] },
        render: () => `
      <h3>${escapeHtml(i18n.t("ui.app.dashboard.element.sample_analytics.label"))}</h3>
      <p>${escapeHtml(i18n.t("ui.app.dashboard.element.sample_analytics.description"))}</p>
      <a href="/analytics" class="btn-confirm btn-animated">${escapeHtml(i18n.t("ui.app.dashboard.element.sample_analytics.open"))}</a>
    `,
    };
}
