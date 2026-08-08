import { escapeHtml } from "/static/reuse/escape-html.js";
import { renderInfoTooltip } from "/static/reuse/info-tooltip.js";
import { showToast } from "/static/reuse/toast.js";
import {
    fetchStatusPreference,
    saveStatusPreference,
} from "/static/gateways/calendar/ui/calendar-api.js";

export function createSettingsSection({ i18n, root, markDirty }) {
    let savedAllowed = true;
    let pendingAllowed = true;
    const preferenceId = "calendar-allow-status-updates";

    function updateSelection() {
        const input = root.querySelector(`#${preferenceId}`);
        if (input) input.checked = pendingAllowed;
    }

    return {
        id: "calendar-status-preference",
        targetSectionId: "general",
        label: i18n.t("gateway.calendar.status_updates_title"),
        renderContent: () => {
            const tooltipAria = i18n.t("ui.reuse.more_information");
            return `
          <div class="components-section">
            <h3 class="components-section-heading">
              ${escapeHtml(i18n.t("gateway.calendar.status_updates_title"))}
              ${renderInfoTooltip(i18n.t("gateway.calendar.status_updates_hint"), tooltipAria, "calendar-status-updates")}
            </h3>
            <div class="components-section-body">
            <label class="switch" aria-label="${escapeHtml(i18n.t("gateway.calendar.status_updates_allow"))}">
              <input id="${preferenceId}" type="checkbox" checked />
              <span class="slider"></span>
            </label>
            </div>
          </div>`;
        },
        async onRender() {
            try {
                savedAllowed = !(await fetchStatusPreference());
            } catch (error) {
                showToast(
                    i18n.t("gateway.calendar.status_updates_load_failed"),
                    { variant: "error" },
                );
                throw error;
            }
            pendingAllowed = savedAllowed;
            updateSelection();
            root.querySelector(`#${preferenceId}`)?.addEventListener(
                "change",
                (event) => {
                    pendingAllowed = event.currentTarget.checked;
                    markDirty(preferenceId, pendingAllowed !== savedAllowed);
                },
            );
        },
        isDirty: () => pendingAllowed !== savedAllowed,
        async save() {
            try {
                await saveStatusPreference(!pendingAllowed);
            } catch (error) {
                showToast(
                    i18n.t("gateway.calendar.status_updates_save_failed"),
                    { variant: "error" },
                );
                throw error;
            }
        },
        commit: () => {
            savedAllowed = pendingAllowed;
        },
        discard: () => {
            pendingAllowed = savedAllowed;
            updateSelection();
            markDirty(preferenceId, false);
        },
    };
}
