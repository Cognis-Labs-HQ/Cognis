import { showToast } from "/static/reuse/toast.js";
import {
    fetchStatusPreference,
    saveStatusPreference,
} from "/static/gateways/calendar/ui/calendar-api.js";

export function createSettingsSection({ i18n, root, markDirty }) {
    let savedAllowed = true;
    let pendingAllowed = true;
    const preferenceId = "calendar-allow-status-updates";
    const content = [
        {
            id: "calendar-status-updates",
            items: [
                {
                    type: "title",
                    id: "calendar-status-updates-title",
                    text: i18n.t("gateway.calendar.status_updates_title"),
                    hint: i18n.t("gateway.calendar.status_updates_hint"),
                    hintAriaLabel: i18n.t("ui.reuse.more_information"),
                },
                {
                    type: "toggle",
                    id: preferenceId,
                    checked: true,
                    label: i18n.t("gateway.calendar.status_updates_allow"),
                },
            ],
        },
    ];

    function updateSelection() {
        const input = root.querySelector(`#${preferenceId}`);
        if (input) input.checked = pendingAllowed;
    }

    return {
        id: "calendar-status-preference",
        targetSectionId: "general",
        label: i18n.t("gateway.calendar.status_updates_title"),
        content,
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
