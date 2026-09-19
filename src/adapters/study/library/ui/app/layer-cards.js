import { escapeHtml } from "/static/reuse/escape-html.js";
import {
    isMeaningLayer,
    layerForEntry,
    localizedLabel,
} from "./presentation.js";
import { renderLayerFilters } from "./filters.js";
import { isDirectlyVisible, renderEntryCard } from "./cards.js";
import { assignVariantPlacements } from "./variant-placement.js";

function meaningReferenceIds(entry, schema) {
    const meaningLayers = new Set(
        schema.layers
            .filter((candidate) => isMeaningLayer(candidate))
            .map((candidate) => candidate.id),
    );
    const sourceLayer = layerForEntry([schema], entry);
    const meaningRelations = new Set(
        (sourceLayer?.relationships ?? [])
            .filter((relationship) =>
                meaningLayers.has(relationship.targetLayer),
            )
            .map((relationship) => relationship.id),
    );
    return Array.from(
        new Set(
            (entry.references ?? [])
                .filter((reference) => meaningRelations.has(reference.relation))
                .map((reference) => reference.entryId),
        ),
    ).sort();
}

function deduplicateDisplayEntries(entries, schema) {
    const displayed = new Map();
    for (const entry of entries) {
        const meaningIds = meaningReferenceIds(entry, schema);
        // A shared definition is not enough to merge genuine synonyms. Treat
        // records as the same display item only when both their visible label
        // and their complete, order-independent set of meanings agree.
        const normalizedLabel = entry.label
            .trim()
            .normalize()
            .toLocaleLowerCase();
        const key = meaningIds.length
            ? `${normalizedLabel}\u0000${meaningIds.join("\u0000")}`
            : `entry:${entry.id}`;
        if (!displayed.has(key)) displayed.set(key, entry);
    }
    return Array.from(displayed.values());
}

export function renderLayerCards(
    layer,
    entries,
    schema,
    i18n,
    allEntries = entries,
) {
    const placements = assignVariantPlacements(entries, schema, layer);
    const baseEntries = deduplicateDisplayEntries(
        entries.filter(
            (entry) =>
                !placements.has(entry.id) &&
                isDirectlyVisible(entry, entries, placements),
        ),
        schema,
    );
    if (!baseEntries.length) return "";
    if (!layer.grid) {
        return baseEntries
            .map((entry) =>
                renderEntryCard(
                    entry,
                    layer,
                    allEntries,
                    schema,
                    placements,
                    i18n,
                ),
            )
            .join("");
    }

    const entriesByGridId = new Map(
        baseEntries.flatMap((entry) => [
            [entry.sourceRecordId, entry],
            [entry.displayId, entry],
        ]),
    );
    const positionedIds = new Set(
        layer.grid.items.filter(
            (itemId) => itemId !== null && typeof itemId !== "object",
        ),
    );
    const positionedCards = layer.grid.items
        .map((itemId) => {
            if (itemId === null || typeof itemId === "object") {
                return '<div class="library-entry-card-blank" data-library-grid-blank aria-hidden="true">—</div>';
            }
            const entry = entriesByGridId.get(itemId);
            return entry
                ? renderEntryCard(
                      entry,
                      layer,
                      allEntries,
                      schema,
                      placements,
                      i18n,
                  )
                : "";
        })
        .join("");
    const additionalCards = baseEntries
        .filter(
            (entry) =>
                !positionedIds.has(entry.sourceRecordId) &&
                !positionedIds.has(entry.displayId),
        )
        .map((entry) =>
            renderEntryCard(entry, layer, allEntries, schema, placements, i18n),
        )
        .join("");
    return positionedCards + additionalCards;
}

// TODO(character, alt-character, words, and sentences pages): Move each learner-facing layout and its styles into a dedicated adapter, faithfully reuse the current presentation there, and replace each surface with a sleek data-first relationship editor for administrators. TODO(library administration): Reduce the remaining Library UI to a standard data-first editor for creating, modifying, and deleting cards and freely editing cross-layer relationships; persist administrator overrides so provider restarts and content updates cannot clobber them.
export function renderBrowser(schemas, entries, i18n, requestedLayer = null) {
    if (!schemas.length)
        return `<p>${escapeHtml(i18n.t("gateway.study.library_empty"))}</p>`;
    return schemas
        .map((schema, schemaIndex) => {
            const schemaLabel =
                localizedLabel(schema.metadata, schema.language) || schema.id;
            const visibleLayers = schema.layers.filter(
                (layer) =>
                    !isMeaningLayer(layer) &&
                    layer.semanticRole !== "particle" &&
                    (!requestedLayer ||
                        (schema.id === requestedLayer.schemaId &&
                            layer.id === requestedLayer.layerId)),
            );
            const tabs = visibleLayers
                .map((layer, layerIndex) => {
                    const layerLabel =
                        localizedLabel(layer.metadata, schema.language) ||
                        layer.id;
                    return `<button class="library-layer-tab btn-neutral${layerIndex === 0 ? " active" : ""}" type="button" role="tab" id="library-tab-${schemaIndex}-${layerIndex}" aria-selected="${layerIndex === 0}" aria-controls="library-panel-${schemaIndex}-${layerIndex}" data-library-tab="${escapeHtml(layer.id)}">${escapeHtml(layerLabel)}</button>`;
                })
                .join("");
            const panels = visibleLayers
                .map((layer, layerIndex) => {
                    const layerEntries = entries.filter(
                        (entry) =>
                            entry.schemaId === schema.id &&
                            entry.layer === layer.id,
                    );
                    const cards = renderLayerCards(
                        layer,
                        layerEntries,
                        schema,
                        i18n,
                        entries,
                    );
                    const contents = cards
                        ? cards
                        : `<p class="library-layer-empty">${escapeHtml(i18n.t("gateway.study.library_layer_empty"))}</p>`;
                    const rowSize = layer.grid?.rowSize;
                    return `<section class="library-layer-panel" role="tabpanel" id="library-panel-${schemaIndex}-${layerIndex}" aria-labelledby="library-tab-${schemaIndex}-${layerIndex}" data-library-panel="${escapeHtml(layer.id)}"${layerIndex === 0 ? "" : " hidden"}>${renderLayerFilters(layer, layerEntries, i18n, schema.language)}<div class="library-entry-grid${layer.minimal ? " library-entry-grid--minimal" : ""}"${rowSize ? ` style="--library-grid-row-size: ${rowSize}"` : ""}>${contents}</div><p class="library-filter-empty" hidden>${escapeHtml(i18n.t("gateway.study.library_filter_empty"))}</p></section>`;
                })
                .join("");
            if (!visibleLayers.length) return "";
            return `<section class="library-schema${requestedLayer ? " library-schema--layer-page" : ""}" data-library-schema-id="${escapeHtml(schema.id)}"><h2>${escapeHtml(requestedLayer ? localizedLabel(visibleLayers[0].metadata, schema.language) || visibleLayers[0].id : schemaLabel)}</h2>${requestedLayer ? "" : `<div class="library-layer-tabs" role="tablist" aria-label="${escapeHtml(i18n.t("gateway.study.library_layers"))}">${tabs}</div>`}${panels}</section>`;
        })
        .join("");
}

export function activateLibraryLayer(schema, layerId) {
    schema.querySelectorAll("[data-library-tab]").forEach((item) => {
        const active = item.dataset.libraryTab === layerId;
        item.classList.toggle("active", active);
        item.setAttribute("aria-selected", String(active));
    });
    schema.querySelectorAll("[data-library-panel]").forEach((panel) => {
        panel.hidden = panel.dataset.libraryPanel !== layerId;
    });
}
