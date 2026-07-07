import { escapeHtml } from "/static/reuse/escape-html.js";
import { extendI18n } from "/static/reuse/i18n.js";
import { showToast } from "/static/reuse/toast.js";
import { apiFetch } from "/static/reuse/api-client.js";

const API_BASE = "/api/v1/modules/nextcloud-whiteboard";

async function spawnDashboardWhiteboard(title) {
    const response = await apiFetch(`${API_BASE}/whiteboards/spawn`, {
        method: "POST",
        body: JSON.stringify({ title, participants: [] }),
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
        throw new Error(payload?.error?.message ?? "Request failed.");
    }
    return payload.data;
}

export async function createPageElement({ i18n }) {
    const moduleI18n = await extendI18n(
        i18n,
        "/static/modules/nextcloud-whiteboard/languages",
    );
    return {
        id: "nextcloud-whiteboard-launcher",
        label: moduleI18n.t("module.nextcloud_whiteboard.dashboard_label"),
        gridSize: { default: [4, 2], min: [3, 2], max: [6, 3] },
        render: () => `
            <h3>${escapeHtml(moduleI18n.t("module.nextcloud_whiteboard.dashboard_label"))}</h3>
            <p>${escapeHtml(moduleI18n.t("module.nextcloud_whiteboard.dashboard_description"))}</p>
            <button type="button" id="nextcloud-whiteboard-dashboard-open">${escapeHtml(moduleI18n.t("module.nextcloud_whiteboard.dashboard_open"))}</button>
        `,
        onRender: () => {
            document
                .getElementById("nextcloud-whiteboard-dashboard-open")
                ?.addEventListener("click", async () => {
                    try {
                        const result = await spawnDashboardWhiteboard(
                            moduleI18n.t(
                                "module.nextcloud_whiteboard.dashboard_title",
                            ),
                        );
                        if (result?.launchUrl)
                            window.location.href = result.launchUrl;
                    } catch (error) {
                        showToast(error.message, { variant: "error" });
                    }
                });
        },
    };
}
