import { escapeHtml } from "/static/reuse/escape-html.js";
import { isMeaningLayer, localizedLabel } from "./presentation.js";

export function renderAdminBrowser(schemas, entries, i18n) {
    if (!schemas.length)
        return `<p>${escapeHtml(i18n.t("gateway.study.library_empty"))}</p>`;
    return schemas
        .map((schema) => {
            const schemaLabel =
                localizedLabel(schema.metadata, schema.language) || schema.id;
            const layers = schema.layers
                .filter(
                    (layer) =>
                        !isMeaningLayer(layer) &&
                        layer.semanticRole !== "particle",
                )
                .map((layer) => {
                    const count = entries.filter(
                        (entry) =>
                            entry.schemaId === schema.id &&
                            entry.layer === layer.id,
                    ).length;
                    const label =
                        localizedLabel(layer.metadata, schema.language) ||
                        layer.id;
                    const url = `/study/library/${encodeURIComponent(schema.id)}/${encodeURIComponent(layer.id)}`;
                    return `<li class="library-admin-layer"><a class="btn-neutral" href="${escapeHtml(url)}"><span>${escapeHtml(label)}</span><span class="library-admin-layer-count">${count}</span></a></li>`;
                })
                .join("");
            return `<section class="library-admin-schema"><h2>${escapeHtml(schemaLabel)}</h2><ul class="library-admin-layer-list">${layers}</ul></section>`;
        })
        .join("");
}
