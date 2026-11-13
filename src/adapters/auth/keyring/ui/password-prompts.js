import { KEYRING_RELOCK_OPTIONS } from "./relock-options.js";
import { ensureKeyringFormStyles, loadKeyringI18n } from "./resources.js";

export async function requestKeyringPassword({
    i18n,
    message,
    prompt = "",
    signal,
}) {
    await ensureKeyringFormStyles();
    const [{ openPopup }, { escapeHtml }, { createFormBuilder }] =
        await Promise.all([
            import("/static/reuse/popup.js"),
            import("/static/reuse/escape-html.js"),
            import("/static/reuse/form-builder.js"),
        ]);
    const formBuilder = createFormBuilder(
        { i18n, escapeHtml },
        {
            formId: "keyring-unlock-form",
            formClassName: "keyring-password-form",
            includeSubmitButton: false,
            fields: [
                {
                    name: "password",
                    label: prompt,
                    type: "password",
                    required: true,
                    attributes: { autocomplete: "current-password" },
                },
            ],
        },
    );
    let formController = null;
    const result = await openPopup({
        title: i18n.t("adapter.auth.keyring.unlock_title"),
        body: `<div class="stack"><p>${escapeHtml(message)}</p>${formBuilder.render()}</div>`,
        actions: [
            {
                id: "unlock",
                label: i18n.t("adapter.auth.keyring.unlock_action"),
                variant: "confirm",
            },
            {
                id: "cancel",
                label: i18n.t("adapter.auth.keyring.cancel_action"),
                variant: "cancel",
            },
        ],
        onOpen(overlay, dismiss) {
            if (signal?.aborted) {
                dismiss();
                return;
            }
            signal?.addEventListener("abort", dismiss, { once: true });
            const formElement = overlay.querySelector("#keyring-unlock-form");
            if (formElement instanceof HTMLFormElement) {
                formController = formBuilder.attach(formElement);
                formElement.elements.namedItem("password")?.focus();
            }
        },
        onAction: (actionId) =>
            actionId !== "unlock" || Boolean(formController?.validateAll(true)),
    });
    if (result !== "unlock" || !formController) return "";
    return String(formController.getValues().password ?? "");
}

export async function requestKeyringSetup(
    accountPassword,
    { signal, setRelockMinutes, getRelockMinutes } = {},
) {
    await ensureKeyringFormStyles();
    const [{ openPopup }, { escapeHtml }, { createFormBuilder }] =
        await Promise.all([
            import("/static/reuse/popup.js"),
            import("/static/reuse/escape-html.js"),
            import("/static/reuse/form-builder.js"),
        ]);
    const i18n = await loadKeyringI18n();
    const formBuilder = createFormBuilder(
        { i18n, escapeHtml },
        {
            formId: "keyring-setup-form",
            formClassName: "keyring-password-form",
            includeSubmitButton: false,
            fields: [
                {
                    name: "password",
                    labelKey: "adapter.auth.keyring.setup_password",
                    type: "password",
                    required: true,
                    attributes: { autocomplete: "new-password" },
                },
                {
                    name: "confirmation",
                    labelKey: "adapter.auth.keyring.setup_confirm_password",
                    type: "password",
                    required: true,
                    attributes: { autocomplete: "new-password" },
                    criteria: [
                        {
                            id: "keyring-password-match",
                            type: "custom",
                            test: (value, values) => value === values.password,
                            messageKey:
                                "adapter.auth.keyring.setup_password_match",
                            mode: "submit",
                        },
                    ],
                },
                {
                    name: "relockMinutes",
                    labelKey: "gateway.auth.keyring.relock",
                    type: "select",
                    value: String(getRelockMinutes()),
                    options: KEYRING_RELOCK_OPTIONS.map(
                        ([minutes, labelKey]) => ({
                            value: String(minutes),
                            label: i18n.t(labelKey),
                        }),
                    ),
                },
            ],
        },
    );
    let formController = null;
    const result = await openPopup({
        title: i18n.t("adapter.auth.keyring.setup_title"),
        body: `<div class="stack"><p>${escapeHtml(i18n.t("adapter.auth.keyring.setup_message"))}</p>${formBuilder.render()}</div>`,
        actions: [
            {
                id: "setup",
                label: i18n.t("adapter.auth.keyring.setup_action"),
                variant: "confirm",
            },
            ...(accountPassword
                ? [
                      {
                          id: "use-account-password",
                          label: i18n.t(
                              "adapter.auth.keyring.setup_use_account_password",
                          ),
                          variant: "confirm",
                      },
                  ]
                : []),
        ],
        onOpen(overlay, dismiss) {
            if (signal?.aborted) {
                dismiss();
                return;
            }
            signal?.addEventListener("abort", dismiss, { once: true });
            const formElement = overlay.querySelector("#keyring-setup-form");
            if (formElement instanceof HTMLFormElement) {
                formController = formBuilder.attach(formElement);
                formElement.elements.namedItem("password")?.focus();
            }
        },
        onAction: (actionId) =>
            actionId !== "setup" || Boolean(formController?.validateAll(true)),
    });
    if (!formController || !["setup", "use-account-password"].includes(result))
        return "";
    signal?.throwIfAborted();
    await setRelockMinutes(
        Number(formController.getValues().relockMinutes ?? 0),
    );
    if (result === "use-account-password") return accountPassword;
    return String(formController.getValues().password ?? "");
}

export function resolveKeyringSetupPassword(enteredPassword, accountPassword) {
    return String(enteredPassword || accountPassword || "");
}
