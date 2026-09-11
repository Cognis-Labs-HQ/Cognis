import { createI18n, applyDocumentTitle } from "/static/reuse/i18n.js";
import { createPageComposer } from "/static/reuse/page-composer/index.js";
import { mountWhenDirect } from "/static/reuse/page-entry.js";
import { escapeHtml } from "/static/reuse/escape-html.js";
import { openPopup } from "/static/reuse/popup.js";
import { showToast } from "/static/reuse/toast.js";
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
let activeEntryPopup = null;

import {
    definitionText,
    detailTitlePronunciation,
    entryAttributes,
    entrySearchAttribute,
    headingCompositionReferences,
    isMeaningLayer,
    isWritingUnitLayer,
    layerForEntry,
    loadLibraryAudio,
    localizedLabel,
    pronunciationValues,
    relationSection,
    renderMetadataPills,
    renderScope,
} from "./presentation.js";

import { composeDetail } from "./detail.js";
import {
    applyLibraryFilters,
    refreshLibraryFilterResults,
    renderLayerFilters,
} from "./filters.js";
import { resolveLabelComposition } from "./composition-links.js";
import {
    assignVariantPlacements,
    isSameLibraryRecord,
    variantPlacement,
} from "./variant-placement.js";

function canDeleteEntry(entry) {
    return (
        isAdminScope() ||
        entry.createdBy === localStorage.getItem("cognis_account")
    );
}

function closeUnrelatedVariantViews(root, control) {
    let closed = false;
    root.querySelectorAll(".library-entry-variants-open").forEach((shell) => {
        const parentControl = shell.querySelector(
            ":scope > button[data-library-entry]",
        );
        if (!shell.contains(control) || control === parentControl) {
            shell.classList.remove("library-entry-variants-open");
            closed = true;
        }
    });
    return closed;
}

function clearVariantBranch(root) {
    root.querySelectorAll(
        ".library-entry-branch-active, .library-entry-branch-path, .library-entry-branch-tip",
    ).forEach((element) => {
        element.classList.remove(
            "library-entry-branch-active",
            "library-entry-branch-path",
            "library-entry-branch-tip",
        );
    });
}

function activateVariantBranch(root, card) {
    const shell = card.closest(".library-entry-card-shell");
    if (!shell) return;
    if (shell.dataset.libraryVariantDepth === "0") {
        if (shell.classList.contains("library-entry-variants-open")) {
            clearVariantBranch(root);
        }
        return;
    }
    const rootShell = shell.closest(
        '.library-entry-card-shell[data-library-variant-depth="0"]',
    );
    if (!rootShell?.classList.contains("library-entry-variants-open")) return;
    clearVariantBranch(root);
    rootShell.classList.add("library-entry-branch-active");
    shell.classList.add("library-entry-branch-tip");
    let branchShell = shell;
    while (branchShell !== rootShell) {
        branchShell.classList.add("library-entry-branch-path");
        const variantSlot = branchShell.parentElement;
        if (!variantSlot?.classList.contains("library-entry-variant-shell")) {
            break;
        }
        variantSlot.classList.add("library-entry-branch-path");
        branchShell = variantSlot.parentElement;
    }
}

function renderSelection(entry, i18n) {
    if (!canDeleteEntry(entry)) return "";
    const label = i18n
        .t("gateway.study.library_select_entry")
        .replace("{{ entry }}", entry.label);
    return `<input class="library-entry-selection" type="checkbox" data-library-select-entry="${escapeHtml(entry.id)}" aria-label="${escapeHtml(label)}">`;
}

function cardDefinitions(entry, layer, entries, schema) {
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
    return (entry.references ?? []).flatMap((reference) => {
        const definition = entries.find(
            (candidate) => candidate.id === reference.entryId,
        );
        return definition && definitionLayers.has(definition.layer)
            ? [definition]
            : [];
    });
}

