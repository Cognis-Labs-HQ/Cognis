import { openPopup } from "./popup.js";
import { escapeHtml } from "./escape-html.js";
import { apiFetch } from "./api-client.js";

/**
 * Generic re-prompt guard for sensitive UI actions.
 *
 * Public exports:
 *   createRepromptGuard(options) — returns `runWithReprompt(action, config)` for
 *     wrapping action callbacks. The guard shows a password-entry popup and
 *     verifies the supplied password against the server before running the action.
 *
 * Usage:
 *   const guard = createRepromptGuard({ i18n });
 *   await guard.runWithReprompt(async () => doSomething(), {
 *     title: i18n.t("ui.reuse.reprompt.title"),
 *     message: i18n.t("ui.reuse.reprompt.message"),
 *   });
 *
 * @param {{ i18n: { t: (key: string) => string, [key: string]: unknown } }} options
 * @returns {{ runWithReprompt: (action: () => Promise<void> | void, config?: { title?: string, message?: string }) => Promise<boolean> }}
 */
export function createRepromptGuard({ i18n }) {
    async function runWithReprompt(action, config = {}) {
        const title = config.title ?? i18n.t("ui.reuse.reprompt.title");
        const message = config.message ?? i18n.t("ui.reuse.reprompt.message");
        let inputEl = null;
        let warningEl = null;
        let isVerifying = false;

        const result = await openPopup({
            title,
            body: () => `
        <p>${escapeHtml(message)}</p>
        <label class="stack">
          <span>${escapeHtml(i18n.t("ui.reuse.reprompt.input_label"))}</span>
          <input id="reprompt-password" type="password" autocomplete="current-password" />
        </label>
        <p id="reprompt-warning" class="reprompt-warning" role="alert" aria-live="polite" hidden></p>
      `,
            actions: [
                {
                    id: "confirm",
                    label: i18n.t("ui.reuse.generic.confirm"),
                    variant: "confirm",
                },
                {
                    id: "cancel",
                    label: i18n.t("ui.reuse.popup.cancel"),
                    variant: "cancel",
                },
            ],
            onOpen: (overlay) => {
                inputEl = overlay.querySelector("#reprompt-password");
                warningEl = overlay.querySelector("#reprompt-warning");
            },
            onAction: async (actionId) => {
                if (actionId !== "confirm") return true;
                if (!(inputEl instanceof HTMLInputElement)) return false;
                if (isVerifying) return false;

                const password = inputEl.value;
                if (!password) return false;

                const warn = () => {
                    if (!(warningEl instanceof HTMLElement)) return;
                    warningEl.textContent = i18n.t(
                        "ui.reuse.reprompt.invalid_password",
                    );
                    warningEl.hidden = false;
                };

                isVerifying = true;
                try {
                    const res = await apiFetch("/api/v1/auth/verify", {
                        method: "POST",
                        headers: { "content-type": "application/json" },
                        body: JSON.stringify({ password }),
                    });
                    if (!res.ok) {
                        warn();
                        inputEl.focus();
                        inputEl.select();
                        return false;
                    }
                } catch {
                    warn();
                    inputEl.focus();
                    inputEl.select();
                    return false;
                } finally {
                    isVerifying = false;
                }

                if (warningEl instanceof HTMLElement) {
                    warningEl.textContent = "";
                    warningEl.hidden = true;
                }

                await action();
                return true;
            },
        });

        return result === "confirm";
    }

    return { runWithReprompt };
}
