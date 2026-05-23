import { formatDateTime } from "/static/reuse/timestamp.js";

const STYLE_ID = "analytics-admin-section-styles";

function ensureStyles() {
    if (document.getElementById(STYLE_ID)) return;
    const link = document.createElement("link");
    link.id = STYLE_ID;
    link.rel = "stylesheet";
    link.href = "/static/modules/analytics/admin-section.css";
    document.head.appendChild(link);
}

function parseDays(value, fallback = 30) {
    const parsed = Number.parseInt(String(value ?? ""), 10);
    if (!Number.isFinite(parsed) || parsed < 1) return fallback;
    return Math.min(parsed, 365);
}

function formatTemplate(template, values) {
    if (typeof template !== "string") return "";
    return template.replace(/\{([a-zA-Z0-9_]+)\}/g, (match, key) => {
        const replacementValue = values?.[key];
        return replacementValue == null ? match : String(replacementValue);
    });
}

function buildBarChart(series, { i18n, escapeHtml }) {
    if (!series.length) {
        return `<p class="analytics-empty">${i18n.t("module.analytics.admin.chart.no_data")}</p>`;
    }

    const chartWidth = 600;
    const chartHeight = 160;
    const paddingLeft = 36;
    const paddingRight = 12;
    const paddingTop = 12;
    const paddingBottom = 36;
    const barAreaWidth = chartWidth - paddingLeft - paddingRight;
    const barAreaHeight = chartHeight - paddingTop - paddingBottom;
    const maxCount = Math.max(...series.map((point) => point.count), 1);
    const step = barAreaWidth / series.length;
    const barWidth = Math.max(2, step - 2);

    const midCount = Math.ceil(maxCount / 2);
    const yLevels = [0, midCount, maxCount];

    const gridLines = yLevels
        .map((value) => {
            const yPos =
                paddingTop + barAreaHeight - (value / maxCount) * barAreaHeight;
            return `<line x1="${paddingLeft}" y1="${yPos.toFixed(1)}" x2="${(chartWidth - paddingRight).toFixed(1)}" y2="${yPos.toFixed(1)}" class="analytics-chart-grid" />`;
        })
        .join("");

    const yLabels = yLevels
        .map((value) => {
            const yPos =
                paddingTop + barAreaHeight - (value / maxCount) * barAreaHeight;
            return `<text x="${paddingLeft - 4}" y="${(yPos + 4).toFixed(1)}" text-anchor="end" class="analytics-chart-label">${value}</text>`;
        })
        .join("");

    const bars = series
        .map((point, index) => {
            const barHeight = Math.max(
                1,
                (point.count / maxCount) * barAreaHeight,
            );
            const barX = paddingLeft + index * step + (step - barWidth) / 2;
            const barY = paddingTop + barAreaHeight - barHeight;
            return `<rect x="${barX.toFixed(1)}" y="${barY.toFixed(1)}" width="${barWidth.toFixed(1)}" height="${barHeight.toFixed(1)}" class="analytics-chart-bar" aria-label="${escapeHtml(point.date)}: ${point.count}" />`;
        })
        .join("");

    const labelStep = Math.ceil(series.length / 8);
    const labelIndices = [];
    for (let index = 0; index < series.length; index += 1) {
        if (index % labelStep === 0) {
            labelIndices.push(index);
        }
    }
    const lastIndex = series.length - 1;
    if (!labelIndices.includes(lastIndex)) {
        labelIndices.push(lastIndex);
    }
    if (labelIndices.length > 1) {
        const previousIndex = labelIndices[labelIndices.length - 2];
        if (lastIndex - previousIndex < 2) {
            labelIndices.splice(labelIndices.length - 2, 1);
        }
    }

    const xLabels = labelIndices
        .map((index) => {
            const point = series[index];
            const labelX = paddingLeft + index * step + step / 2;
            return `<text x="${labelX.toFixed(1)}" y="${chartHeight - 6}" text-anchor="middle" class="analytics-chart-label">${escapeHtml(point.date.slice(5))}</text>`;
        })
        .join("");

    const axisX = paddingLeft;
    const axisY = paddingTop + barAreaHeight;

    return `
      <figure class="analytics-chart-figure">
        <svg viewBox="0 0 ${chartWidth} ${chartHeight}" class="analytics-chart-svg" aria-hidden="true">
          ${gridLines}
          ${yLabels}
          ${bars}
          ${xLabels}
          <line x1="${axisX}" y1="${paddingTop}" x2="${axisX}" y2="${axisY}" class="analytics-chart-axis" />
          <line x1="${axisX}" y1="${axisY}" x2="${(chartWidth - paddingRight).toFixed(1)}" y2="${axisY}" class="analytics-chart-axis" />
        </svg>
      </figure>
    `;
}

