import { escapeHtml } from "/static/reuse/escape-html.js";
import { openPopup } from "/static/reuse/popup.js";
import { showToast } from "/static/reuse/toast.js";
import {
    createMessageTemplateId,
    loadSavedMessageTemplates,
    MAX_SAVED_MESSAGE_TEMPLATES,
    persistSavedMessageTemplates,
} from "./message-templates.js";
import { renderComposerPreviewMarkup } from "./message-render.js";

export function createMessageTemplatesUi({
    i18n,
    currentAccountId,
    resolveTemplateContent,
    onUseTemplate,
}) {
    let savedMessageTemplates = loadSavedMessageTemplates(currentAccountId);
    let activeTemplateId = null;
    let templateTitleInput = null;
    let templateBodyInput = null;
    let templatePreview = null;

    function renderSidebarTemplateList() {
        const listElement = document.getElementById(
            "messages-sidebar-template-list",
        );
        if (!(listElement instanceof HTMLElement)) return;
        if (savedMessageTemplates.length === 0) {
            listElement.innerHTML = `<li class="messages-template-list-empty">${escapeHtml(i18n.t("module.social.messages.templates_empty"))}</li>`;
            return;
        }
        listElement.innerHTML = savedMessageTemplates
            .map(
                (templateRecord) =>
                    `<li class="messages-template-card" data-template-id="${escapeHtml(templateRecord.id)}">
            <button type="button" class="messages-sidebar-template-load-btn" data-template-action="use" data-template-id="${escapeHtml(templateRecord.id)}">${escapeHtml(templateRecord.title)}</button>
            <div class="messages-template-card-actions">
              <button type="button" class="messages-sidebar-template-edit-btn" aria-label="${escapeHtml(i18n.t("module.social.messages.template_edit"))}" data-template-action="edit" data-template-id="${escapeHtml(templateRecord.id)}"><span class="messages-template-edit-icon" aria-hidden="true"></span></button>
              <button type="button" class="messages-sidebar-template-delete-btn btn-cancel" aria-label="${escapeHtml(i18n.t("module.social.messages.template_delete"))}" data-template-action="delete" data-template-id="${escapeHtml(templateRecord.id)}">🗑</button>
            </div>
          </li>`,
            )
            .join("");
    }

    function renderTemplateEditorPreview() {
        if (!(templatePreview instanceof HTMLElement)) return;
        const bodyValue =
            templateBodyInput instanceof HTMLTextAreaElement
                ? templateBodyInput.value
                : "";
        const resolvedContent = resolveTemplateContent(bodyValue);
        templatePreview.innerHTML = renderComposerPreviewMarkup(
            resolvedContent,
            i18n.t("module.social.messages.preview_placeholder"),
        );
    }

    function renderTemplatePopupBody(isEditing) {
        return `<form
      class="messages-template-editor"
      id="messages-template-editor"
      aria-label="${escapeHtml(i18n.t("module.social.messages.template_editor"))}"
    >
      <label class="messages-template-label" for="messages-template-title">${escapeHtml(i18n.t("module.social.messages.template_title"))}</label>
      <input
        id="messages-template-title"
        class="messages-template-title-input"
        type="text"
        maxlength="120"
        placeholder="${escapeHtml(i18n.t("module.social.messages.template_title_placeholder"))}"
      />
      <label class="messages-template-label" for="messages-template-body">${escapeHtml(i18n.t("module.social.messages.template_body"))}</label>
      <textarea
        id="messages-template-body"
        class="messages-template-body-input"
        rows="4"
        placeholder="${escapeHtml(i18n.t("module.social.messages.template_body_placeholder"))}"
      ></textarea>
      <div class="messages-template-token-row">
        <span class="messages-template-token-label">${escapeHtml(i18n.t("module.social.messages.template_variables"))}</span>
        <button type="button" class="messages-template-token-btn" data-template-token="{username}">{username}</button>
        <button type="button" class="messages-template-token-btn" data-template-token="{displayName}">{displayName}</button>
      </div>
      <div class="messages-template-preview">
        <p class="messages-template-preview-label">${escapeHtml(i18n.t("module.social.messages.template_preview"))}</p>
        <div
          id="messages-template-preview"
          class="messages-template-preview-markup messages-message-body"
          aria-live="polite"
        >${renderComposerPreviewMarkup("", i18n.t("module.social.messages.preview_placeholder"))}</div>
      </div>
      <div class="messages-template-actions">
        <button type="submit" class="btn-confirm btn-animated">${escapeHtml(isEditing ? i18n.t("ui.reuse.save") : i18n.t("ui.reuse.create"))}</button>
      </div>
    </form>`;
    }

    function editTemplateById(templateId) {
        const templateRecord = savedMessageTemplates.find(
            (entry) => String(entry.id) === String(templateId),
        );
        if (!templateRecord) return;
        activeTemplateId = templateRecord.id;
        if (templateTitleInput instanceof HTMLInputElement) {
            templateTitleInput.value = templateRecord.title;
        }
        if (templateBodyInput instanceof HTMLTextAreaElement) {
            templateBodyInput.value = templateRecord.content;
        }
        renderTemplateEditorPreview();
    }

    function bindTemplatePopupEvents(overlay) {
        const templateEditor = overlay.querySelector(
            "#messages-template-editor",
        );
        templateTitleInput = overlay.querySelector("#messages-template-title");
        templateBodyInput = overlay.querySelector("#messages-template-body");
        templatePreview = overlay.querySelector("#messages-template-preview");
        renderTemplateEditorPreview();
        templateEditor?.addEventListener("submit", (submitEvent) => {
            submitEvent.preventDefault();
            const titleValue =
                templateTitleInput instanceof HTMLInputElement
                    ? templateTitleInput.value.trim()
                    : "";
            const contentValue =
                templateBodyInput instanceof HTMLTextAreaElement
                    ? templateBodyInput.value.trim()
                    : "";
            if (!titleValue || !contentValue) {
                showToast(i18n.t("module.social.messages.template_invalid"), {
                    variant: "error",
                });
                return;
            }
            if (
                !activeTemplateId &&
                savedMessageTemplates.length >= MAX_SAVED_MESSAGE_TEMPLATES
            ) {
                showToast(i18n.t("module.social.messages.template_limit"), {
                    variant: "error",
                });
                return;
            }
            const templateRecord = {
                id: activeTemplateId ?? createMessageTemplateId(),
                title: titleValue,
                content: contentValue,
            };
            const existingIndex = savedMessageTemplates.findIndex(
                (entry) => String(entry.id) === String(templateRecord.id),
            );
            if (existingIndex >= 0) {
                savedMessageTemplates = [
                    ...savedMessageTemplates.slice(0, existingIndex),
                    templateRecord,
                    ...savedMessageTemplates.slice(existingIndex + 1),
                ];
            } else {
                savedMessageTemplates = [
                    templateRecord,
                    ...savedMessageTemplates,
                ];
            }
            persistSavedMessageTemplates(
                savedMessageTemplates,
                currentAccountId,
            );
            renderSidebarTemplateList();
            showToast(i18n.t("module.social.messages.template_saved"), {
                variant: "success",
            });
            overlay.querySelector('[data-popup-action="close"]')?.click();
        });
        templateBodyInput?.addEventListener("input", () => {
            renderTemplateEditorPreview();
        });
        overlay.addEventListener("click", (clickEvent) => {
            const tokenButton = clickEvent.target.closest(
                "[data-template-token]",
            );
            if (!(tokenButton instanceof HTMLButtonElement)) return;
            const token = String(
                tokenButton.dataset.templateToken ?? "",
            ).trim();
            if (!token) return;
            if (!(templateBodyInput instanceof HTMLTextAreaElement)) {
                return;
            }
            const start = templateBodyInput.selectionStart ?? 0;
            const end = templateBodyInput.selectionEnd ?? 0;
            const currentValue = templateBodyInput.value;
            templateBodyInput.value = `${currentValue.slice(0, start)}${token}${currentValue.slice(end)}`;
            const nextCursor = start + token.length;
            templateBodyInput.setSelectionRange(nextCursor, nextCursor);
            templateBodyInput.focus();
            renderTemplateEditorPreview();
        });
    }

    async function openTemplatesPopup(preloadTemplateId = null) {
        activeTemplateId = null;
        const isEditing = preloadTemplateId !== null;
        await openPopup({
            title: i18n.t("module.social.messages.templates"),
            body: renderTemplatePopupBody(isEditing),
            maxWidth: "600px",
            actions: [
                {
                    id: "close",
                    label: i18n.t("ui.reuse.close"),
                    variant: "cancel",
                },
            ],
            onOpen: (overlay) => {
                bindTemplatePopupEvents(overlay);
                if (isEditing) {
                    editTemplateById(preloadTemplateId);
                } else if (templateTitleInput instanceof HTMLInputElement) {
                    templateTitleInput.focus();
                }
            },
        });
    }

    async function handleSidebarTemplateClick(clickEvent) {
        const actionButton = clickEvent.target.closest(
            "[data-template-action]",
        );
        if (!(actionButton instanceof HTMLButtonElement)) return;
        const templateId = actionButton.dataset.templateId;
        if (!templateId) return;
        const action = actionButton.dataset.templateAction;
        if (action === "use") {
            const templateRecord = savedMessageTemplates.find(
                (entry) => String(entry.id) === String(templateId),
            );
            if (!templateRecord) return;
            onUseTemplate(templateRecord.content);
            return;
        }
        if (action === "edit") {
            await openTemplatesPopup(templateId);
            return;
        }
        if (action !== "delete") return;
        const templateRecord = savedMessageTemplates.find(
            (entry) => String(entry.id) === String(templateId),
        );
        if (!templateRecord) return;
        const escapedTemplateTitle = escapeHtml(templateRecord.title);
        const deleteConfirmBodyTemplate = i18n
            .t("module.social.messages.template_delete_confirm_body")
            .replace("{name}", "{templateName}");
        const deleteConfirmBody = escapeHtml(deleteConfirmBodyTemplate).replace(
            "{templateName}",
            escapedTemplateTitle,
        );
        const deleteResult = await openPopup({
            title: i18n.t(
                "module.social.messages.template_delete_confirm_title",
            ),
            body: deleteConfirmBody,
            variant: "danger",
            actions: [
                {
                    id: "cancel",
                    label: i18n.t("ui.reuse.cancel"),
                    variant: "cancel",
                },
                {
                    id: "confirm",
                    label: i18n.t("module.social.messages.template_delete"),
                    variant: "confirm",
                },
            ],
        });
        if (deleteResult !== "confirm") return;
        savedMessageTemplates = savedMessageTemplates.filter(
            (entry) => String(entry.id) !== String(templateId),
        );
        persistSavedMessageTemplates(savedMessageTemplates, currentAccountId);
        renderSidebarTemplateList();
        showToast(i18n.t("module.social.messages.template_deleted"), {
            variant: "success",
        });
    }

    return {
        handleSidebarTemplateClick,
        openTemplatesPopup,
        renderSidebarTemplateList,
        renderTemplateEditorPreview,
    };
}
