import { createI18n, applyDocumentTitle } from "/static/reuse/i18n.js";
import { createPageComposer } from "/static/reuse/page-composer/index.js";
import { mountWhenDirect } from "/static/reuse/page-entry.js";
import { escapeHtml } from "/static/reuse/escape-html.js";
import { openPopup } from "/static/reuse/popup.js";
import { showToast } from "/static/reuse/toast.js";
import { groupByToMap } from "/static/reuse/group-by.js";
import { highlightSearchTarget } from "/static/reuse/search-util/indexing.js";
import {
    bindStudySubNavigation,
    loadStudySubNavigationModel,
    readSelectedStudyLanguageCode,
    renderStudySubNavigation,
} from "/static/gateways/study/ui/sub-navigation.js";
import {
    deleteLibraryEntries,
    fetchLibraryEntries,
    fetchLibraryEntry,
    fetchLibrarySchemas,
} from "/static/gateways/study/ui/library-client.js";
import {
    buildLibraryUrl,
    isAdminScope,
} from "/static/gateways/study/ui/language.js";

const LONG_PRESS_DURATION_MS = 550;
const LONG_PRESS_MOVE_TOLERANCE_PX = 8;

import {
    definitionText,
    detailTitlePronunciation,
    entryAttributes,
    entrySearchAttribute,
    headingCompositionReference,
    isMeaningLayer,
    isWritingUnitLayer,
    layerForEntry,
    loadLibraryAudio,
    localizedLabel,
    metadataFields,
    metadataValues,
    pronunciationValues,
    relationSection,
    renderMetadataPills,
    renderScope,
} from "./presentation.js";

import { composeDetail } from "./detail.js";

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