function buildStatCards(metrics, { i18n }) {
    if (!metrics) {
        return `<p class="analytics-empty">${i18n.t("module.analytics.admin.loading")}</p>`;
    }

    const roleOrder = ["owner", "admin", "moderator", "teacher", "user"];
    const roleBreakdown = metrics.roleBreakdown ?? {};
    const knownRoles = roleOrder.filter((role) => roleBreakdown[role] > 0);
    const unknownRoles = Object.keys(roleBreakdown).filter(
        (role) => !roleOrder.includes(role) && roleBreakdown[role] > 0,
    );
    const allRoles = [...knownRoles, ...unknownRoles];

    const roleRows = allRoles
        .map((role) => {
            const count = roleBreakdown[role] ?? 0;
            const pct =
                metrics.totalUsers > 0
                    ? Math.round((count / metrics.totalUsers) * 100)
                    : 0;
            const roleLabel = i18n.t(`ui.reuse.role_${role}`) || role;
            return `
          <div class="analytics-role-row">
            <span class="analytics-role-name">${roleLabel}</span>
            <div class="analytics-role-bar-wrap">
              <div class="analytics-role-bar" style="width:${pct}%"></div>
            </div>
            <span class="analytics-role-count">${count}</span>
          </div>
        `;
        })
        .join("");

    const newUsersDaysLabel = formatTemplate(
        i18n.t("module.analytics.admin.stat.new_users_days"),
        { days: metrics.days },
    );

    return `
      <div class="analytics-stat-cards">
        <div class="analytics-stat-card">
          <span class="analytics-stat-value">${metrics.totalUsers}</span>
          <span class="analytics-stat-label">${i18n.t("module.analytics.admin.stat.total_users")}</span>
        </div>
        <div class="analytics-stat-card">
          <span class="analytics-stat-value">${metrics.activeUsers7d}</span>
          <span class="analytics-stat-label">${i18n.t("module.analytics.admin.stat.active_7d")}</span>
        </div>
        <div class="analytics-stat-card">
          <span class="analytics-stat-value">${metrics.newUsersDays}</span>
          <span class="analytics-stat-label">${newUsersDaysLabel}</span>
        </div>
      </div>
      ${allRoles.length > 0 ? `<div class="analytics-role-breakdown">${roleRows}</div>` : ""}
    `;
}

function buildEventsSection(events, { i18n, escapeHtml }) {
    if (!events.length) {
        return `<p class="analytics-empty">${i18n.t("module.analytics.admin.events.empty")}</p>`;
    }

    const rows = events
        .map((event) => {
            const timestamp = formatDateTime(
                event.created_at,
                i18n.t("module.analytics.admin.events.unknown_time"),
            );
            const accountLabel = event.account_id
                ? escapeHtml(String(event.account_id))
                : i18n.t("module.analytics.admin.events.system");
            return `
          <tr class="analytics-events-row">
            <td class="analytics-events-cell analytics-events-cell--type">${escapeHtml(event.event_type)}</td>
            <td class="analytics-events-cell analytics-events-cell--actor">${accountLabel}</td>
            <td class="analytics-events-cell analytics-events-cell--time">${escapeHtml(timestamp)}</td>
          </tr>
        `;
        })
        .join("");

    return `
      <table class="analytics-events-table">
        <thead>
          <tr>
            <th class="analytics-events-cell">${i18n.t("module.analytics.admin.events.col.type")}</th>
            <th class="analytics-events-cell">${i18n.t("module.analytics.admin.events.col.actor")}</th>
            <th class="analytics-events-cell">${i18n.t("module.analytics.admin.events.col.time")}</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    `;
}

/**
 * Analytics admin section for the Administration page.
 *
 * Displays user activity metrics (total users, active users, registration
 * trends) derived from the accounts table, plus a log of custom analytics
 * events. Supports time-range filtering.
 *
 * Exports createAdminSection which returns an admin section descriptor
 * consumed by the administration page.
 *
 * @param {object} deps
 * @param {object} deps.i18n - i18n instance for resolving string keys
 * @param {Function} deps.apiFetch - authenticated fetch helper
 * @param {Function} deps.escapeHtml - HTML-escape utility
 * @param {Function} deps.showToast - toast notification helper
 * @returns {{ id: string, label: string, dataReady: Promise<void>, subComposerOptions: object }}
 */
