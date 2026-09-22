import { escapeHtml } from "/static/reuse/escape-html.js";
import {
    entryAttributes,
    entrySearchAttribute,
    definitionText,
    isMeaningLayer,
    layerForEntry,
    metadataFields,
    metadataValues,
    pronunciationValues,
    renderMetadataPills,
    renderScope,
} from "./presentation.js";
import { isSameLibraryRecord } from "./variant-placement.js";
import { canDeleteEntry } from "./selection.js";

export function isDirectlyVisible(entry, entries, placements) {
    const entriesById = new Map(
        entries.map((candidate) => [candidate.id, candidate]),
    );
    const visited = new Set();
    let current = entry;
    while (current) {
        if (current.hidden === true || visited.has(current.id)) return false;
        visited.add(current.id);
        const parentId = placements.get(current.id)?.parentId;
        current = parentId ? entriesById.get(parentId) : null;
    }
    return true;
}

function renderSelection(entry, i18n) {
    if (!canDeleteEntry(entry)) return "";
    const label = i18n
        .t("gateway.study.library_select_entry")
        .replace("{{ entry }}", entry.label);
    return `<input class="library-entry-selection" type="checkbox" data-library-select-entry="${escapeHtml(entry.id)}" aria-label="${escapeHtml(label)}">`;
}

function renderCardContents(entry, layer, entries, schema, i18n) {
    const pronunciations = pronunciationValues(entry).filter(
        (pronunciation) => pronunciation !== entry.label,
    );
    const referencedEntries = new Map(
        entries.map((candidate) => [candidate.id, candidate]),
    );
    const definitions = (entry.references ?? [])
        .map((reference) => referencedEntries.get(reference.entryId))
        .filter(
            (candidate) =>
                candidate && isMeaningLayer(layerForEntry([schema], candidate)),
        )
        .map((candidate) =>
            definitionText(
                candidate,
                layerForEntry([schema], candidate),
                entry.language,
            ),
        )
        .filter(Boolean);
    const pronunciationPreview = pronunciations.length
        ? `<span class="library-card-pronunciation">${escapeHtml(pronunciations.join(" · "))}</span>`
        : "";
    if (layer.minimal) {
        return `<span class="library-entry-minimal-content"><strong>${escapeHtml(entry.label)}</strong>${pronunciationPreview}</span>`;
    }
    const definitionPreview = definitions.length
        ? `<span class="library-card-definition">${escapeHtml(definitions.join(" · "))}</span>`
        : "";
    return `<strong>${escapeHtml(entry.label)}</strong>${pronunciationPreview}${definitionPreview}<span class="library-entry-indicators">${renderMetadataPills(entry, layer)}${renderScope(entry, i18n)}</span>`;
}

export function renderEntryCard(
    entry,
    layer,
    entries,
    schema,
    placements,
    i18n,
    depth = 0,
    variant = false,
) {
    const filterValues = Object.fromEntries(
        metadataFields(layer).map((field) => [
            field.id,
            metadataValues(entry, layer)
                .filter((item) => item.field.id === field.id)
                .map(({ value }) => value),
        ]),
    );
    const variants = entries.flatMap((candidate) => {
        const placement = placements.get(candidate.id);
        return placement?.parentId === entry.id &&
            !isSameLibraryRecord(candidate, entry) &&
            placement.depth <= 4 &&
            isDirectlyVisible(candidate, entries, placements)
            ? [{ entry: candidate, direction: placement.direction }]
            : [];
    });
    const variantHint = variants.length
        ? `<span class="library-entry-variant-hint" role="tooltip">${escapeHtml(i18n.t("gateway.study.library_variant_hint"))}</span>`
        : "";
    const filterAttribute = variant
        ? ""
        : ` data-library-filter-values="${escapeHtml(JSON.stringify(filterValues))}"`;
    return `<div class="library-entry-card-shell" data-library-variant-depth="${depth}"><button class="library-entry-card${variant ? " library-entry-variant" : ""} btn-neutral" type="button" ${entryAttributes(entry)} ${entrySearchAttribute(entry)}${filterAttribute}>${renderCardContents(entry, layer, entries, schema, i18n)}</button>${renderSelection(entry, i18n)}${variantHint}${variants
        .map(
            ({ entry: child, direction }) =>
                `<div class="library-entry-variant-shell library-entry-variant-${direction}">${renderEntryCard(child, layer, entries, schema, placements, i18n, depth + 1, true)}</div>`,
        )
        .join("")}</div>`;
}
