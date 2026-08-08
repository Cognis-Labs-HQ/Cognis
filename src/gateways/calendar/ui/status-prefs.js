import { escapeHtml } from "/static/reuse/escape-html.js";
import { showToast } from "/static/reuse/toast.js";
import {
    fetchStatusPreference,
    saveStatusPreference,
} from "/static/gateways/calendar/ui/calendar-api.js";

const stylesheet = document.createElement("link");
stylesheet.rel = "stylesheet";
stylesheet.href = "/static/gateways/calendar/ui/status-prefs.css";
document.head.append(stylesheet);

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
        renderContent: () => `
          <label class="calendar-status-preference">
            <span>${escapeHtml(i18n.t("gateway.calendar.status_updates_allow"))}</span>
            <span class="switch switch--inline">
              <input id="${preferenceId}" type="checkbox" checked />
              <span class="slider"></span>
            </span>
          </label>`,
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
