import { escapeHtml } from "/static/reuse/escape-html.js";
import { groupByToMap } from "/static/reuse/group-by.js";
import {
    localizedLabel,
    metadataFields,
    metadataValues,
} from "./presentation.js";

function filterDescriptors(layer, layerEntries, contentLanguage) {
    return metadataFields(layer).flatMap((field) => {
        const values = [
            ...new Set(
                layerEntries.flatMap((entry) =>
                    metadataValues(entry, layer)
                        .filter((item) => item.field.id === field.id)
                        .map(({ value }) => value),
                ),
            ),
        ].sort((left, right) => left.localeCompare(right));
        return values.length
            ? [
                  {
                      id: field.id,
                      label:
                          localizedLabel(field.metadata, contentLanguage) ||
                          field.id,
                      values,
                      detail: field.detail,
                  },
              ]
            : [];
    });
}

export function renderLayerFilters(layer, layerEntries, i18n, contentLanguage) {
    const filters = filterDescriptors(layer, layerEntries, contentLanguage);
    if (!filters.length) return "";
    const groups = groupByToMap(
        filters,
        (filter) =>
            (layer.fields ?? []).find(({ id }) => id === filter.id)?.detail
                ?.group ?? filter.id,
    );
    return `<div class="library-filters" aria-label="${escapeHtml(i18n.t("gateway.study.library_filters"))}">${Array.from(
        groups.entries(),
    )
        .map(([groupId, groupFilters]) => {
            const groupLabel = [
                ...new Set(groupFilters.map(({ label }) => label)),
            ].join(" / ");
            const exclusive = groupFilters.every(
                (filter) => filter.detail?.exclusive === true,
            );
            const required = groupFilters.every(
                (filter) => filter.detail?.required === true,
            );
            const defaultTag = groupFilters.find(
                (filter) => filter.detail?.defaultTag,
            )?.detail?.defaultTag;
            const tags = groupFilters.flatMap((filter) =>
                filter.values.map((value) => ({ filter, value })),
            );
            const selectedTag =
                tags.find(({ value }) => value === defaultTag) ??
                (required || tags.length === 1 ? tags[0] : undefined);
            return `<fieldset class="library-filter-group" data-library-filter-group="${escapeHtml(groupId)}" data-library-filter-exclusive="${exclusive}" data-library-filter-required="${required}"><legend>${escapeHtml(groupLabel)}</legend><div class="library-filter-pills">${tags
                .map((tag) => {
                    const { filter, value } = tag;
                    const selected = selectedTag === tag;
                    return `<button class="library-filter-pill btn-neutral${selected ? " active" : ""}" type="button" data-library-filter="${escapeHtml(filter.id)}" data-library-filter-value="${escapeHtml(value)}" aria-pressed="${selected}" title="${escapeHtml(`${filter.label}: ${value}`)}">${escapeHtml(value)}</button>`;
                })
                .join("")}</div></fieldset>`;
        })
        .join("")}</div>`;
}

export function applyLibraryFilters(filter) {
    const group = filter.closest("[data-library-filter-group]");
    const willActivate = !filter.classList.contains("active");
    if (
        !willActivate &&
        group?.dataset.libraryFilterRequired === "true" &&
        group.querySelectorAll("button[data-library-filter].active").length ===
            1
    ) {
        return;
    }
    if (willActivate && group?.dataset.libraryFilterExclusive === "true") {
        group
            .querySelectorAll("button[data-library-filter].active")
            .forEach((activeFilter) => {
                activeFilter.classList.remove("active");
                activeFilter.setAttribute("aria-pressed", "false");
            });
    }
    filter.classList.toggle("active", willActivate);
    filter.setAttribute("aria-pressed", String(willActivate));
    const panel = filter.closest("[data-library-panel]");
    refreshLibraryFilterResults(panel);
}

export function refreshLibraryFilterResults(panel) {
    if (!panel) return;
    const selectedFilters = Array.from(
        panel.querySelectorAll("button[data-library-filter].active"),
    );
    const selections = groupByToMap(
        selectedFilters,
        (item) => item.dataset.libraryFilter,
    );
    let visibleCount = 0;
    const filterableCards = panel.querySelectorAll(
        ".library-entry-card[data-library-filter-values]",
    );
    filterableCards.forEach((card) => {
        const values = JSON.parse(card.dataset.libraryFilterValues);
        const visible = Array.from(selections.entries()).every(
            ([fieldId, controls]) =>
                controls.some((control) =>
                    (Array.isArray(values[fieldId])
                        ? values[fieldId]
                        : []
                    ).includes(control.dataset.libraryFilterValue),
                ),
        );
        card.hidden = !visible;
        card.closest(".library-entry-card-shell").hidden = !visible;
        if (visible) visibleCount += 1;
    });
    panel.querySelector(".library-filter-empty").hidden =
        filterableCards.length === 0 || visibleCount > 0;
}
