import { escapeHtml } from "/static/reuse/escape-html.js";
import { openPopup } from "/static/reuse/popup.js";
import { showToast } from "/static/reuse/toast.js";
import { updateLibraryEntry } from "/static/gateways/study/ui/library-client.js";
import { localizedLabel } from "./presentation.js";

function inputForField(field, value, language, i18n) {
    const label = localizedLabel(field.metadata, language) || field.id;
    const name = `field:${field.id}`;
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
    if (field.type === "stringList")
        return `<label><span>${escapeHtml(label)}</span><textarea name="${escapeHtml(name)}" rows="4" placeholder="${escapeHtml(i18n.t("gateway.study.library_admin_list_placeholder"))}">${escapeHtml((Array.isArray(value) ? value : []).join("\n"))}</textarea></label>`;
    const inputType = ["number", "integer"].includes(field.type)
        ? "number"
        : "text";
    const step = field.type === "integer" ? "1" : "any";
    return `<label><span>${escapeHtml(label)}</span><input name="${escapeHtml(name)}" type="${inputType}"${inputType === "number" ? ` step="${step}"` : ""} value="${escapeHtml(value ?? "")}"${field.required ? " required" : ""}></label>`;
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
    const fields = (layer?.fields ?? [])
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
    return `<form class="library-admin-editor" data-library-admin-editor>
        <label><span>${escapeHtml(i18n.t("gateway.study.library_admin_label"))}</span><input name="label" value="${escapeHtml(entry.label)}" required maxlength="500"></label>
        ${fields}
        ${relationships}
        <label class="library-admin-hidden"><input name="hidden" type="checkbox"${entry.hidden ? " checked" : ""}> <span>${escapeHtml(i18n.t("gateway.study.library_admin_hidden"))}</span></label>
    </form>`;
}

function readFields(form, layer) {
    return Object.fromEntries(
        (layer?.fields ?? []).map((field) => {
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
            if (field.type === "stringList")
                return [
                    field.id,
                    value
                        .split("\n")
                        .map((item) => item.trim())
                        .filter(Boolean),
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
        "click",
        async (event) => {
            const button = event.target.closest("[data-library-admin-edit]");
            if (!button || editorOpen) return;
            const entry = entries.find(
                ({ id }) => id === button.dataset.libraryAdminEdit,
            );
            if (!entry) return;
            const schema = schemas.find(({ id }) => id === entry.schemaId);
            const layer = schema?.layers.find(({ id }) => id === entry.layer);
            editorOpen = true;
            await openPopup({
                title: i18n
                    .t("gateway.study.library_admin_edit_title")
                    .replace("{{ entry }}", entry.label),
                body: editorBody(entry, schemas, entries, i18n),
                maxWidth: "min(46rem, 94vw)",
                closeProtection: true,
                actions: [
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
                onAction: async (action, overlay) => {
                    if (action !== "save") return true;
                    const form = overlay.querySelector(
                        "[data-library-admin-editor]",
                    );
                    try {
                        const updated = await updateLibraryEntry(entry.id, {
                            schemaId: entry.schemaId,
                            schemaVersion: entry.schemaVersion,
                            layer: entry.layer,
                            label: form.elements.label.value,
                            hidden: form.elements.hidden.checked,
                            fields: readFields(form, layer),
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
