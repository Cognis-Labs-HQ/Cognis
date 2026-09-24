import { escapeHtml } from "/static/reuse/escape-html.js";
import { openPopup } from "/static/reuse/popup.js";
import { showToast } from "/static/reuse/toast.js";
import { createFormBuilder } from "/static/reuse/form-builder.js";
import { renderHorizontalCarousel } from "/static/reuse/horizontal-carousel.js";
import { uiCtx } from "/static/reuse/ui-ctx.js";
import {
    requestLibraryUpdate,
    updateLibraryEntry,
} from "/static/gateways/study/ui/library-client.js";
import { localizedLabel } from "./presentation.js";
import { entryEditMode } from "./editability.js";

export function inputForField(field, value, language, i18n) {
    const label = localizedLabel(field.metadata, language);
    const name = `field:${field.id}`;
    const control = field.input?.control;
    const options = field.input?.options ?? [];
    if (control === "audioFile") {
        const namespace = field.input?.file?.namespace ?? "";
        const prefix = field.input?.file?.prefix ?? `${language}/`;
        return `<label class="library-audio-field" data-library-audio-field data-namespace="${escapeHtml(namespace)}" data-prefix="${escapeHtml(prefix)}"><span>${escapeHtml(label)} (${escapeHtml(i18n.t("gateway.study.library_optional"))})</span><input name="${escapeHtml(name)}" type="hidden" value="${escapeHtml(value ?? "")}"><input type="file" accept="audio/mpeg,audio/ogg,audio/wav,audio/webm,audio/mp4"></label>`;
    }
    if (control === "singleSelect" || control === "multiSelect")
        return `<label><span>${escapeHtml(label)}</span><select name="${escapeHtml(name)}"${control === "multiSelect" ? " multiple" : ""}${field.input?.immutable ? " disabled" : ""}${field.required ? " required" : ""}>${options.map((option) => `<option value="${escapeHtml(option.value)}"${(Array.isArray(value) ? value.includes(option.value) : value === option.value) ? " selected" : ""}>${escapeHtml(localizedLabel(option.metadata, language))}</option>`).join("")}</select></label>`;
    const valueKind = field.validation?.kind ?? field.type;
    if (valueKind === "boolean")
        return `<label class="library-admin-checkbox"><input name="${escapeHtml(name)}" type="checkbox" class="choice-checkbox"${value === true ? " checked" : ""}> <span>${escapeHtml(label)}</span></label>`;
    if (valueKind === "localizedText") {
        const translations =
            value && typeof value === "object" && !Array.isArray(value)
                ? value
                : {};
        const uiLanguages = ["de", "en", "id", "ja"];
        return `<fieldset class="library-admin-localized-field"><legend>${escapeHtml(label)}</legend>${uiLanguages
            .map((locale) => [locale, translations[locale] ?? ""])
            .map(
                ([locale, text]) =>
                    `<label><span>${escapeHtml(locale)}</span><input name="${escapeHtml(`${name}:${locale}`)}" value="${escapeHtml(String(text))}"${field.required ? " required" : ""}></label>`,
            )
            .join("")}</fieldset>`;
    }
    if (
        field.type === "stringList" ||
        field.validation?.kind === "list" ||
        control === "tagList"
    )
        return `<div class="library-tag-field" data-library-tag-field><span>${escapeHtml(label)}</span><div class="library-tag-list">${(Array.isArray(value) ? value : []).map((item) => `<button type="button" class="btn-neutral" data-library-tag="${escapeHtml(item)}">${escapeHtml(item)} ×</button>`).join("")}</div><input data-library-tag-input aria-label="${escapeHtml(label)}"><input name="${escapeHtml(name)}" type="hidden" value="${escapeHtml((Array.isArray(value) ? value : []).join("\u001f"))}"${field.required ? " required" : ""}></div>`;
    const inputType =
        ["number", "integer"].includes(field.type) ||
        field.validation?.kind === "number" ||
        control === "number"
            ? "number"
            : "text";
    const step =
        field.type === "integer" || field.validation?.integer ? "1" : "any";
    return `<label><span>${escapeHtml(label)}</span><input name="${escapeHtml(name)}" type="${inputType}"${inputType === "number" ? ` step="${step}"` : ""} value="${escapeHtml(value ?? "")}"${field.required ? " required" : ""}${field.input?.immutable ? " disabled" : ""}></label>`;
}