export function createAdminSection({ i18n, apiFetch, escapeHtml, showToast }) {
    let metricsData = null;
    let seriesData = [];
    let eventsData = [];
    let activeDays = 30;
    let isLoading = false;

    let statsEl = null;
    let chartEl = null;
    let eventsEl = null;
    let applyBtn = null;

    async function fetchData(days) {
        const [metricsRes, seriesRes, eventsRes] = await Promise.all([
            apiFetch(`/api/v1/modules/analytics/metrics?days=${days}`),
            apiFetch(`/api/v1/modules/analytics/series?days=${days}`),
            apiFetch("/api/v1/modules/analytics/activity-log?limit=20"),
        ]);

        if (metricsRes.ok) {
            const payload = await metricsRes.json();
            metricsData = payload.data ?? null;
        }
        if (seriesRes.ok) {
            const payload = await seriesRes.json();
            seriesData = payload.data ?? [];
        }
        if (eventsRes.ok) {
            const payload = await eventsRes.json();
            eventsData = payload.data ?? [];
        }
    }

    const dataReady = fetchData(activeDays).catch(() => {});

    function renderStats() {
        return buildStatCards(metricsData, { i18n });
    }

    function renderChart() {
        return buildBarChart(seriesData, { i18n, escapeHtml });
    }

    function renderEvents() {
        return buildEventsSection(eventsData, { i18n, escapeHtml });
    }

    function updateView() {
        if (statsEl instanceof HTMLElement) {
            statsEl.innerHTML = renderStats();
        }
        if (chartEl instanceof HTMLElement) {
            chartEl.innerHTML = renderChart();
        }
        if (eventsEl instanceof HTMLElement) {
            eventsEl.innerHTML = renderEvents();
        }
    }

    function bindSection(rootEl) {
        ensureStyles();

        statsEl = rootEl.querySelector(".analytics-stats");
        chartEl = rootEl.querySelector(".analytics-chart-wrap");
        eventsEl = rootEl.querySelector(".analytics-events-wrap");
        applyBtn = rootEl.querySelector(".analytics-apply");

        const rangeSelect = rootEl.querySelector('[name="analyticsRange"]');

        if (rangeSelect instanceof HTMLSelectElement) {
            rangeSelect.value = String(activeDays);
        }

        if (applyBtn instanceof HTMLButtonElement) {
            applyBtn.addEventListener("click", async () => {
                if (isLoading) return;
                if (rangeSelect instanceof HTMLSelectElement) {
                    activeDays = parseDays(rangeSelect.value, 30);
                }
                isLoading = true;
                applyBtn.disabled = true;
                try {
                    await fetchData(activeDays);
                    updateView();
                } catch {
                    showToast(i18n.t("module.analytics.admin.fetch_failed"), {
                        variant: "error",
                    });
                } finally {
                    isLoading = false;
                    applyBtn.disabled = false;
                }
            });
        }
    }

    function unbindSection() {
        statsEl = null;
        chartEl = null;
        eventsEl = null;
        applyBtn = null;
    }

    return {
        id: "analytics",
        label: i18n.t("module.analytics.admin.label"),
        dataReady,
        subComposerOptions: {
            allowCustomization: false,
            preferenceKey: "administration-analytics-layout",
            heading: i18n.t("module.analytics.admin.heading"),
            elements: [
                {
                    id: "analytics-content",
                    label: i18n.t("module.analytics.admin.label"),
                    pinned: true,
                    render: () => `
                      <section class="analytics-panel">
                        <div class="analytics-filter-row">
                          <label class="analytics-filter">
                            ${i18n.t("module.analytics.admin.filter.time_range")}
                            <select name="analyticsRange" class="theme-select">
                              <option value="7">${i18n.t("module.analytics.admin.filter.days_7")}</option>
                              <option value="30">${i18n.t("module.analytics.admin.filter.days_30")}</option>
                              <option value="90">${i18n.t("module.analytics.admin.filter.days_90")}</option>
                            </select>
                          </label>
                          <button type="button" class="btn-confirm btn-animated analytics-apply">
                            ${i18n.t("ui.reuse.refresh")}
                          </button>
                        </div>
                        <div class="analytics-stats">${renderStats()}</div>
                        <div class="analytics-chart-section">
                          <h4 class="analytics-chart-title">${i18n.t("module.analytics.admin.chart.registrations_title")}</h4>
                          <div class="analytics-chart-wrap">${renderChart()}</div>
                        </div>
                        <div class="analytics-events-section">
                          <h4 class="analytics-events-title">${i18n.t("module.analytics.admin.events.title")}</h4>
                          <div class="analytics-events-wrap">${renderEvents()}</div>
                        </div>
                      </section>
                    `,
                },
            ],
            onRender: (rootEl) => {
                bindSection(rootEl);
            },
            onUnmount: () => {
                unbindSection();
            },
        },
    };
}
