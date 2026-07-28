/**
 * Provider-neutral password confirmation popup orchestration.
 *
 * Public exports:
 *   createPasswordConfirmationGuard(options) — wraps sensitive actions in a
 *     password confirmation prompt backed by the supplied auth capability.
 *
 * Usage:
 *   const guard = createPasswordConfirmationGuard({
 *     i18n,
 *     confirmPasswordImpl,
 *     openPopupImpl,
 *     escapeHtmlImpl,
 *   });
 *   await guard.runWithReprompt(saveSecret, { alwaysPrompt: true });
 *
 * @param {{ i18n: { t: (key: string) => string }, confirmPasswordImpl: (password?: string) => Promise<boolean>, openPopupImpl: Function, escapeHtmlImpl: (value: unknown) => string }} options
 * @returns {{ requestPasswordConfirmation: (config?: { title?: string, message?: string, alwaysPrompt?: boolean }) => Promise<{ password: string | null } | null>, runWithReprompt: (action: () => Promise<void> | void, config?: { title?: string, message?: string, alwaysPrompt?: boolean }) => Promise<boolean> }}
 */
export function createPasswordConfirmationGuard({
    i18n,
    confirmPasswordImpl,
    openPopupImpl,
    escapeHtmlImpl,
}) {
    async function requestPasswordConfirmation(config = {}) {
        const title = config.title ?? i18n.t("ui.reuse.reconfirm_action");
        const message =
            config.message ?? i18n.t("ui.reuse.sensitive_action_prompt");
        let inputEl = null;
        let warningEl = null;
        let isVerifying = false;

        if (config.alwaysPrompt !== true) {
            try {
                if (await confirmPasswordImpl()) {
                    return { password: null };
                }
            } catch {}
        }

        let confirmedPassword = null;
        const result = await openPopupImpl({
            title,
            body: () => `
        <form id="reprompt-form">
          <p>${escapeHtmlImpl(message)}</p>
          <label class="stack">
            <span>${escapeHtmlImpl(i18n.t("ui.reuse.enter_password_prompt"))}</span>
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
                overlay
                    .querySelector("#reprompt-form")
                    ?.addEventListener("submit", (event) => {
                        event.preventDefault();
                    });
            },
            onAction: async (actionId) => {
                if (actionId !== "confirm") return true;
                if (!(inputEl instanceof HTMLInputElement)) return false;
                if (isVerifying || !inputEl.value) return false;

                const warnAndRefocus = () => {
                    if (warningEl instanceof HTMLElement) {
                        warningEl.textContent = i18n.t(
                            "ui.reuse.incorrect_password",
                        );
                        warningEl.hidden = false;
                    }
                    inputEl.focus();
                    inputEl.select();
                };

                isVerifying = true;
                try {
                    if (!(await confirmPasswordImpl(inputEl.value))) {
                        warnAndRefocus();
                        return false;
                    }
                    confirmedPassword = inputEl.value;
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
                return true;
            },
        });

        return result === "confirm" ? { password: confirmedPassword } : null;
    }

    async function runWithReprompt(action, config = {}) {
        const confirmation = await requestPasswordConfirmation(config);
        if (!confirmation) return false;
        await action();
        return true;
    }

    return { requestPasswordConfirmation, runWithReprompt };
}
