import { escapeHtml } from "/static/reuse/escape-html.js";
import { openPopup } from "/static/reuse/popup.js";
import { showToast } from "/static/reuse/toast.js";
import { createFormBuilder } from "/static/reuse/form-builder.js";
import { uiCtx } from "/static/reuse/ui-ctx.js";
import { updateLibraryEntry } from "/static/gateways/study/ui/library-client.js";
import { localizedLabel } from "./presentation.js";

function inputForField(field, value, language, i18n) {
    const label = localizedLabel(field.metadata, language);
    const name = `field:${field.id}`;
    const control = field.input?.control;
    const options = field.input?.options ?? [];
    if (control === "audioFile") {
        const namespace = field.input?.file?.namespace ?? "";
        const prefix = field.input?.file?.prefix ?? `${language}/`;
        return `<label class="library-audio-field" data-library-audio-field data-namespace="${escapeHtml(namespace)}" data-prefix="${escapeHtml(prefix)}"><span>${escapeHtml(label)}</span><select name="${escapeHtml(name)}"${field.required ? " required" : ""}><option value="${escapeHtml(value ?? "")}" selected>${escapeHtml(value ?? "")}</option></select><input type="file" accept="audio/mpeg,audio/ogg,audio/wav,audio/webm,audio/mp4"></label>`;
    }
    if (control === "singleSelect" || control === "multiSelect")
        return `<label><span>${escapeHtml(label)}</span><select name="${escapeHtml(name)}"${control === "multiSelect" ? " multiple" : ""}${field.input?.immutable ? " disabled" : ""}${field.required ? " required" : ""}>${options.map((option) => `<option value="${escapeHtml(option.value)}"${(Array.isArray(value) ? value.includes(option.value) : value === option.value) ? " selected" : ""}>${escapeHtml(localizedLabel(option.metadata, language))}</option>`).join("")}</select></label>`;
    if (field.type === "boolean")
        return `<label class="library-admin-checkbox"><input name="${escapeHtml(name)}" type="checkbox"${value === true ? " checked" : ""}> <span>${escapeHtml(label)}</span></label>`;
    if (field.type === "localizedText") {
        const translations =
            value && typeof value === "object" && !Array.isArray(value)
                ? value
                : { en: "" };
        return `<fieldset class="library-admin-localized-field"><legend>${escapeHtml(label)}</legend>${Object.entries(
            translations,
        )
            .map(
                ([locale, text]) =>
                    `<label><span>${escapeHtml(locale)}</span><input name="${escapeHtml(`${name}:${locale}`)}" value="${escapeHtml(String(text))}"></label>`,
            )
            .join("")}</fieldset>`;
    }
    if (field.type === "stringList" || control === "tagList")
        return `<div class="library-tag-field" data-library-tag-field><span>${escapeHtml(label)}</span><div class="library-tag-list">${(Array.isArray(value) ? value : []).map((item) => `<button type="button" class="btn-neutral" data-library-tag="${escapeHtml(item)}">${escapeHtml(item)} ×</button>`).join("")}</div><input data-library-tag-input aria-label="${escapeHtml(label)}"><input name="${escapeHtml(name)}" type="hidden" value="${escapeHtml((Array.isArray(value) ? value : []).join("\u001f"))}"${field.required ? " required" : ""}></div>`;
    const inputType = ["number", "integer"].includes(field.type)
        ? "number"
        : "text";
    const step = field.type === "integer" ? "1" : "any";
    return `<label><span>${escapeHtml(label)}</span><input name="${escapeHtml(name)}" type="${inputType}"${inputType === "number" ? ` step="${step}"` : ""} value="${escapeHtml(value ?? "")}"${field.required ? " required" : ""}${field.input?.immutable ? " disabled" : ""}></label>`;
}

function relationshipEditor(relationship, entry, entries, language) {
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
    return `<label><span>${escapeHtml(label)}</span><select name="relationship:${escapeHtml(relationship.id)}" multiple size="${Math.min(6, Math.max(2, targets.length))}">${targets.map((target) => `<option value="${escapeHtml(target.id)}"${selected.has(target.id) ? " selected" : ""}>${escapeHtml(target.label)}</option>`).join("")}</select></label>`;
}

function editorBody(entry, schemas, entries, i18n) {
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
            relationshipEditor(relationship, entry, entries, schema.language),
        )
        .join("");
    const builder = createFormBuilder(
        { i18n, escapeHtml },
        {
            formId: "library-admin-editor",
            formClassName: "library-admin-editor",
            formAttributes: { "data-library-admin-editor": true },
            includeSubmitButton: false,
            submitLabelKey: "ui.reuse.save",
            fields: [
                {
                    name: "label",
                    label: i18n.t("gateway.study.library_admin_label"),
                    required: true,
                    value: entry.label,
                    maxCharacters: 500,
                },
            ],
            trustedContentHtml: `${fields}${relationships}<label class="library-admin-hidden"><input name="hidden" type="checkbox"${entry.hidden ? " checked" : ""}> <span>${escapeHtml(i18n.t("gateway.study.library_admin_hidden"))}</span></label>`,
        },
    );
    return { html: builder.render(), builder };
}

