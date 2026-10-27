import { isOffline } from "../../reuse/offline-state.js";

const selector =
    "#email-add-input, #email-add-btn, [data-account-action], [data-resend-verification], [data-set-primary], [data-remove-email]";

/** Keep network-only account actions disabled through connectivity changes. @returns {Function} Apply to a fresh render. */
export function bindOnlineSettingsControls(root, signal) {
    const disabled = new WeakMap();
    const refresh = () => {
        for (const element of root.querySelectorAll(selector)) {
            if (isOffline()) {
                if (!disabled.has(element))
                    disabled.set(element, element.disabled);
                element.disabled = true;
            } else if (disabled.has(element)) {
                element.disabled = disabled.get(element);
                disabled.delete(element);
            }
        }
    };
    window.addEventListener("cognis:connectivity-changed", refresh, { signal });
    return refresh;
}
