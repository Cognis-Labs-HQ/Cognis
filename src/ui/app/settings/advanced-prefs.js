/**
 * Advanced JSON preference editor for the Settings page.
 *
 * Public exports:
 *   initAdvancedPrefs(root, options) — protects, validates, and tracks edits to
 *     the complete UI preference document.
 *
 * Usage:
 *   const editor = initAdvancedPrefs(root, { existingPrefs, i18n, onDirtyChange });
 *   const preferences = editor.getPreferences();
 *
 * @param {Element} root
 * @param {{ existingPrefs?: object|null, i18n: object, onDirtyChange?: (dirty: boolean) => void }} options
 * @returns {{ requestEditingConsent: () => Promise<void>, getPreferences: () => object, isDirty: () => boolean, commit: (preferences: object) => void, discard: () => void, destroy: () => void }}
 */
import { openPopup } from "../../reuse/popup.js";
import { createFormDirtyTracker } from "../../reuse/unsaved-changes.js";
import { escapeHtml } from "../../reuse/escape-html.js";

function consentStorageKey() {
    const account = localStorage.getItem("cognis_account") ?? "anonymous";
    return `cognis_preferences_editor_accepted:${account}`;
}

export function initAdvancedPrefs(
    root,
    { existingPrefs, i18n, onDirtyChange },
) {
    const editor = root.querySelector("#prefs-dump");
    if (!(editor instanceof HTMLTextAreaElement)) {
        return {
            requestEditingConsent: async () => undefined,
            getPreferences: () => existingPrefs ?? {},
            isDirty: () => false,
            commit: () => undefined,
            discard: () => undefined,
            destroy: () => undefined,
        };
    }

    let committedPreferences = existingPrefs ?? {};
    let dirtyTracker;
    let warningOpen = false;
    const hasConsent = localStorage.getItem(consentStorageKey()) === "true";
    editor.readOnly = !hasConsent;

    function resetTracker() {
        dirtyTracker?.destroy();
        dirtyTracker = createFormDirtyTracker(editor.parentElement, {
            quiet: true,
        });
    }

    async function requestEditingConsent() {
        if (!editor.readOnly || warningOpen) return;
        warningOpen = true;
        const action = await openPopup({
            title: i18n.t("ui.app.settings.preferences_warning_title"),
            body: `<p>${escapeHtml(i18n.t("ui.app.settings.preferences_warning_body"))}</p>`,
            variant: "warning",
            actions: [
                {
                    id: "accept",
                    label: i18n.t("ui.app.settings.preferences_warning_accept"),
                    variant: "confirm",
                },
                {
                    id: "cancel",
                    label: i18n.t("ui.reuse.cancel"),
                    variant: "cancel",
                },
            ],
        });
        warningOpen = false;
        if (action !== "accept") return;
        localStorage.setItem(consentStorageKey(), "true");
        editor.readOnly = false;
        editor.focus();
    }

    function syncDirtyState() {
        dirtyTracker?.sync();
        onDirtyChange?.(dirtyTracker?.isAnyDirty() === true);
    }

    editor.addEventListener("focus", requestEditingConsent);
    editor.addEventListener("click", requestEditingConsent);
    editor.addEventListener("input", syncDirtyState);
    resetTracker();

    function getPreferences() {
        const preferences = JSON.parse(editor.value);
        if (
            !preferences ||
            typeof preferences !== "object" ||
            Array.isArray(preferences)
        ) {
            throw new TypeError("preferences_json_must_be_object");
        }
        return preferences;
    }

    function commit(preferences) {
        committedPreferences = preferences;
        editor.value = JSON.stringify(preferences, null, 2);
        resetTracker();
        onDirtyChange?.(false);
    }

    function discard() {
        commit(committedPreferences);
    }

    return {
        requestEditingConsent,
        getPreferences,
        isDirty: () => dirtyTracker?.isAnyDirty() === true,
        commit,
        discard,
        destroy: () => dirtyTracker?.destroy(),
    };
}