function renderCardContents(entry, layer, entries, schema, i18n) {
    const pronunciation = pronunciationValues(entry)
        .map((value) => escapeHtml(value))
        .join(" · ");
    const heading = isWritingUnitLayer(layer)
        ? `<span class="library-entry-heading"><strong>${escapeHtml(entry.label)}</strong>${pronunciation ? `<span class="library-card-pronunciation">${pronunciation}</span>` : ""}</span>`
        : `<strong>${escapeHtml(entry.label)}</strong>${pronunciation ? `<span class="library-card-pronunciation library-card-pronunciation-below">${pronunciation}</span>` : ""}`;
    const definitions = cardDefinitions(entry, layer, entries, schema);
    const definitionLabel = definitions
        .map((definition) =>
            definitionText(
                definition,
                layerForEntry([schema], definition),
                schema.language,
            ),
        )
        .filter(Boolean)
        .join(" · ");
    const definitionDisplay = definitionLabel
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

function isDirectlyVisible(entry, entries, placements) {
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

function renderLayerCards(layer, entries, schema, i18n, allEntries = entries) {
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

async function confirmEntryDeletion(root, libraryEntries, i18n) {
    const entryIds = selectedEntryIds(root);
    if (entryIds.length === 0) return null;
    const cascadeIds = new Set(entryIds);
    let changed = true;
    while (changed) {
        changed = false;
        for (const entry of libraryEntries) {
            if (
                !cascadeIds.has(entry.id) &&
                entry.references?.some((reference) =>
                    cascadeIds.has(reference.entryId),
                )
            ) {
                cascadeIds.add(entry.id);
                changed = true;
            }
        }
    }
    const selectedIds = new Set(entryIds);
    const cascadeEntries = libraryEntries.filter(
        (entry) => cascadeIds.has(entry.id) && !selectedIds.has(entry.id),
    );
    const cascadeWarning = cascadeEntries.length
        ? `<p>${escapeHtml(i18n.t("gateway.study.library_delete_warning"))}</p><ul class="library-delete-cascade-list">${cascadeEntries.map((entry) => `<li>${escapeHtml(entry.label)}</li>`).join("")}</ul>`
        : "";
    let blacklistContentHashes = false;
    const action = await openPopup({
        title: i18n.t("gateway.study.library_delete_title"),
        body: `${cascadeWarning}<label class="library-delete-permanent"><input type="checkbox" data-library-blacklist-content> ${escapeHtml(i18n.t("gateway.study.library_delete_permanent"))}</label>`,
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
    return action === "delete"
        ? { entryIds: Array.from(cascadeIds), blacklistContentHashes }
        : null;
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
        const explicitTitleReferences = headingCompositionReferences(
            detail,
            schemas,
        );
        const titleReferences = explicitTitleReferences.length
            ? explicitTitleReferences
            : resolveLabelComposition(
                  detail.entry.label,
                  detail.entry,
                  schemas,
                  entries,
              );
        const parentEntry = entries.find(
            (entry) =>
                entry.id ===
                variantPlacement(detail.entry, schemas, entries)?.parentId,
        );
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
            entries,
            i18n,
            languageCode,
            variantPlacement,
        );
        signal?.throwIfAborted();
        const titleDetailItems = [
            detailTitlePronunciation(
                detail.entry,
                layerForEntry(schemas, detail.entry),
            ),
            composed.titleDefinition,
        ]
            .filter(Boolean)
            .flatMap((label, detailIndex) => [
                ...(detailIndex ? [{ label: " · " }] : []),
                { label },
            ]);
        if (parentEntry) {
            const [parentPrefix, parentSuffix = ""] = i18n
                .t("gateway.study.library_from_parent")
                .split("{{ parent }}");
            titleDetailItems.push(
                ...(titleDetailItems.length ? [{ label: " · " }] : []),
                { label: parentPrefix },
                {
                    label: parentEntry.label,
                    actionId: `open-title-reference:${parentEntry.id}`,
                },
                { label: parentSuffix },
            );
        }
        let dismissPopup;
        let relatedEntry;
        const audioObjectUrls = new Set();
        const audioController = new AbortController();
        const abortPopup = () => dismissPopup?.();
        signal?.addEventListener("abort", abortPopup, { once: true });
        const result = await openPopup({
            title: detail.entry.label,
            titleLeading: composed.titleLeading,
            titleItems: titleReferences.map((entry) => ({
                label: entry.label,
                actionId: `open-title-reference:${entry.id}`,
            })),
            titleDetailItems,
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
        if (result?.startsWith("open-title-reference:")) {
            const entryId = result.slice("open-title-reference:".length);
            selectedEntry = entries.find((entry) => entry.id === entryId);
        } else if (result === "previous") selectedEntry = active[index - 1];
        else if (result === "next") selectedEntry = active[index + 1];
        else if (
            relatedEntry &&
            !isMeaningLayer(layerForEntry(schemas, relatedEntry))
        )
            selectedEntry = relatedEntry;
        else selectedEntry = null;
    }
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
                clearVariantBranch(root);
                root.querySelectorAll(".library-entry-variants-open").forEach(
                    (openShell) => {
                        if (openShell !== shell) {
                            openShell.classList.remove(
                                "library-entry-variants-open",
                            );
                        }
                    },
                );
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
        "pointerover",
        (event) => {
            const card = event.target.closest("button[data-library-entry]");
            if (!card || card.contains(event.relatedTarget)) return;
            activateVariantBranch(root, card);
        },
        { signal },
    );
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
            const rootShell = event.target.closest(
                ".library-entry-variants-open",
            );
            if (!rootShell) return;
            if (!rootShell.contains(event.relatedTarget)) {
                rootShell.classList.remove("library-entry-variants-open");
                clearVariantBranch(rootShell);
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
                void confirmEntryDeletion(root, entries, i18n).then(
                    async (request) => {
                        if (!request) return;
                        try {
                            const deletion = await deleteLibraryEntries(
                                request.entryIds,
                                {
                                    blacklistContentHashes:
                                        request.blacklistContentHashes,
                                },
                            );
                            entries = entries.filter(
                                (entry) =>
                                    !deletion.entryIds.includes(entry.id),
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
                    },
                );
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
            if (suppressEntryClick) {
                suppressEntryClick = false;
                return;
            }
            if (closeUnrelatedVariantViews(root, control)) return;
            if (root.classList.contains("library-selection-mode")) {
                setSelectionMode(root, false, i18n);
            }
            const entry = entries.find(
                (candidate) => candidate.id === control.dataset.libraryEntry,
            );
            if (!entry) return;
            if (activeEntryPopup) return;
            activeEntryPopup = openEntryPopup(
                root,
                entry,
                schemas,
                entries,
                i18n,
                languageCode,
                signal,
            )
                .catch(() =>
                    showToast(i18n.t("gateway.study.library_load_error"), {
                        type: "error",
                    }),
                )
                .finally(() => {
                    activeEntryPopup = null;
                });
        },
        { signal },
    );
}

await mountWhenDirect(mount);
