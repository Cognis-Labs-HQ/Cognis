import { escapeHtml } from "/static/reuse/escape-html.js";
import { isMeaningLayer, localizedLabel } from "./presentation.js";

function renderEntryEditor(entry, i18n) {
    return `<form class="library-admin-entry" data-library-admin-entry="${escapeHtml(entry.id)}">
        <input class="library-entry-selection" type="checkbox" data-library-select-entry="${escapeHtml(entry.id)}" aria-label="${escapeHtml(entry.label)}">
        <label><span>${escapeHtml(i18n.t("gateway.study.library_admin_label"))}</span><input name="label" value="${escapeHtml(entry.label)}" required maxlength="500"></label>
        <label><span>${escapeHtml(i18n.t("gateway.study.library_admin_fields"))}</span><textarea name="fields" rows="3">${escapeHtml(JSON.stringify(entry.fields ?? {}, null, 2))}</textarea></label>
        <label><span>${escapeHtml(i18n.t("gateway.study.library_admin_references"))}</span><textarea name="references" rows="3">${escapeHtml(JSON.stringify(entry.references ?? [], null, 2))}</textarea></label>
        <label class="library-admin-hidden"><input name="hidden" type="checkbox"${entry.hidden ? " checked" : ""}> <span>${escapeHtml(i18n.t("gateway.study.library_admin_hidden"))}</span></label>
        <button class="btn-confirm" type="submit">${escapeHtml(i18n.t("ui.reuse.save"))}</button>
    </form>`;
}

export function renderAdminBrowser(schemas, entries, i18n) {
    if (!schemas.length)
        return `<p>${escapeHtml(i18n.t("gateway.study.library_empty"))}</p>`;
    return schemas
        .map((schema) => {
            const schemaLabel =
                localizedLabel(schema.metadata, schema.language) || schema.id;
            const layers = schema.layers
                .map((layer) => {
                    const layerEntries = entries.filter(
                        (entry) =>
                            entry.schemaId === schema.id &&
                            entry.layer === layer.id,
                    );
                    const label =
                        localizedLabel(layer.metadata, schema.language) ||
                        layer.id;
                    return `<details class="library-admin-layer" data-library-panel="${escapeHtml(layer.id)}"${!isMeaningLayer(layer) ? " open" : ""}><summary><span>${escapeHtml(label)}</span><span class="library-admin-layer-count">${layerEntries.length}</span></summary><div class="library-admin-entry-list">${layerEntries.map((entry) => renderEntryEditor(entry, i18n)).join("") || `<p>${escapeHtml(i18n.t("gateway.study.library_layer_empty"))}</p>`}</div></details>`;
                })
                .join("");
            return `<section class="library-admin-schema"><h2>${escapeHtml(schemaLabel)}</h2>${layers}</section>`;
        })
        .join("");
}