export function bindLibraryEditorControls(form, entry, i18n) {
    const activateTab = (tabId) => {
        form.querySelectorAll("[data-library-editor-tab]").forEach((button) => {
            const active = button.dataset.libraryEditorTab === tabId;
            button.classList.toggle("active", active);
            button.setAttribute("aria-selected", String(active));
        });
        form.querySelectorAll("[data-library-editor-panel]").forEach(
            (panel) => {
                panel.hidden = panel.dataset.libraryEditorPanel !== tabId;
            },
        );
    };
    form.querySelector("[data-library-editor-tabs]")?.addEventListener(
        "click",
        (event) => {
            const tab = event.target.closest("[data-library-editor-tab]");
            if (tab) activateTab(tab.dataset.libraryEditorTab);
        },
    );
    form.addEventListener(
        "invalid",
        (event) => {
            const panel = event.target.closest("[data-library-editor-panel]");
            if (panel) activateTab(panel.dataset.libraryEditorPanel);
        },
        true,
    );
    form.querySelectorAll("select[multiple]").forEach((select) => {
        select.addEventListener("mousedown", (event) => {
            if (event.target.tagName !== "OPTION") return;
            event.preventDefault();
            event.target.selected = !event.target.selected;
            select.dispatchEvent(new Event("change", { bubbles: true }));
        });
    });
    form.querySelectorAll("[data-library-audio-field]").forEach((field) => {
        const client = uiCtx.capabilities.get("files:uiClient");
        const stored = field.querySelector('input[type="hidden"]');
        const picker = field.querySelector('input[type="file"]');
        if (!client) return;
        picker.addEventListener("change", async () => {
            const file = picker.files?.[0];
            if (!file) return;
            const identity =
                String(form.elements.label?.value || entry.id)
                    .normalize("NFKC")
                    .toLocaleLowerCase()
                    .replace(/[^\p{L}\p{N}]+/gu, "-")
                    .replace(/^-|-$/g, "") || "card";
            const key = `${field.dataset.prefix}${identity}-${entry.id || "new"}.audio`;
            field.dataset.uploading = "true";
            picker.disabled = true;
            try {
                await client.uploadAudio(field.dataset.namespace, key, file);
                stored.value = `file:${key}`;
                showToast(
                    i18n.t("gateway.study.library_audio_upload_success"),
                    {
                        variant: "success",
                    },
                );
            } catch {
                showToast(i18n.t("gateway.study.library_audio_upload_error"), {
                    variant: "error",
                });
            } finally {
                delete field.dataset.uploading;
                picker.disabled = false;
            }
        });
    });
    form.querySelectorAll("[data-library-tag-field]").forEach((field) => {
        const input = field.querySelector("[data-library-tag-input]");
        const hidden = field.querySelector('input[type="hidden"]');
        const list = field.querySelector(".library-tag-list");
        const values = () =>
            Array.from(
                list.querySelectorAll("[data-library-tag]"),
                (tag) => tag.dataset.libraryTag,
            );
        list.addEventListener("click", (event) => {
            const tag = event.target.closest("[data-library-tag]");
            if (!tag) return;
            tag.remove();
            hidden.value = values().join("\u001f");
        });
        input.addEventListener("keydown", (event) => {
            if (event.key !== "Enter") return;
            event.preventDefault();
            event.stopPropagation();
            const value = input.value.trim();
            if (!value || values().includes(value)) return;
            const tag = document.createElement("button");
            tag.type = "button";
            tag.className = "btn-neutral";
            tag.dataset.libraryTag = value;
            tag.textContent = `${value} ×`;
            list.append(tag);
            hidden.value = values().join("\u001f");
            input.value = "";
        });
    });
}

