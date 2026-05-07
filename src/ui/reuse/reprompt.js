import { openPopup } from "./popup.js";
import { escapeHtml } from "./escape-html.js";

/**
 * Generic re-prompt guard for sensitive UI actions.
 *
 * Public exports:
 *   createRepromptGuard(options) — returns `runWithReprompt(action, config)` for wrapping action callbacks.
 *
 * Usage:
 *   const guard = createRepromptGuard({ i18n });
 *   await guard.runWithReprompt(async () => doSomething(), {
 *     title: i18n.t("ui.reuse.reprompt.title"),
 *     message: i18n.t("ui.reuse.reprompt.message"),
 *     confirmationWord: "INVITE",
 *   });
 *
 * @param {{ i18n: { t: (key: string) => string } }} options
 * @returns {{ runWithReprompt: (action: () => Promise<void> | void, config?: { title?: string, message?: string, confirmationWord?: string }) => Promise<boolean> }}
 */
export function createRepromptGuard({ i18n }) {
    async function runWithReprompt(action, config = {}) {
        const title = config.title ?? i18n.t("ui.reuse.reprompt.title");
        const message = config.message ?? i18n.t("ui.reuse.reprompt.message");
        const confirmationWord =
            config.confirmationWord ?? i18n.t("ui.reuse.reprompt.default_word");
        let inputEl = null;

        const result = await openPopup({
            title,
            body: () => `
        <p>${escapeHtml(message)}</p>
        <label class="stack">
          <span>${escapeHtml(i18n.t("ui.reuse.reprompt.input_label").replace("{word}", confirmationWord))}</span>
          <input id="reprompt-word" type="text" />
        </label>
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
                inputEl = overlay.querySelector("#reprompt-word");
            },
        });

        if (result !== "confirm") return false;
        if (!(inputEl instanceof HTMLInputElement)) return false;
        if (inputEl.value.trim() !== confirmationWord) return false;
        await action();
        return true;
    }

    return { runWithReprompt };
}
