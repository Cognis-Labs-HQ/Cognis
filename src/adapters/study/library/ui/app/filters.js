import { filterItems } from "/static/reuse/collection-view.js";
import { renderBrowseControls } from "/static/gateways/study/reuse/favourites.js";
import { escapeHtml } from "/static/reuse/escape-html.js";
import { groupByToMap } from "/static/reuse/group-by.js";
import { fieldValues, filterFields, localizedLabel } from "./presentation.js";

function filterDescriptors(layer, layerEntries, contentLanguage, i18n) {
    layerEntries = layerEntries.filter((entry) => !entry.hidden);
    const fieldFilters = filterFields(layer).flatMap((field) => {
        const order = new Map(
            (field.input?.options ?? []).map(({ value }, index) => [
                value,
                index,
            ]),
        );
        const values = [
            ...new Set(
                layerEntries.flatMap((entry) =>
                    fieldValues(entry, [field])
                        .filter((item) => item.field.id === field.id)
                        .map(({ value }) => value),
                ),
            ),
        ].sort(
            (left, right) =>
                (order.get(left) ?? Infinity) -
                    (order.get(right) ?? Infinity) || left.localeCompare(right),
        );
        return values.length
            ? [
                  {
                      id: field.id,
                      label:
                          localizedLabel(field.metadata, contentLanguage) ||
                          field.id,
                      values,
                      detail: field.detail,
                      options: field.input?.options,
                  },
              ]
            : [];
    });
    const tags = (layer.detail?.tags ?? []).filter(
        ({ value, filterable }) =>
            filterable &&
            layerEntries.some((entry) => entry.tags?.includes(value)),
    );
    return tags.length
        ? [
              ...fieldFilters,
              {
                  id: "__tags",
                  label: i18n.t("gateway.study.library_tags"),
                  values: tags.map(({ value }) => value),
                  options: tags,
                  detail: { exclusive: false, autoSelectSingle: false },
              },
          ]
        : fieldFilters;
}

export function renderLayerFilters(layer, layerEntries, i18n, contentLanguage) {
    const filters = filterDescriptors(
        layer,
        layerEntries,
        contentLanguage,
        i18n,
    );
    const groups = groupByToMap(
        filters,
        (filter) =>
            (layer.fields ?? []).find(({ id }) => id === filter.id)?.detail
                ?.group ?? filter.id,
    );
    return `<div class="library-filters study-browse-filters" aria-label="${escapeHtml(i18n.t("gateway.study.library_filters"))}">${Array.from(
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
            const autoSelectSingle = groupFilters.every(
                (filter) => filter.detail?.autoSelectSingle !== false,
            );
            const selectedTag =
                tags.find(({ value }) => value === defaultTag) ??
                (required ||
                (autoSelectSingle && tags.length === 1 && groupId !== "__tags")
                    ? tags[0]
                    : undefined);
            return `<fieldset class="library-filter-group" data-library-filter-group="${escapeHtml(groupId)}" data-library-filter-exclusive="${exclusive}" data-library-filter-required="${required}"><legend>${escapeHtml(groupLabel)}</legend><div class="library-filter-pills">${tags
                .map((tag) => {
                    const { filter, value } = tag;
                    const selected = selectedTag === tag;
                    const option = filter.options?.find(
                        (option) => option.value === value,
                    );
                    const label = option
                        ? localizedLabel(option.metadata, contentLanguage)
                        : value;
                    return `<button class="library-filter-pill btn-neutral${selected ? " active" : ""}" type="button" data-library-filter="${escapeHtml(filter.id)}" data-library-filter-value="${escapeHtml(value)}" aria-pressed="${selected}" title="${escapeHtml(`${filter.label}: ${label}`)}">${escapeHtml(label)}</button>`;
                })
                .join("")}</div></fieldset>`;
        })
        .join("")}${renderBrowseControls(i18n)}</div>`;
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
    const query = panel.querySelector("[data-study-query]")?.value ?? "";
    let visibleCount = 0;
    const filterableCards = panel.querySelectorAll(
        ".library-entry-card[data-library-filter-values]",
    );
    const visibleCards = new Set(
        filterItems(filterableCards, {
            query,
            text: (card) => card.textContent,
            predicates: [
                (card) => card.dataset.studyFavouriteHidden !== "true",
                (card) => {
                    const values = JSON.parse(card.dataset.libraryFilterValues);
                    return Array.from(selections.entries()).every(
                        ([fieldId, controls]) =>
                            controls.some((control) =>
                                (Array.isArray(values[fieldId])
                                    ? values[fieldId]
                                    : []
                                ).includes(control.dataset.libraryFilterValue),
                            ),
                    );
                },
            ],
        }),
    );
    filterableCards.forEach((card) => {
        const visible = visibleCards.has(card);
        card.hidden = !visible;
        card.closest(".library-entry-card-shell").hidden = !visible;
        if (visible) visibleCount += 1;
    });
    panel.querySelector(".library-filter-empty").hidden =
        filterableCards.length === 0 || visibleCount > 0;
}