function relationshipEditor(
    relationship,
    entry,
    entries,
    language,
    {
        carousel = false,
        addLabel = "Add",
        previousLabel = "Previous",
        nextLabel = "Next",
    } = {},
) {
    const label =
        localizedLabel(relationship.metadata, language) || relationship.id;
    const selected = new Set(
        (entry.references ?? [])
            .filter(({ relation }) => relation === relationship.id)
            .map(({ entryId }) => entryId),
    );
    const targets = entries.filter(
        (candidate) =>
            candidate.schemaId === entry.schemaId &&
            candidate.layer === relationship.targetLayer &&
            candidate.id !== entry.id,
    );
    const select = `<select name="relationship:${escapeHtml(relationship.id)}" multiple${carousel ? " hidden" : ` size="${Math.min(6, Math.max(2, targets.length))}"`}>${targets.map((target) => `<option value="${escapeHtml(target.id)}"${selected.has(target.id) ? " selected" : ""}>${escapeHtml(target.label)}</option>`).join("")}</select>`;
    if (!carousel)
        return `<label><span>${escapeHtml(label)}</span>${select}</label>`;
    return `<div class="library-composer-relationship" data-library-composer-relationship="${escapeHtml(relationship.id)}" data-target-layer="${escapeHtml(relationship.targetLayer)}">${select}${renderHorizontalCarousel({ id: relationship.id, label, items: targets.map((target) => ({ value: target.id, label: target.label })), selectedValues: [...selected], addLabel, previousLabel, nextLabel })}</div>`;
}

