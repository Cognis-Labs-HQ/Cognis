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
    let savedPreference = false;
    let pendingPreference = false;
    const preferenceId = "calendar-prevent-status-updates";

    function updateSelection() {
        const selectedValue = String(pendingPreference);
        root.querySelectorAll(`[name="${preferenceId}"]`).forEach((input) => {
            input.checked = input.value === selectedValue;
        });
    }

    return {
        id: "calendar-status-preference",
        targetSectionId: "general",
        label: i18n.t("gateway.calendar.status_updates_title"),
        renderContent: () => `
          <fieldset class="settings-radio-group">
            <legend>${escapeHtml(i18n.t("gateway.calendar.status_updates_title"))}</legend>
            <label>
              <input type="radio" name="${preferenceId}" value="false" />
              ${escapeHtml(i18n.t("gateway.calendar.status_updates_allow"))}
            </label>
            <label>
              <input type="radio" name="${preferenceId}" value="true" />
              ${escapeHtml(i18n.t("gateway.calendar.status_updates_prevent"))}
            </label>
          </fieldset>`,
        async onRender() {
            try {
                savedPreference = await fetchStatusPreference();
            } catch (error) {
                showToast(
                    i18n.t("gateway.calendar.status_updates_load_failed"),
                    { variant: "error" },
                );
                throw error;
            }
            pendingPreference = savedPreference;
            updateSelection();
            root.querySelectorAll(`[name="${preferenceId}"]`).forEach(
                (input) => {
                    input.addEventListener("change", () => {
                        pendingPreference = input.value === "true";
                        markDirty(
                            preferenceId,
                            pendingPreference !== savedPreference,
                        );
                    });
                },
            );
        },
        isDirty: () => pendingPreference !== savedPreference,
        async save() {
            try {
                await saveStatusPreference(pendingPreference);
            } catch (error) {
                showToast(
                    i18n.t("gateway.calendar.status_updates_save_failed"),
                    { variant: "error" },
                );
                throw error;
            }
        },
        commit: () => {
            savedPreference = pendingPreference;
        },
        discard: () => {
            pendingPreference = savedPreference;
            updateSelection();
            markDirty(preferenceId, false);
        },
    };
}
