import { uiCtx } from "/static/reuse/ui-ctx.js";
import { captureAccountGuard } from "/static/reuse/offline-identity.js";
import { openPopup } from "/static/reuse/popup.js";
import { createFormBuilder } from "/static/reuse/form-builder.js";
import { showToast } from "/static/reuse/toast.js";
import { escapeHtml } from "/static/reuse/escape-html.js";
import { createProfileEditFields } from "./profile-edit-fields.js";
import { renderComposerMarkdownPreview } from "./profile-render.js";
import { saveProfileFields } from "./profile-save.js";

/** Own one page's editor, draft and pending save. @returns {{open: Function, dispose: Function}} */
export function createProfileEditor(options) {
    const { getState, i18n, signal } = options;
    const ownerRoot = getState().root;
    const assertAccount = captureAccountGuard();
    const lifetime = new AbortController();
    const hookId = `social:profile:editor:${crypto.randomUUID()}`;
    const log = (level, message, error) =>
        console[level](message, {
            component: "social-profile",
            operation: "editProfile",
            errorName: error?.name,
        });
    let active = null;

    function dispose() {
        if (lifetime.signal.aborted) return;
        lifetime.abort();
        active?.controller.abort();
        active = null;
        signal?.removeEventListener("abort", dispose);
        uiCtx.removeFlowHook("authenticate-session", "afterSession", hookId);
    }

    function ownsPage() {
        if (lifetime.signal.aborted) return false;
        try {
            assertAccount();
        } catch (error) {
            log("info", "[profile] editor account changed", error);
            dispose();
            return false;
        }
        if (getState().root !== ownerRoot || !ownerRoot.isConnected) {
            dispose();
            return false;
        }
        return true;
    }

    signal?.addEventListener("abort", dispose, { once: true });
    window.addEventListener("storage", ownsPage, { signal: lifetime.signal });
    uiCtx.extendFlow(
        "authenticate-session",
        "afterSession",
        { id: hookId },
        () => {
            ownsPage();
        },
    );
    if (signal?.aborted) dispose();

    function open() {
        if (!ownsPage()) return Promise.resolve(null);
        if (active) return active.promise;
        const entry = {
            controller: new AbortController(),
            overlay: null,
            saving: false,
        };
        active = entry;
        let profileEditFormController = null;
        const isCurrent = () =>
            ownsPage() &&
            active === entry &&
            !entry.controller.signal.aborted &&
            entry.overlay?.hasAttribute("data-popup-active");
        const formId = `profile-edit-form-${crypto.randomUUID()}`;
        const profileEditFormBuilder = createFormBuilder(
            { i18n, escapeHtml },
            {
                formId,
                formClassName: "profile-edit-form",
                submitLabelKey: "ui.reuse.save",
                includeSubmitButton: false,
                fields: createProfileEditFields(getState().profile, i18n),
            },
        );

        const popupPromise = openPopup({
            signal: entry.controller.signal,
            title: i18n.t("ui.app.profile.edit_profile"),
            body: () => profileEditFormBuilder.render(),
            variant: "info",
            maxWidth: "40%",
            onOpen: (overlay, requestClose) => {
                entry.overlay = overlay;
                entry.requestClose = () => {
                    entry.closeDecision ??= requestClose().finally(() => {
                        entry.closeDecision = null;
                    });
                    return entry.closeDecision;
                };
                overlay.addEventListener(
                    "keydown",
                    (event) => {
                        if (event.key !== "Escape") return;
                        event.preventDefault();
                        event.stopPropagation();
                        void entry.requestClose();
                    },
                    { signal: entry.controller.signal },
                );
                overlay.addEventListener(
                    "click",
                    (event) => {
                        if (event.target !== overlay) return;
                        event.stopImmediatePropagation();
                        void entry.requestClose();
                    },
                    { capture: true, signal: entry.controller.signal },
                );
                const popupFormElement =
                    overlay.querySelector(".profile-edit-form");
                if (!(popupFormElement instanceof HTMLFormElement))
                    throw new Error("profile_editor_form_unavailable");
                for (const input of popupFormElement.querySelectorAll(
                    "input[name], textarea[name], select[name]",
                )) {
                    const label = popupFormElement.querySelector(
                        `label[for="${input.id}"]`,
                    );
                    input.id = `${formId}-${input.name}`;
                    if (label) label.htmlFor = input.id;
                }
                profileEditFormController = profileEditFormBuilder.attach(
                    popupFormElement,
                    { signal: entry.controller.signal },
                );
                const popupBioInput = overlay.querySelector(
                    'textarea[name="bio"]',
                );
                const bioFieldWrapper = overlay.querySelector(
                    '[data-form-builder-field="bio"]',
                );
                const bioPreviewElement = document.createElement("div");
                bioPreviewElement.id = `${formId}-bio-preview`;
                bioPreviewElement.className =
                    "profile-edit-bio-preview profile-markdown";
                bioPreviewElement.setAttribute("aria-live", "polite");
                if (bioFieldWrapper instanceof HTMLElement) {
                    bioFieldWrapper.insertAdjacentElement(
                        "afterend",
                        bioPreviewElement,
                    );
                }
                const renderBioPreview = () => {
                    const bioValue =
                        popupBioInput instanceof HTMLTextAreaElement
                            ? popupBioInput.value
                            : "";
                    bioPreviewElement.innerHTML = renderComposerMarkdownPreview(
                        bioValue,
                        i18n.t("ui.app.profile.bio_preview_placeholder"),
                    );
                };
                renderBioPreview();
                popupBioInput?.addEventListener("input", renderBioPreview, {
                    signal: entry.controller.signal,
                });
            },
            actions: [
                {
                    id: "cancel",
                    label: i18n.t("ui.reuse.discard"),
                    variant: "cancel",
                },
                {
                    id: "save",
                    label: i18n.t("ui.reuse.save"),
                    variant: "confirm",
                },
            ],
            onAction: async (actionId) => {
                if (!isCurrent()) return false;
                if (actionId !== "save") {
                    await entry.requestClose();
                    return false;
                }
                if (
                    entry.saving ||
                    profileEditFormController?.validateAll(true) !== true
                )
                    return false;
                entry.saving = true;
                const fields = profileEditFormController.getValues();
                const controls = [
                    ...entry.overlay.querySelectorAll(
                        '.profile-edit-form input, .profile-edit-form textarea, .profile-edit-form select, [data-popup-action="save"]',
                    ),
                ];
                const disabled = controls.map((control) => control.disabled);
                controls.forEach((control) => {
                    control.disabled = true;
                });
                entry.overlay
                    .querySelector(".profile-edit-form")
                    .setAttribute("aria-busy", "true");
                log("info", "[profile] saving editor draft");
                try {
                    return (
                        (await saveProfileFields(fields, {
                            ...options,
                            isCurrent,
                            awaitCloseDecision: () => entry.closeDecision,
                        })) && isCurrent()
                    );
                } finally {
                    entry.saving = false;
                    if (isCurrent()) {
                        controls.forEach((control, index) => {
                            control.disabled = disabled[index];
                        });
                        entry.overlay
                            .querySelector(".profile-edit-form")
                            .removeAttribute("aria-busy");
                    }
                }
            },
            closeProtection: true,
        });

        entry.promise = popupPromise
            .then((result) => {
                if (result !== "save" && entry.saving && ownsPage()) {
                    showToast(i18n.t("ui.app.profile.save_pending_closed"), {
                        variant: "info",
                    });
                }
                return result;
            })
            .finally(() => {
                profileEditFormController?.detach();
                entry.controller.abort();
                if (active === entry) active = null;
                log("info", "[profile] editor closed");
            });
        return entry.promise;
    }

    return { open, dispose };
}