export function editorBody(
    entry,
    schemas,
    entries,
    i18n,
    extraHtml = "",
    options = {},
) {
    const schema = schemas.find(({ id }) => id === entry.schemaId);
    const layer = schema?.layers.find(({ id }) => id === entry.layer);
    const immutableStringKeyField =
        layer?.semanticRole === "definition"
            ? layer.definitionLocalization?.stringKeyField
            : undefined;
    const fields = (layer?.fields ?? [])
        .filter((field) => field.id !== immutableStringKeyField)
        .map((field) =>
            inputForField(
                field,
                entry.fields?.[field.id],
                schema.language,
                i18n,
            ),
        )
        .join("");
    const relationships = (layer?.relationships ?? [])
        .map((relationship) =>
            relationshipEditor(relationship, entry, entries, schema.language, {
                carousel: options.relationshipCarousels === true,
                addLabel: i18n.t("gateway.study.library_create"),
                previousLabel: i18n.t("ui.reuse.previous"),
                nextLabel: i18n.t("ui.reuse.next"),
            }),
        )
        .join("");
    const referencedEntries = (entry.references ?? [])
        .map(({ entryId }) => entries.find(({ id }) => id === entryId))
        .filter(Boolean);
    const definitionEntries = referencedEntries.filter((candidate) => {
        const candidateLayer = schema?.layers.find(
            ({ id }) => id === candidate.layer,
        );
        return candidateLayer?.semanticRole === "definition";
    });
    const definitionSummary = definitionEntries.length
        ? definitionEntries
              .map(
                  (definition) =>
                      `<article class="library-editor-aggregate"><header><strong>${escapeHtml(definition.label)}</strong>${entryEditMode(definition) ? `<button class="btn-neutral" type="button" data-library-edit-related="${escapeHtml(definition.id)}">${escapeHtml(i18n.t("ui.reuse.edit"))}</button>` : ""}</header><dl>${Object.entries(
                          definition.fields ?? {},
                      )
                          .map(
                              ([key, value]) =>
                                  `<dt>${escapeHtml(key)}</dt><dd>${escapeHtml(typeof value === "object" ? JSON.stringify(value) : String(value ?? ""))}</dd>`,
                          )
                          .join("")}</dl></article>`,
              )
              .join("")
        : `<p>${escapeHtml(i18n.t("gateway.study.library_editor_no_definitions"))}</p>`;
    const contentClass =
        entry.class ??
        (layer?.semanticRole === "definition"
            ? "definition"
            : layer?.semanticRole === "orderedLexicalSequence"
              ? "composite"
              : "");
    const label = options.generatedLabel
        ? `<input name="label" type="hidden" required maxlength="500" value="${escapeHtml(entry.label)}">`
        : `<label><span>${escapeHtml(options.labelText ?? i18n.t("gateway.study.library_admin_label"))} *</span><input name="label" required maxlength="500" value="${escapeHtml(entry.label)}"></label>`;
    const classField = `<label><span>${escapeHtml(i18n.t("gateway.study.library_content_class"))}</span><input name="class" value="${escapeHtml(contentClass)}"${["definition", "composite"].includes(contentClass) ? " readonly" : ""}></label>`;
    const isDefinition = layer?.semanticRole === "definition";
    const builder = createFormBuilder(
        { i18n, escapeHtml },
        {
            formId: "library-admin-editor",
            formClassName: "library-admin-editor",
            formAttributes: { "data-library-admin-editor": true },
            includeSubmitButton: false,
            submitLabelKey: "ui.reuse.save",
            fields: [],
            trustedContentHtml: `<nav class="library-editor-tabs" role="tablist" data-library-editor-tabs><button class="btn-neutral active" type="button" role="tab" aria-selected="true" data-library-editor-tab="content">${escapeHtml(i18n.t("gateway.study.library_editor_content"))}</button><button class="btn-neutral" type="button" role="tab" aria-selected="false" data-library-editor-tab="relationships">${escapeHtml(i18n.t("gateway.study.library_editor_relationships"))}</button><button class="btn-neutral" type="button" role="tab" aria-selected="false" data-library-editor-tab="definitions">${escapeHtml(i18n.t("gateway.study.library_definitions"))}</button></nav><section class="library-editor-panel" data-library-editor-panel="content">${label}${classField}${extraHtml}${fields}${isDefinition || options.includeAlwaysShowDefinition === false ? '<input name="alwaysShowDefinition" type="hidden" value="">' : `<label class="library-admin-hidden"><input name="alwaysShowDefinition" type="checkbox" class="choice-checkbox"${entry.alwaysShowDefinition ? " checked" : ""}> <span>${escapeHtml(i18n.t("gateway.study.library_always_show_definition"))}</span></label>`}${isDefinition ? '<input name="hidden" type="hidden" value="true">' : options.includeHidden === false ? '<input name="hidden" type="hidden" value="">' : `<label class="library-admin-hidden"><input name="hidden" type="checkbox" class="choice-checkbox"${entry.hidden ? " checked" : ""}> <span>${escapeHtml(i18n.t("gateway.study.library_admin_hidden"))}</span></label>`}</section><section class="library-editor-panel" data-library-editor-panel="relationships" hidden>${relationships || `<p>${escapeHtml(i18n.t("gateway.study.library_editor_no_relationships"))}</p>`}</section><section class="library-editor-panel" data-library-editor-panel="definitions" hidden>${definitionSummary}</section>`,
        },
    );
    return { html: builder.render(), builder };
}

export function readFields(form, layer, entry) {
    const immutableStringKeyField =
        layer?.semanticRole === "definition"
            ? layer.definitionLocalization?.stringKeyField
            : undefined;
    return {
        ...(entry.fields ?? {}),
        ...Object.fromEntries(
            (layer?.fields ?? [])
                .filter((field) => field.id !== immutableStringKeyField)
                .map((field) => {
                    if (field.input?.immutable === true)
                        return [field.id, entry.fields?.[field.id]];
                    const name = `field:${field.id}`;
                    const valueKind = field.validation?.kind ?? field.type;
                    if (valueKind === "boolean")
                        return [
                            field.id,
                            form.elements[name]?.checked === true,
                        ];
                    if (valueKind === "localizedText") {
                        const translations = {};
                        for (const control of form.elements) {
                            if (control.name?.startsWith(`${name}:`))
                                translations[
                                    control.name.slice(name.length + 1)
                                ] = control.value;
                        }
                        return [field.id, translations];
                    }
                    const value = form.elements[name]?.value ?? "";
                    if (
                        field.type === "stringList" ||
                        field.validation?.kind === "list" ||
                        field.input?.control === "multiSelect"
                    )
                        return [
                            field.id,
                            field.input?.control === "multiSelect"
                                ? Array.from(
                                      form.elements[name]?.selectedOptions ??
                                          [],
                                      (option) => option.value,
                                  )
                                : value.split("\u001f").filter(Boolean),
                        ];
                    if (
                        ["number", "integer"].includes(field.type) ||
                        field.validation?.kind === "number" ||
                        field.input?.control === "number"
                    )
                        return [
                            field.id,
                            value === "" ? undefined : Number(value),
                        ];
                    return [field.id, value];
                }),
        ),
    };
}