function renderLayerFilters(layer, layerEntries, i18n, contentLanguage) {
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

function variantPlacement(entry, schema) {
    const schemas = Array.isArray(schema) ? schema : [schema];
    for (const reference of entry.references ?? []) {
        const relationship = schemas
            .find((candidate) => candidate?.id === entry.schemaId)
            ?.layers.find((layer) => layer.id === entry.layer)
            ?.relationships?.find(
                (candidate) => candidate.id === reference.relation,
            );
        if (relationship?.variant === true) {
            return {
                parentId: reference.entryId,
            };
        }
    }
    return null;
}

function assignVariantPlacements(entries, schema, layer) {
    const placements = new Map();
    const occupiedByParent = new Map();
    const requests = entries.flatMap((entry) => {
        const placement = variantPlacement(entry, schema);
        return placement ? [{ entry, ...placement }] : [];
    });
    const gridPosition = new Map(
        (layer?.grid?.items ?? []).flatMap((item, index) => {
            if (item === null || typeof item === "object") return [];
            const entry = entries.find(
                (candidate) =>
                    candidate.sourceRecordId === item ||
                    candidate.displayId === item,
            );
            return entry ? [[entry.id, index]] : [];
        }),
    );
    const requestsByEntryId = new Map(
        requests.map((request) => [request.entry.id, request]),
    );
    const depthFor = (request, trail = new Set()) => {
        if (trail.has(request.entry.id)) return Number.POSITIVE_INFINITY;
        const parentRequest = requestsByEntryId.get(request.parentId);
        if (!parentRequest) return 1;
        return (
            depthFor(parentRequest, new Set(trail).add(request.entry.id)) + 1
        );
    };
    const orderedRequests = requests
        .map((request) => ({ ...request, depth: depthFor(request) }))
        .sort((left, right) => left.depth - right.depth);
    for (const request of orderedRequests) {
        const { depth } = request;
        const parentPlacement = placements.get(request.parentId);
        const index = gridPosition.get(request.parentId);
        const rowSize = layer?.grid?.rowSize;
        const occupied = occupiedByParent.get(request.parentId) ?? new Set();
        const preferred = [
            parentPlacement?.direction,
            "left",
            "up",
            "right",
        ].filter(Boolean);
        const direction = preferred.find((candidate) => {
            if (occupied.has(candidate)) return false;
            if (!Number.isInteger(index) || !rowSize) return true;
            if (candidate === "left" && index % rowSize === 0) return false;
            if (candidate === "right" && (index + 1) % rowSize === 0)
                return false;
            return true;
        });
        if (!direction || !Number.isFinite(depth)) continue;
        occupied.add(direction);
        occupiedByParent.set(request.parentId, occupied);
        placements.set(request.entry.id, {
            ...request,
            direction,
            depth,
        });
    }
    return placements;
}

function canDeleteEntry(entry) {
    return (
        isAdminScope() ||
        entry.createdBy === localStorage.getItem("cognis_account")
    );
}

function closeUnrelatedVariantViews(root, control) {
    root.querySelectorAll(".library-entry-variants-open").forEach((shell) => {
        if (!shell.contains(control)) {
            shell.classList.remove("library-entry-variants-open");
        }
    });
}

function renderSelection(entry, i18n) {
    if (!canDeleteEntry(entry)) return "";
    const label = i18n
        .t("gateway.study.library_select_entry")
        .replace("{{ entry }}", entry.label);
    return `<input class="library-entry-selection" type="checkbox" data-library-select-entry="${escapeHtml(entry.id)}" aria-label="${escapeHtml(label)}">`;
}

function cardDefinition(entry, layer, entries, schema) {
    const definitionLayers = new Set(
        (layer.relationships ?? [])
            .filter((relationship) => {
                const target = schema.layers.find(
                    ({ id }) => id === relationship.targetLayer,
                );
                return isMeaningLayer(target);
            })
            .map(({ targetLayer }) => targetLayer),
    );
    const referencedIds = new Set(
        (entry.references ?? []).map(({ entryId }) => entryId),
    );
    return entries.find(
        (candidate) =>
            referencedIds.has(candidate.id) &&
            definitionLayers.has(candidate.layer),
    );
}

function renderCardContents(entry, layer, entries, schema, i18n) {
    const pronunciation = pronunciationValues(entry)
        .map((value) => escapeHtml(value))
        .join(" · ");
    const heading = isWritingUnitLayer(layer)
        ? `<span class="library-entry-heading"><strong>${escapeHtml(entry.label)}</strong>${pronunciation ? `<span class="library-card-pronunciation">${pronunciation}</span>` : ""}</span>`
        : `<strong>${escapeHtml(entry.label)}</strong>${pronunciation ? `<span class="library-card-pronunciation library-card-pronunciation-below">${pronunciation}</span>` : ""}`;
    const definition = cardDefinition(entry, layer, entries, schema);
    const definitionLabel = definition
        ? definitionText(
              definition,
              layerForEntry([schema], definition),
              schema.language,
          )
        : "";
    const definitionDisplay = definition
        ? `<span class="library-card-definition">${escapeHtml(definitionLabel)}</span>`
        : "";
    if (layer.minimal) {
        return `<span class="library-entry-minimal-content"><strong>${escapeHtml(entry.label)}</strong></span>${pronunciation ? `<span class="library-card-pronunciation library-card-pronunciation-below">${pronunciation}</span>` : ""}${definitionDisplay}`;
    }
    return `${heading}${definitionDisplay}<span class="library-entry-indicators">${renderMetadataPills(entry, layer)}${renderScope(entry, i18n)}</span>`;
}

function renderEntryCard(
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
        return placement?.parentId === entry.id && placement.depth <= 4
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

function renderLayerCards(layer, entries, schema, i18n, allEntries = entries) {
    const placements = assignVariantPlacements(entries, schema, layer);
    const baseEntries = entries.filter((entry) => !placements.has(entry.id));
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

function selectedEntryIds(root) {
    return Array.from(
        root.querySelectorAll("[data-library-select-entry]:checked"),
        (control) => control.dataset.librarySelectEntry,
    );
}

function selectionForCard(root, card) {
    return Array.from(
        root.querySelectorAll("[data-library-select-entry]"),
    ).find(
        (control) =>
            control.dataset.librarySelectEntry === card.dataset.libraryEntry,
    );
}

function updateDeleteSelectionButton(root, i18n) {
    const button = root.querySelector("[data-library-delete-selection]");
    if (!button) return;
    const count = selectedEntryIds(root).length;
    button.disabled = count === 0;
    button.textContent = i18n.t("ui.reuse.delete");
}

function setSelectionMode(root, enabled, i18n) {
    root.classList.toggle("library-selection-mode", enabled);
    if (!enabled) {
        root.querySelectorAll("[data-library-select-entry]").forEach(
            (selection) => {
                selection.checked = false;
            },
        );
    }
    const floatingActions = root.querySelector(
        '[data-floating-slot="library-selection-actions"]',
    );
    if (floatingActions) floatingActions.hidden = !enabled;
    updateDeleteSelectionButton(root, i18n);
}

function selectAllVisibleEntries(root, i18n) {
    root.querySelectorAll(
        "[data-library-panel]:not([hidden]) .library-entry-card-shell:not([hidden]) [data-library-select-entry]",
    ).forEach((selection) => {
        selection.checked = true;
    });
    updateDeleteSelectionButton(root, i18n);
}

async function confirmEntryDeletion(root, i18n) {
    const entryIds = selectedEntryIds(root);
    if (entryIds.length === 0) return null;
    let blacklistContentHashes = false;
    const action = await openPopup({
        title: i18n.t("gateway.study.library_delete_title"),
        body: `<p>${escapeHtml(i18n.t("gateway.study.library_delete_warning"))}</p><label class="library-delete-permanent"><input type="checkbox" data-library-blacklist-content> ${escapeHtml(i18n.t("gateway.study.library_delete_permanent"))}</label>`,
        variant: "warning",
        actions: [
            {
                id: "delete",
                label: i18n.t("ui.reuse.delete"),
                variant: "cancel",
            },
            {
                id: "cancel",
                label: i18n.t("ui.reuse.cancel"),
                variant: "neutral",
            },
        ],
        onAction(selectedAction, overlay) {
            if (selectedAction !== "delete") return;
            blacklistContentHashes = overlay.querySelector(
                "[data-library-blacklist-content]",
            ).checked;
        },
    });
    return action === "delete" ? { entryIds, blacklistContentHashes } : null;
}

function renderBrowser(schemas, entries, i18n) {
    if (!schemas.length)
        return `<p>${escapeHtml(i18n.t("gateway.study.library_empty"))}</p>`;
    return schemas
        .map((schema, schemaIndex) => {
            const schemaLabel =
                localizedLabel(schema.metadata, schema.language) || schema.id;
            const visibleLayers = schema.layers.filter(
                (layer) =>
                    !isMeaningLayer(layer) && layer.semanticRole !== "particle",
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
            return `<section class="library-schema" data-library-schema-id="${escapeHtml(schema.id)}"><h2>${escapeHtml(schemaLabel)}</h2><div class="library-layer-tabs" role="tablist" aria-label="${escapeHtml(i18n.t("gateway.study.library_layers"))}">${tabs}</div>${panels}</section>`;
        })
        .join("");
}

function activateLibraryLayer(schema, layerId) {
    schema.querySelectorAll("[data-library-tab]").forEach((item) => {
        const active = item.dataset.libraryTab === layerId;
        item.classList.toggle("active", active);
        item.setAttribute("aria-selected", String(active));
    });
    schema.querySelectorAll("[data-library-panel]").forEach((panel) => {
        panel.hidden = panel.dataset.libraryPanel !== layerId;
    });
}

function focusLibraryEntry(root, entry, schemas) {
    const layer = layerForEntry(schemas, entry);
    const schema = root.querySelector(
        `[data-library-schema-id="${CSS.escape(entry.schemaId)}"]`,
    );
    const tab = schema?.querySelector(
        `[data-library-tab="${CSS.escape(entry.layer)}"]`,
    );
    if (!schema || !tab || isMeaningLayer(layer)) return false;
    activateLibraryLayer(schema, entry.layer);
    const target = root.querySelector(
        `.library-browser [data-library-entry="${CSS.escape(entry.id)}"]`,
    );
    const revealedShells = [];
    let variantShell = target?.closest(".library-entry-variant-shell");
    while (variantShell) {
        variantShell.classList.add("library-entry-variant-revealed");
        revealedShells.push(variantShell);
        variantShell = variantShell.parentElement?.closest(
            ".library-entry-variant-shell",
        );
    }
    target?.focus();
    window.requestAnimationFrame(() => {
        highlightSearchTarget({ id: `library-entry-${entry.id}` });
    });
    if (revealedShells.length) {
        window.setTimeout(() => {
            revealedShells.forEach((shell) =>
                shell.classList.remove("library-entry-variant-revealed"),
            );
        }, 2000);
    }
    return true;
}

async function openEntryPopup(
    root,
    initialEntry,
    schemas,
    entries,
    i18n,
    languageCode,
    signal,
) {
    if (isMeaningLayer(layerForEntry(schemas, initialEntry))) return;
    let selectedEntry = initialEntry;
    while (selectedEntry && !signal?.aborted) {
        const detail = await fetchLibraryEntry(selectedEntry.id);
        const titleReference = headingCompositionReference(detail, schemas);
        const active = entries.filter(
            (entry) =>
                entry.schemaId === selectedEntry.schemaId &&
                entry.layer === selectedEntry.layer,
        );
        const index = active.findIndex(
            (entry) => entry.id === selectedEntry.id,
        );
        const composed = await composeDetail(
            detail,
            schemas,
            i18n,
            languageCode,
            variantPlacement,
        );
        signal?.throwIfAborted();
        let dismissPopup;
        let relatedEntry;
        const audioObjectUrls = new Set();
        const audioController = new AbortController();
        const abortPopup = () => dismissPopup?.();
        signal?.addEventListener("abort", abortPopup, { once: true });
        const result = await openPopup({
            title: detail.entry.label,
            titleLeading: composed.titleLeading,
            titleAction: titleReference
                ? { id: "open-title-reference", label: detail.entry.label }
                : undefined,
            titleDetail: [
                detailTitlePronunciation(
                    detail.entry,
                    layerForEntry(schemas, detail.entry),
                ),
                composed.titleDefinition,
            ]
                .filter(Boolean)
                .join(" · "),
            body: composed.body,
            maxWidth: "min(56rem, 94vw)",
            closeButtonVariant: "neutral",
            actions: [
                {
                    id: "previous",
                    label: i18n.t("gateway.study.library_previous"),
                    icon: {
                        light: "/static/assets/reuse/arrow-back-light.svg",
                        dark: "/static/assets/reuse/arrow-back-dark.svg",
                        position: "before",
                    },
                    variant: "neutral",
                    disabled: index <= 0,
                },
                {
                    id: "next",
                    label: i18n.t("gateway.study.library_next"),
                    icon: {
                        light: "/static/assets/reuse/arrow-back-light.svg",
                        dark: "/static/assets/reuse/arrow-back-dark.svg",
                        position: "after",
                        flip: true,
                    },
                    variant: "neutral",
                    disabled: index < 0 || index >= active.length - 1,
                },
                ...composed.actions,
            ],
            onOpen: (overlay, dismiss) => {
                dismissPopup = dismiss;
                overlay.classList.add("library-entry-popup");
                void loadLibraryAudio(
                    overlay,
                    audioObjectUrls,
                    audioController.signal,
                    i18n.t("gateway.study.library_audio_load_error"),
                );
                overlay.addEventListener("click", (event) => {
                    const control = event.target.closest(
                        "button[data-library-entry]",
                    );
                    if (!control) return;
                    relatedEntry = entries.find(
                        (entry) => entry.id === control.dataset.libraryEntry,
                    );
                    void dismiss();
                });
            },
            onAction: async (actionId, overlay, popupApi) => {
                const contributedAction = composed.actions.find(
                    (action) => action.id === actionId,
                );
                if (typeof contributedAction?.onAction !== "function")
                    return true;
                return contributedAction.onAction({
                    actionId,
                    detail,
                    overlay,
                    popupApi,
                    languageCode,
                });
            },
        });
        audioController.abort();
        for (const objectUrl of audioObjectUrls) {
            URL.revokeObjectURL(objectUrl);
        }
        signal?.removeEventListener("abort", abortPopup);
        if (result === "open-title-reference") selectedEntry = titleReference;
        else if (result === "previous") selectedEntry = active[index - 1];
        else if (result === "next") selectedEntry = active[index + 1];
        else if (relatedEntry && focusLibraryEntry(root, relatedEntry, schemas))
            selectedEntry = null;
        else if (
            relatedEntry &&
            !isMeaningLayer(layerForEntry(schemas, relatedEntry))
        )
            selectedEntry = relatedEntry;
        else selectedEntry = null;
    }
}

function applyLibraryFilters(filter) {
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

function refreshLibraryFilterResults(panel) {
    if (!panel) return;
    const selectedFilters = Array.from(
        panel.querySelectorAll("button[data-library-filter].active"),
    );
    const selections = groupByToMap(
        selectedFilters,
        (item) => item.dataset.libraryFilter,
    );
    let visibleCount = 0;
    panel
        .querySelectorAll(".library-entry-card[data-library-filter-values]")
        .forEach((card) => {
            const values = JSON.parse(card.dataset.libraryFilterValues);
            const visible = Array.from(selections.entries()).every(
                ([fieldId, controls]) =>
                    controls.some((control) =>
                        values[fieldId]?.includes(
                            control.dataset.libraryFilterValue,
                        ),
                    ),
            );
            card.hidden = !visible;
            card.closest(".library-entry-card-shell").hidden = !visible;
            if (visible) visibleCount += 1;
        });
    panel.querySelector(".library-filter-empty").hidden = visibleCount > 0;
}

export async function mount(root, { signal } = {}) {
    const i18n = await createI18n({
        componentStringBaseUrls: [
            "/static/gateways/study/languages",
            "/static/adapters/study/library/languages",
        ],
    });
    applyDocumentTitle(i18n, "gateway.study.library_label");
    const requestedLanguageCode = readSelectedStudyLanguageCode();
    const model = await loadStudySubNavigationModel({
        fallbackLanguageCode: requestedLanguageCode,
    });
    const languageCode = model.selectedLanguageCode;
    let schemas = [];
    let entries = [];
    try {
        schemas = await fetchLibrarySchemas(languageCode);
        const accountId = localStorage.getItem("cognis_account");
        const locations = [
            { scope: "global" },
            ...(accountId ? [{ scope: "user", scopeId: accountId }] : []),
        ];
        entries = (
            await Promise.all(
                schemas.flatMap((schema) =>
                    locations.map((location) =>
                        fetchLibraryEntries({
                            ...location,
                            schemaId: schema.id,
                        }),
                    ),
                ),
            )
        ).flat();
    } catch {
        showToast(i18n.t("gateway.study.library_load_error"), {
            type: "error",
        });
    }
    const composer = createPageComposer(root, {
        allowCustomization: false,
        contentScrolling: false,
        elements: [
            {
                id: "study-library",
                label: i18n.t("gateway.study.library_label"),
                pinned: true,
                width: "fill",
                gridSize: { default: [12, 8], min: [4, 4], max: "full" },
                render: () =>
                    `<section class="library-browser">${renderBrowser(schemas, entries, i18n)}</section>`,
            },
        ],
        preferenceKey: "study-library-layout",
        i18n,
        pageContext: {
            title: i18n.t("gateway.study.library_label"),
            subtitle: i18n.t("gateway.study.library_subtitle"),
        },
        toolbar: [],
        floatingMenu: entries.some(canDeleteEntry)
            ? [
                  {
                      id: "library-selection-actions",
                      label: i18n.t("ui.reuse.actions"),
                      render: () =>
                          `<button class="btn-neutral library-selection-action" type="button" data-library-select-all>${escapeHtml(i18n.t("ui.reuse.select_all"))}</button><button class="btn-cancel library-selection-action" type="button" data-library-delete-selection disabled>${escapeHtml(i18n.t("ui.reuse.delete"))}</button><button class="btn-neutral library-selection-action library-selection-close" type="button" data-library-selection-close aria-label="${escapeHtml(i18n.t("ui.reuse.close"))}">X</button>`,
                  },
              ]
            : [],
        subNavigation: [
            {
                id: "study-subnav",
                label: i18n.t("gateway.study.page_title"),
                render: () =>
                    renderStudySubNavigation({
                        model,
                        currentPath: "/study/library",
                        i18n,
                    }),
            },
        ],
    });
    await composer.init();
    signal?.throwIfAborted();
    root.querySelectorAll("[data-library-panel]").forEach((panel) => {
        if (panel.querySelector("button[data-library-filter].active")) {
            refreshLibraryFilterResults(panel);
        }
    });
    bindStudySubNavigation(root, { signal });
    let longPressTimer = null;
    let longPressOrigin = null;
    let suppressEntryClick = false;
    const cancelLongPress = () => {
        if (longPressTimer !== null) window.clearTimeout(longPressTimer);
        longPressTimer = null;
        longPressOrigin = null;
    };
    root.addEventListener(
        "pointerdown",
        (event) => {
            if (event.button !== 0) return;
            const card = event.target.closest("button[data-library-entry]");
            if (!card) return;
            const shell = card.closest(".library-entry-card-shell");
            if (!shell?.querySelector(":scope > .library-entry-variant-shell"))
                return;
            cancelLongPress();
            longPressOrigin = { x: event.clientX, y: event.clientY };
            longPressTimer = window.setTimeout(() => {
                shell.classList.add("library-entry-variants-open");
                card.focus();
                suppressEntryClick = true;
                longPressTimer = null;
            }, LONG_PRESS_DURATION_MS);
        },
        { signal },
    );
    root.addEventListener(
        "pointermove",
        (event) => {
            if (!longPressOrigin) return;
            const distance = Math.hypot(
                event.clientX - longPressOrigin.x,
                event.clientY - longPressOrigin.y,
            );
            if (distance > LONG_PRESS_MOVE_TOLERANCE_PX) cancelLongPress();
        },
        { signal },
    );
    root.addEventListener("pointerup", cancelLongPress, { signal });
    root.addEventListener("pointercancel", cancelLongPress, { signal });
    root.addEventListener(
        "contextmenu",
        (event) => {
            const card = event.target.closest("button[data-library-entry]");
            if (!card) return;
            const selection = selectionForCard(root, card);
            if (!selection) return;
            event.preventDefault();
            setSelectionMode(root, true, i18n);
            selection.checked = true;
            updateDeleteSelectionButton(root, i18n);
        },
        { signal },
    );
    root.addEventListener(
        "focusout",
        (event) => {
            const shell = event.target.closest(".library-entry-card-shell");
            if (!shell?.classList.contains("library-entry-variants-open"))
                return;
            if (!shell.contains(event.relatedTarget)) {
                shell.classList.remove("library-entry-variants-open");
            }
        },
        { signal },
    );
    root.addEventListener(
        "change",
        (event) => {
            if (!event.target.matches("[data-library-select-entry]")) return;
            if (
                root.classList.contains("library-selection-mode") &&
                selectedEntryIds(root).length === 0
            ) {
                setSelectionMode(root, false, i18n);
                return;
            }
            updateDeleteSelectionButton(root, i18n);
        },
        { signal },
    );
    root.addEventListener(
        "click",
        (event) => {
            if (event.target.closest("[data-library-select-all]")) {
                selectAllVisibleEntries(root, i18n);
                return;
            }
            if (event.target.closest("[data-library-selection-close]")) {
                setSelectionMode(root, false, i18n);
                return;
            }
            const deleteSelection = event.target.closest(
                "[data-library-delete-selection]",
            );
            if (deleteSelection) {
                void confirmEntryDeletion(root, i18n).then(async (request) => {
                    if (!request) return;
                    try {
                        await deleteLibraryEntries(request.entryIds, {
                            blacklistContentHashes:
                                request.blacklistContentHashes,
                        });
                        entries = entries.filter(
                            (entry) => !request.entryIds.includes(entry.id),
                        );
                        root.querySelector(".library-browser").innerHTML =
                            renderBrowser(schemas, entries, i18n);
                        setSelectionMode(root, false, i18n);
                        showToast(
                            i18n.t("gateway.study.library_delete_success"),
                            { variant: "success" },
                        );
                    } catch {
                        showToast(
                            i18n.t("gateway.study.library_delete_error"),
                            { variant: "error" },
                        );
                    }
                });
                return;
            }
            if (event.target.matches("[data-library-select-entry]")) return;
            const filter = event.target.closest("button[data-library-filter]");
            if (filter) {
                applyLibraryFilters(filter);
                return;
            }
            const tab = event.target.closest("button[data-library-tab]");
            if (tab) {
                const schema = tab.closest(".library-schema");
                activateLibraryLayer(schema, tab.dataset.libraryTab);
                return;
            }
            const control = event.target.closest("button[data-library-entry]");
            if (!control) return;
            closeUnrelatedVariantViews(root, control);
            if (suppressEntryClick) {
                suppressEntryClick = false;
                return;
            }
            if (root.classList.contains("library-selection-mode")) {
                setSelectionMode(root, false, i18n);
            }
            const entry = entries.find(
                (candidate) => candidate.id === control.dataset.libraryEntry,
            );
            if (!entry) return;
            void openEntryPopup(
                root,
                entry,
                schemas,
                entries,
                i18n,
                languageCode,
                signal,
            ).catch(() =>
                showToast(i18n.t("gateway.study.library_load_error"), {
                    type: "error",
                }),
            );
        },
        { signal },
    );
}

await mountWhenDirect(mount);
