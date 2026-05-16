import { formatDateTime } from "/static/reuse/timestamp.js";

const REFRESH_INTERVAL_MS = 2500;
const TABLE_COLUMN_COUNT = 5;

/**
 * Creates the Jitsi Meetings administration section contribution rendered in
 * the Administration page sub-composer.
 *
 * @example
 * const section = createAdminSection({ i18n, apiFetch, escapeHtml });
 *
 * @param {{
 *   i18n: { t: (key: string) => string },
 *   apiFetch: (url: string, init?: RequestInit) => Promise<Response>,
 *   escapeHtml: (value: string) => string,
 * }} options
 * @returns {{
 *   id: string,
 *   label: string,
 *   dataReady: Promise<void>,
 *   subComposerOptions: {
 *     allowCustomization: boolean,
 *     preferenceKey: string,
 *     heading: string,
 *     onRender: () => void,
 *     elements: Array<{
 *       id: string,
 *       label: string,
 *       pinned: boolean,
 *       render: () => string,
 *     }>,
 *   },
 * }}
 */
export function createAdminSection({ i18n, apiFetch, escapeHtml }) {
    let panelRoot = null;
    let refreshTimer = null;

    async function loadMeetings() {
        const response = await apiFetch(
            "/api/v1/modules/jitsi-meet/admin/meetings",
        );
        if (!response.ok) {
            return [];
        }
        const payload = await response.json().catch(() => ({ data: [] }));
        return Array.isArray(payload?.data) ? payload.data : [];
    }

    function renderRows(rows) {
        if (!rows.length) {
            return `<tr><td colspan="${TABLE_COLUMN_COUNT}">${escapeHtml(i18n.t("module.jitsi_meet.admin.meetings.empty"))}</td></tr>`;
        }
        return rows
            .map((row) => {
                const users = Array.isArray(row.activeUsernames)
                    ? row.activeUsernames.join(", ")
                    : "";
                return `<tr>
          <td><code>${escapeHtml(row.id ?? "")}</code></td>
          <td><a href="${escapeHtml(row.meetingUrl ?? "#")}" target="_blank" rel="noopener noreferrer">${escapeHtml(row.meetingName ?? "Cognis Classroom")}</a></td>
          <td>${escapeHtml(String(row.participantCount ?? 0))}</td>
          <td>${escapeHtml(users)}</td>
          <td>${escapeHtml(formatDateTime(row.updatedAt, i18n.t("ui.reuse.unknown")))}</td>
        </tr>`;
            })
            .join("");
    }

    async function refresh() {
        if (!(panelRoot instanceof HTMLElement) || !panelRoot.isConnected) {
            stopPolling();
            panelRoot = null;
            return;
        }
        const rows = await loadMeetings();
        const tbody = panelRoot.querySelector("tbody");
        if (!(tbody instanceof HTMLElement)) return;
        tbody.innerHTML = renderRows(rows);
    }

    function startPolling() {
        if (refreshTimer !== null) return;
        refreshTimer = setInterval(() => {
            void refresh();
        }, REFRESH_INTERVAL_MS);
    }

    function stopPolling() {
        if (refreshTimer === null) return;
        clearInterval(refreshTimer);
        refreshTimer = null;
    }

    return {
        id: "jitsi-meetings",
        label: i18n.t("ui.reuse.meetings"),
        dataReady: Promise.resolve(),
        subComposerOptions: {
            allowCustomization: false,
            preferenceKey: "administration-jitsi-meetings-layout",
            heading: i18n.t("ui.reuse.meetings"),
            onRender: () => {
                panelRoot = document.querySelector(
                    "#jitsi-admin-meetings-root",
                );
                if (!(panelRoot instanceof HTMLElement)) {
                    stopPolling();
                    return;
                }
                void refresh();
                startPolling();
            },
            elements: [
                {
                    id: "jitsi-live-meetings",
                    label: i18n.t(
                        "module.jitsi_meet.admin.meetings.table_label",
                    ),
                    pinned: true,
                    render: () => `
            <div class="users-table-wrap" id="jitsi-admin-meetings-root">
              <table class="users-table">
                <thead>
                  <tr>
                     <th>${escapeHtml(i18n.t("ui.reuse.id"))}</th>
                     <th>${escapeHtml(i18n.t("ui.reuse.meeting"))}</th>
                     <th>${escapeHtml(i18n.t("module.jitsi_meet.admin.meetings.participants"))}</th>
                     <th>${escapeHtml(i18n.t("module.jitsi_meet.admin.meetings.active_users"))}</th>
                     <th>${escapeHtml(i18n.t("module.jitsi_meet.admin.meetings.last_active"))}</th>
                   </tr>
                 </thead>
                                <tbody>
                  <tr><td colspan="${TABLE_COLUMN_COUNT}">${escapeHtml(i18n.t("module.jitsi_meet.admin.meetings.loading"))}</td></tr>
                </tbody>
              </table>
            </div>
          `,
                },
            ],
        },
    };
}