export function readReferences(form, layer) {
    return (layer?.relationships ?? []).flatMap((relationship) =>
        Array.from(
            form.elements[`relationship:${relationship.id}`]?.selectedOptions ??
                [],
            (option, position) => ({
                entryId: option.value,
                relation: relationship.id,
                position,
            }),
        ),
    );
}

export async function openLibraryEntryEditor({
    entry,
    entries,
    schemas,
    i18n,
    requestUpdate = false,
    onSaved = () => {},
}) {
    const schema = schemas.find(({ id }) => id === entry.schemaId);
    const layer = schema?.layers.find(({ id }) => id === entry.layer);
    const editor = editorBody(entry, schemas, entries, i18n);
    let formController;
    return openPopup({
        title: i18n
            .t("gateway.study.library_admin_edit_title")
            .replace("{{ entry }}", entry.label),
        body: editor.html,
        maxWidth: "min(72rem, 96vw)",
        closeProtection: true,
        actions: [
            { id: "save", label: i18n.t("ui.reuse.save"), variant: "confirm" },
            {
                id: "cancel",
                label: i18n.t("ui.reuse.cancel"),
                variant: "cancel",
            },
        ],
        onOpen(overlay) {
            const form = overlay.querySelector("[data-library-admin-editor]");
            formController = editor.builder.attach(form);
            bindLibraryEditorControls(form, entry, i18n);
            form.addEventListener("click", (event) => {
                const button = event.target.closest(
                    "[data-library-edit-related]",
                );
                if (!button) return;
                const related = entries.find(
                    ({ id }) => id === button.dataset.libraryEditRelated,
                );
                const mode = related ? entryEditMode(related) : null;
                if (!related || !mode) return;
                void openLibraryEntryEditor({
                    entry: related,
                    entries,
                    schemas,
                    i18n,
                    requestUpdate: mode === "request",
                    onSaved: (updated) => {
                        if (mode === "direct") Object.assign(related, updated);
                    },
                });
            });
        },
        onAction: async (action, overlay) => {
            if (action !== "save") return true;
            const form = overlay.querySelector("[data-library-admin-editor]");
            if (
                form.querySelector('[data-uploading="true"]') ||
                !formController?.validateAll(true) ||
                !form.checkValidity()
            ) {
                form.reportValidity();
                return false;
            }
            const proposedEntry = {
                schemaId: entry.schemaId,
                schemaVersion: entry.schemaVersion,
                layer: entry.layer,
                label: form.elements.label.value,
                class: form.elements.class.value || undefined,
                hidden:
                    form.elements.hidden.value === "true" ||
                    form.elements.hidden.checked,
                alwaysShowDefinition:
                    form.elements.alwaysShowDefinition.checked,
                fields: readFields(form, layer, entry),
                references: readReferences(form, layer),
            };
            const updated = requestUpdate
                ? await requestLibraryUpdate(entry.id, proposedEntry)
                : await updateLibraryEntry(entry.id, proposedEntry);
            if (!requestUpdate) Object.assign(entry, updated);
            onSaved(updated);
            showToast(
                i18n.t(
                    requestUpdate
                        ? "gateway.study.library_update_requested"
                        : "gateway.study.library_update_success",
                ),
                { variant: "success" },
            );
            return true;
        },
    });
}

