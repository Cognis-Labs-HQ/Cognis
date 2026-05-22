import { escapeHtml } from "/static/reuse/escape-html.js";

export function createPageElement() {
    return {
        id: "sample-analytics-dashboard-overview",
        label: "Sample Analytics",
        gridSize: { default: [4, 2], min: [3, 2], max: [6, 3] },
        render: () => `
      <h3>Sample Analytics</h3>
      <p>${escapeHtml("Preview metrics from the Sample Analytics module.")}</p>
      <a href="/analytics" class="btn-confirm btn-animated">Open analytics</a>
    `,
    };
}
