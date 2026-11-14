import { createFormBuilder } from "/static/reuse/form-builder.js";
import { escapeHtml } from "/static/reuse/escape-html.js";
import { markPopupFieldInvalid, openPopup } from "/static/reuse/popup.js";
import { showToast } from "/static/reuse/toast.js";

/**
 * Collect a validated recipient without issuing an invitation.
 * @param {{ t: (key: string) => string }} i18n Localized invitation catalog.
 * @param {{ signal?: AbortSignal }} options Owning page lifetime.
 * @returns {Promise<string|null>} Trimmed recipient, or null on dismissal.
 */
export async function requestInvitationEmail(i18n, { signal } = {}) {
    if (signal?.aborted) return null;
    const requiredMessage = i18n.t(
        "gateway.registration.invite.email_required",
    );
    const invalidMessage = i18n.t("gateway.registration.invite.email_invalid");
    const fieldName = `invite-email-${window.crypto.randomUUID()}`;
    const formId = `${fieldName}-form`;
    const formBuilder = createFormBuilder(
        { i18n, escapeHtml },
        {
            formId,
            includeSubmitButton: false,
            formAttributes: { novalidate: true },
            fields: [
                {
                    name: fieldName,
                    type: "email",
                    labelKey: "gateway.registration.invite.email",
                    required: true,
                    attributes: {
                        autocomplete: "email",
                        placeholder: i18n.t("ui.reuse.email_placeholder"),
                    },
                },
            ],
        },
    );
    const formLifetime = new AbortController();
    const log = console.info.bind(console);
    let formController;
    let emailInput;
    let inviteEmail = null;
    let dismissFeedback;
    try {
        const action = await openPopup({
            title: i18n.t("gateway.registration.send_invite_email"),
            body: formBuilder.render(),
            signal,
            actions: [
                {
                    id: "create",
                    label: i18n.t("gateway.registration.create_invite"),
                    variant: "confirm",
                },
            ],
            onOpen: (overlay) => {
                const form = overlay.querySelector(`#${formId}`);
                formController = formBuilder.attach(form, {
                    signal: formLifetime.signal,
                });
                emailInput = form.elements.namedItem(fieldName);
                emailInput.addEventListener(
                    "input",
                    () => dismissFeedback?.(),
                    { signal: formLifetime.signal },
                );
            },
            onAction: (actionId, overlay) => {
                if (actionId !== "create") return true;
                if (
                    signal?.aborted ||
                    formLifetime.signal.aborted ||
                    inviteEmail !== null
                )
                    return false;
                if (
                    !(emailInput instanceof HTMLInputElement) ||
                    !formController
                )
                    return false;
                const requiredValid = formController.validateAll(true);
                if (!requiredValid || !emailInput.validity.valid) {
                    const message = emailInput.value.trim()
                        ? invalidMessage
                        : requiredMessage;
                    markPopupFieldInvalid(overlay, emailInput.id, message);
                    dismissFeedback?.();
                    dismissFeedback = showToast(message, { variant: "error" });
                    log(
                        "[registration] invitation recipient needs correction",
                        {
                            component: "registration",
                            operation: "validateInvitationEmail",
                            reason: emailInput.value.trim()
                                ? "invalid_email"
                                : "required_email",
                        },
                    );
                    return false;
                }
                inviteEmail = formController.getValues()[fieldName].trim();
                return true;
            },
        });
        return action === "create" && !signal?.aborted ? inviteEmail : null;
    } finally {
        formLifetime.abort();
        formController?.detach();
        dismissFeedback?.();
    }
}
