import { escapeHtml } from "/static/reuse/escape-html.js";
import { localizedLabel } from "./presentation.js";

export function adminLayerGroups(schemas) {
    return schemas.map((schema) => ({
        id: schema.id,
        label: localizedLabel(schema.metadata, schema.language) || schema.id,
        items: schema.layers.map((layer) => ({
            id: `${schema.id}:${layer.id}`,
            label: localizedLabel(layer.metadata, schema.language) || layer.id,
        })),
    }));
}

export function renderAdminBrowser(schemas, entries, i18n, selectedLayer) {
    if (!schemas.length)
        return `<p>${escapeHtml(i18n.t("gateway.study.library_empty"))}</p>`;
    const schema = schemas.find(({ id }) => id === selectedLayer?.schemaId);
    const layer = schema?.layers.find(
        ({ id }) => id === selectedLayer?.layerId,
    );
    if (!schema || !layer)
        return `<p>${escapeHtml(i18n.t("gateway.study.library_layer_empty"))}</p>`;
    const label = localizedLabel(layer.metadata, schema.language) || layer.id;
    const layerEntries = entries.filter(
        (entry) =>
            entry.schemaId === schema.id &&
            entry.layer === selectedLayer.layerId,
    );
    const rows = layerEntries
        .map(
            (
                entry,
            ) => `<li class="library-admin-entry-row" role="button" tabindex="0" data-library-entry="${escapeHtml(entry.id)}">
                <input class="library-entry-selection" type="checkbox" data-library-select-entry="${escapeHtml(entry.id)}" aria-label="${escapeHtml(entry.label)}">
                <span class="library-admin-entry-detail">${escapeHtml(entry.label)}</span>
                <button class="library-admin-edit btn-neutral" type="button" data-library-admin-edit="${escapeHtml(entry.id)}" aria-label="${escapeHtml(i18n.t("gateway.study.library_admin_edit").replace("{{ entry }}", entry.label))}"></button>
            </li>`,
        )
        .join("");
    return `<section class="library-admin-schema" data-library-panel="${escapeHtml(layer.id)}"><header><h2>${escapeHtml(label)}</h2><span class="library-admin-layer-count">${layerEntries.length}</span></header><ul class="library-admin-entry-list">${rows || `<li>${escapeHtml(i18n.t("gateway.study.library_layer_empty"))}</li>`}</ul></section>`;
}
