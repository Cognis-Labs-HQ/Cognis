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
 *     title: i18n.t("ui.reuse.reconfirm_action"),
 *     message: i18n.t("ui.reuse.sensitive_action_prompt"),
 *   });
 *
 * @param {{ i18n: { t: (key: string) => string, [key: string]: unknown } }} options
 * @returns {{ runWithReprompt: (action: () => Promise<void> | void, config?: { title?: string, message?: string, alwaysPrompt?: boolean }) => Promise<boolean> }}
 */
export function createRepromptGuard({
    i18n,
    apiFetchImpl = apiFetch,
    openPopupImpl = openPopup,
}) {
    async function verifyCurrentSession(password = "") {
        const body = password ? { password } : {};
        return apiFetchImpl("/api/v1/auth/verify", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify(body),
        });
    }

    async function runWithReprompt(action, config = {}) {
        const title = config.title ?? i18n.t("ui.reuse.reconfirm_action");
        const message =
            config.message ?? i18n.t("ui.reuse.sensitive_action_prompt");
        let inputEl = null;
        let warningEl = null;
        let isVerifying = false;

        if (config.alwaysPrompt !== true) {
            try {
                const verificationResponse = await verifyCurrentSession();
                if (verificationResponse.ok) {
                    await action();
                    return true;
                }
            } catch {}
        }

        const result = await openPopupImpl({
            title,
            body: () => `
        <form id="reprompt-form">
          <p>${escapeHtml(message)}</p>
          <label class="stack">
            <span>${escapeHtml(i18n.t("ui.reuse.enter_password_prompt"))}</span>
            <input id="reprompt-password" type="password" autocomplete="current-password" />
          </label>
          <p id="reprompt-warning" class="reprompt-warning" role="alert" aria-live="polite" hidden></p>
        </form>
      `,
            actions: [
                {
                    id: "confirm",
                    label: i18n.t("ui.reuse.confirm"),
                    variant: "confirm",
                },
                {
                    id: "cancel",
                    label: i18n.t("ui.reuse.cancel"),
                    variant: "cancel",
                },
            ],
            onOpen: (overlay) => {
                inputEl = overlay.querySelector("#reprompt-password");
                warningEl = overlay.querySelector("#reprompt-warning");
                // No explicit cleanup needed: the form is a child of the ephemeral
                // overlay element, which popup.js removes from the DOM on close.
                overlay
                    .querySelector("#reprompt-form")
                    ?.addEventListener("submit", (event) => {
                        event.preventDefault();
                    });
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
                        "ui.reuse.incorrect_password",
                    );
                    warningEl.hidden = false;
                };
                const warnAndRefocus = () => {
                    warn();
                    inputEl.focus();
                    inputEl.select();
                };

                isVerifying = true;
                try {
                    const res = await verifyCurrentSession(password);
                    if (!res.ok) {
                        warnAndRefocus();
                        return false;
                    }
                } catch {
                    warnAndRefocus();
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