function readFields(form, layer, entry) {
    const immutableStringKeyField =
        layer?.semanticRole === "definition"
            ? layer.definitionLocalization?.stringKeyField
            : undefined;
    return Object.fromEntries(
        (layer?.fields ?? [])
            .filter((field) => field.id !== immutableStringKeyField)
            .map((field) => {
                if (field.input?.immutable === true)
                    return [field.id, entry.fields?.[field.id]];
                const name = `field:${field.id}`;
                if (field.type === "boolean")
                    return [field.id, form.elements[name]?.checked === true];
                if (field.type === "localizedText") {
                    const translations = {};
                    for (const control of form.elements) {
                        if (control.name?.startsWith(`${name}:`))
                            translations[control.name.slice(name.length + 1)] =
                                control.value;
                    }
                    return [field.id, translations];
                }
                const value = form.elements[name]?.value ?? "";
                if (
                    field.type === "stringList" ||
                    field.input?.control === "multiSelect"
                )
                    return [
                        field.id,
                        field.input?.control === "multiSelect"
                            ? Array.from(
                                  form.elements[name]?.selectedOptions ?? [],
                                  (option) => option.value,
                              )
                            : value.split("\u001f").filter(Boolean),
                    ];
                if (["number", "integer"].includes(field.type))
                    return [field.id, value === "" ? undefined : Number(value)];
                return [field.id, value];
            }),
    );
}

function readReferences(form, layer) {
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
                maxWidth: "min(46rem, 94vw)",
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
                              variant: "neutral",
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
                    form.querySelectorAll("select[multiple]").forEach(
                        (select) => {
                            select.addEventListener("mousedown", (event) => {
                                if (event.target.tagName !== "OPTION") return;
                                event.preventDefault();
                                event.target.selected = !event.target.selected;
                                select.dispatchEvent(
                                    new Event("change", { bubbles: true }),
                                );
                            });
                        },
                    );
                    form.querySelectorAll("[data-library-audio-field]").forEach(
                        async (field) => {
                            const client =
                                uiCtx.capabilities.get("files:uiClient");
                            const select = field.querySelector("select");
                            const picker =
                                field.querySelector('input[type="file"]');
                            if (!client) return;
                            try {
                                const files = await client.listNamespace(
                                    field.dataset.namespace,
                                    field.dataset.prefix,
                                );
                                const selected = select.value;
                                select.innerHTML = files
                                    .map(
                                        ({ key }) =>
                                            `<option value="file:${escapeHtml(key)}"${`file:${key}` === selected ? " selected" : ""}>${escapeHtml(key.slice(field.dataset.prefix.length))}</option>`,
                                    )
                                    .join("");
                            } catch {
                                showToast(
                                    i18n.t(
                                        "gateway.study.library_audio_list_error",
                                    ),
                                    { variant: "error" },
                                );
                            }
                            picker.addEventListener("change", async () => {
                                const file = picker.files?.[0];
                                if (!file) return;
                                const key = `${field.dataset.prefix}${crypto.randomUUID()}-${file.name.replace(/[^A-Za-z0-9._-]/g, "_")}`;
                                try {
                                    await client.uploadAudio(
                                        field.dataset.namespace,
                                        key,
                                        file,
                                    );
                                    select.insertAdjacentHTML(
                                        "beforeend",
                                        `<option value="file:${escapeHtml(key)}" selected>${escapeHtml(file.name)}</option>`,
                                    );
                                    showToast(
                                        i18n.t(
                                            "gateway.study.library_audio_upload_success",
                                        ),
                                        { variant: "success" },
                                    );
                                } catch {
                                    showToast(
                                        i18n.t(
                                            "gateway.study.library_audio_upload_error",
                                        ),
                                        { variant: "error" },
                                    );
                                }
                            });
                        },
                    );
                    form.querySelectorAll("[data-library-tag-field]").forEach(
                        (field) => {
                            const input = field.querySelector(
                                "[data-library-tag-input]",
                            );
                            const hidden = field.querySelector(
                                'input[type="hidden"]',
                            );
                            const list =
                                field.querySelector(".library-tag-list");
                            const values = () =>
                                Array.from(
                                    list.querySelectorAll("[data-library-tag]"),
                                    (tag) => tag.dataset.libraryTag,
                                );
                            list.addEventListener("click", (event) => {
                                const tag =
                                    event.target.closest("[data-library-tag]");
                                if (!tag) return;
                                tag.remove();
                                hidden.value = values().join("\u001f");
                            });
                            input.addEventListener("keydown", (event) => {
                                if (event.key !== "Enter") return;
                                event.preventDefault();
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
                        },
                    );
                },
                onAction: async (action, overlay) => {
                    if (readOnly) return true;
                    if (action !== "save") return true;
                    const form = overlay.querySelector(
                        "[data-library-admin-editor]",
                    );
                    if (
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
                            hidden: form.elements.hidden.checked,
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