export function bindAdminLibraryInteractions(
    root,
    { entries, i18n, render, schemas, signal },
) {
    let editorOpen = false;
    root.addEventListener(
        "keydown",
        (event) => {
            if (!event.target.matches(".library-admin-entry-row")) return;
            if (event.key !== "Enter" && event.key !== " ") return;
            event.preventDefault();
            event.target.click();
        },
        { signal },
    );
    root.addEventListener(
        "click",
        async (event) => {
            const button = event.target.closest("[data-library-admin-edit]");
            const row = event.target.closest(".library-admin-entry-row");
            if (
                (!button && !row) ||
                event.target.matches("[data-library-select-entry]") ||
                editorOpen
            )
                return;
            const readOnly = !button;
            const entry = entries.find(
                ({ id }) =>
                    id ===
                    (button?.dataset.libraryAdminEdit ??
                        row?.dataset.libraryEntry),
            );
            if (!entry) return;
            const schema = schemas.find(({ id }) => id === entry.schemaId);
            const layer = schema?.layers.find(({ id }) => id === entry.layer);
            const editor = editorBody(entry, schemas, entries, i18n);
            let formController;
            editorOpen = true;
            await openPopup({
                title: i18n
                    .t(
                        readOnly
                            ? "gateway.study.library_admin_view_title"
                            : "gateway.study.library_admin_edit_title",
                    )
                    .replace("{{ entry }}", entry.label),
                body: editor.html,
                maxWidth: "min(72rem, 96vw)",
                closeProtection: !readOnly,
                actions: readOnly
                    ? [
                          {
                              id: "close",
                              label: i18n.t("ui.reuse.close"),
                              variant: "neutral",
                          },
                      ]
                    : [
                          {
                              id: "save",
                              label: i18n.t("ui.reuse.save"),
                              variant: "confirm",
                          },
                          {
                              id: "cancel",
                              label: i18n.t("ui.reuse.cancel"),
                              variant: "cancel",
                          },
                      ],
                onOpen: (overlay) => {
                    const form = overlay.querySelector(
                        "[data-library-admin-editor]",
                    );
                    if (readOnly) {
                        form.querySelectorAll(
                            "input, select, textarea",
                        ).forEach((control) => {
                            control.disabled = true;
                        });
                        form.classList.add("library-admin-editor--read-only");
                        return;
                    }
                    formController = editor.builder.attach(form);
                    bindLibraryEditorControls(form, entry, i18n);
                },
                onAction: async (action, overlay) => {
                    if (readOnly) return true;
                    if (action !== "save") return true;
                    const form = overlay.querySelector(
                        "[data-library-admin-editor]",
                    );
                    if (
                        form.querySelector('[data-uploading="true"]') ||
                        !formController?.validateAll(true) ||
                        !form.checkValidity()
                    ) {
                        showToast(
                            i18n.t("gateway.study.library_validation_error"),
                            { variant: "error" },
                        );
                        form.reportValidity();
                        return false;
                    }
                    try {
                        const updated = await updateLibraryEntry(entry.id, {
                            schemaId: entry.schemaId,
                            schemaVersion: entry.schemaVersion,
                            layer: entry.layer,
                            label: form.elements.label.value,
                            class: form.elements.class.value || undefined,
                            hidden:
                                form.elements.hidden.value === "true" ||
                                form.elements.hidden.checked,
                            alwaysShowDefinition:
                                form.elements.alwaysShowDefinition.checked,
                            fields: readFields(form, layer, entry),
                            references: readReferences(form, layer),
                        });
                        Object.assign(entry, updated);
                        render();
                        showToast(
                            i18n.t("gateway.study.library_update_success"),
                            { variant: "success" },
                        );
                        return true;
                    } catch {
                        showToast(
                            i18n.t("gateway.study.library_update_error"),
                            { variant: "error" },
                        );
                        return false;
                    }
                },
            }).finally(() => {
                editorOpen = false;
            });
        },
        { signal },
    );
}
