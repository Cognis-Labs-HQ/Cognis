import { escapeHtml } from "/static/reuse/escape-html.js";
import {
    entryAttributes,
    entrySearchAttribute,
    fieldValues,
    filterFields,
    pronunciationValues,
    definitionText,
    isMeaningLayer,
    layerForEntry,
    renderScope,
} from "./presentation.js";
import { isSameLibraryRecord } from "./variant-placement.js";

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
    const label = i18n
        .t("gateway.study.library_select_entry")
        .replace("{{ entry }}", entry.label);
    return `<input class="library-entry-selection" type="checkbox" data-library-select-entry="${escapeHtml(entry.id)}" aria-label="${escapeHtml(label)}">`;
}

function renderCardContents(entry, layer, _entries, _schema, i18n) {
    const pronunciations =
        layer.semanticRole === "orderedLexicalSequence"
            ? []
            : pronunciationValues(entry).filter(
                  (pronunciation) => pronunciation !== entry.label,
              );
    const pronunciationPreview = pronunciations.length
        ? `<span class="library-card-pronunciation">${escapeHtml(pronunciations.join(" · "))}</span>`
        : "";
    if (layer.minimal) {
        return `<span class="library-entry-minimal-content"><strong>${escapeHtml(entry.label)}</strong>${pronunciationPreview}</span>`;
    }
    const showDefinition =
        entry.alwaysShowDefinition ||
        layer.semanticRole !== "atomicWritingUnit";
    const definition = showDefinition
        ? _entries
              .filter((candidate) =>
                  (entry.references ?? []).some(
                      ({ entryId }) => entryId === candidate.id,
                  ),
              )
              .filter((candidate) =>
                  isMeaningLayer(layerForEntry([_schema], candidate)),
              )
              .map((candidate) =>
                  definitionText(
                      candidate,
                      layerForEntry([_schema], candidate),
                      document.documentElement.lang,
                  ),
              )
              .find(Boolean)
        : "";
    return `<span class="library-card-primary"><span class="library-card-reading"><strong>${escapeHtml(entry.label)}</strong>${pronunciationPreview}</span>${definition ? `<span class="library-card-definition">${escapeHtml(definition)}</span>` : ""}</span>`;
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
        filterFields(layer).map((field) => [
            field.id,
            fieldValues(entry, [field])
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
            ? [
                  {
                      entry: candidate,
                      direction: placement.direction,
                      distance: placement.distance ?? 1,
                  },
              ]
            : [];
    });
    const variantHint = variants.length
        ? `<span class="library-entry-variant-hint" role="tooltip">${escapeHtml(i18n.t("gateway.study.library_variant_hint"))}</span>`
        : "";
    const filterAttribute = variant
        ? ""
        : ` data-library-filter-values="${escapeHtml(JSON.stringify(filterValues))}"`;
    const newPill = entry.isNew
        ? `<span class="library-new-pill">${escapeHtml(i18n.t("gateway.study.library_new"))}</span>`
        : "";
    const roleClass = layer.semanticRole
        ? ` library-entry-card--${escapeHtml(layer.semanticRole)}`
        : "";
    return `<div class="library-entry-card-shell" data-library-variant-depth="${depth}"><span class="library-entry-card-status" data-library-entry-status="${escapeHtml(entry.id)}">${renderScope(entry, i18n)}${newPill}</span><button class="library-entry-card${roleClass}${variant ? " library-entry-variant" : ""} btn-neutral" type="button" ${entryAttributes(entry)} ${entrySearchAttribute(entry)}${filterAttribute}>${renderCardContents(entry, layer, entries, schema, i18n)}</button>${renderSelection(entry, i18n)}${variantHint}${variants
        .map(
            ({ entry: child, direction, distance }) =>
                `<div class="library-entry-variant-shell library-entry-variant-${direction}" data-library-preferred-direction="${direction}" style="--library-variant-card-span: ${distance * 100}%; --library-variant-gap-span: ${distance * 0.75}rem">${renderEntryCard(child, layer, entries, schema, placements, i18n, depth + 1, true)}</div>`,
        )
        .join("")}</div>`;
}
