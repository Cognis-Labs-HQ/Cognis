/**
 * Rendering helpers for page composer grid and sub-page views.
 *
 * Public exports:
 *   createComposerRenderer(deps) — returns the layout normalization and
 *     render helpers for the main composer and sub-page mode.
 *
 * Usage:
 *   const renderer = createComposerRenderer({ state, UNIT, i18n, escapeHtml, getGridSize, renderMissingElementContent, createGridOverlay, createCell, createMissingCell, createElementsPanel, syncEditToggle, mountSubComposer, unmountSubComposer, captureFormState, restoreFormState, mergeFormStateSnapshots, loadPersistedFormState, bindFormDraftPersistence });
 *
 * @param {object} deps
 * @returns {object}
 */
import {
    composerPresentation,
    applyComposerPresentation,
} from "./presentation.js";

import { applyGridMetrics, applyGridPlacement } from "./view-geometry.js";
import { isCompactComposer, hasGridProfile } from "./responsive-layout.js";
import { createDomPreservation } from "./dom-preservation.js";
import { createPlacementResolver } from "./placement-resolver.js";
export function createComposerRenderer({
    state,
    UNIT,
    MOBILE_LAYOUT_WIDTH_RECLAIM_BREAKPOINT,
    COMPACT_SINGLE_ROW_FULL_WIDTH_MAX_COLS:
        COMPACT_SINGLE_ROW_FULL_WIDTH_MAX_COLUMNS,
    i18n,
    escapeHtml,
    getGridSize,
    renderMissingElementContent,
    createGridOverlay,
    createCell,
    createMissingCell,
    createElementsPanel,
    computeGridDimensions,
    initializePlacements,
    applyLayoutForCurrentGridColumns,
    computeSubGridDimensions: computeNestedGridDimensions,
    initializeSubPlacements: initializeNestedPlacements,
    syncEditToggle,
    mountSubComposer: mountNestedComposer,
    unmountSubComposer: unmountNestedComposer,
    captureFormState,
    restoreFormState,
    mergeFormStateSnapshots,
    loadPersistedFormState,
    bindFormDraftPersistence,
}) {
    const {
        parkPreservedElementNodes,
        renderElementContent,
        refreshElements: refreshElementMarkup,
        consumeElementRender,
        syncElementPresentation,
    } = createDomPreservation(state, {
        redraw: () => renderGridComposer({ layoutOnly: true }),
    });

    const {
        computeViewPlacements,
        computeSubViewPlacements: computeNestedViewPlacements,
        syncLayoutToCurrentGridColumns,
        syncSubLayoutToCurrentGridColumns: syncNestedLayoutToCurrentGridColumns,
    } = createPlacementResolver({
        state,
        getGridSize,
        MOBILE_LAYOUT_WIDTH_RECLAIM_BREAKPOINT,
        COMPACT_SINGLE_ROW_FULL_WIDTH_MAX_COLS:
            COMPACT_SINGLE_ROW_FULL_WIDTH_MAX_COLUMNS,
        computeGridDimensions,
        initializePlacements,
        computeSubGridDimensions: computeNestedGridDimensions,
        initializeSubPlacements: initializeNestedPlacements,
    });

    function getVisibleComposerPlacements() {
        return state.editing
            ? state.layout.placements
                  .filter(
                      (candidatePlacement) =>
                          !state.layout.hidden.includes(candidatePlacement.id),
                  )
                  .sort(
                      (leftEntry, rightEntry) =>
                          leftEntry.row - rightEntry.row ||
                          leftEntry.col - rightEntry.col,
                  )
            : computeViewPlacements();
    }
    function applySectionGridMetrics(section, placements) {
        if (state.frameless) return 1;
        section.classList.toggle(
            "composer-view-grid--viewport",
            state.fillViewport === true,
        );
        const compact =
            !state.editing &&
            !hasGridProfile(state) &&
            isCompactComposer(state.contentGrid, state.stackAt);
        section.classList.toggle("composer-view-grid--compact", compact);
        return applyGridMetrics(section, placements, state.gridColumns, UNIT);
    }
    function applyCardPlacement(card, placement, scale) {
        if (state.frameless) return;
        if (state.fillViewport) {
            card.style.gridColumn = "1 / -1";
            card.style.gridRow = "1";
            return;
        }
        if (
            !state.editing &&
            !hasGridProfile(state) &&
            isCompactComposer(state.contentGrid, state.stackAt)
        ) {
            card.style.gridColumn = "1 / -1";
            card.style.gridRow = "auto";
            return;
        }
        applyGridPlacement(card, placement, scale);
    }
    function renderPlacementCards(section, placements, scale) {
        const renderedIds = new Set(
            placements.map((placement) => placement.id),
        );
        section
            .querySelectorAll(
                ":scope > .widget-card[data-composer-element], :scope > .widget-card--missing[data-composer-element]",
            )
            .forEach((card) => {
                if (!renderedIds.has(card.dataset.composerElement)) {
                    card.remove();
                }
            });
        for (const placement of placements) {
            const element = state.elements.find(
                (candidateElement) => candidateElement.id === placement.id,
            );
            const isMissing = !element;
            let card = Array.from(section.children).find(
                (child) =>
                    child.dataset?.composerElement === placement.id &&
                    !child.classList.contains("composer-cell"),
            );
            if (!card) {
                card = document.createElement("section");
                card.dataset.composerElement = placement.id;
                card.className = isMissing
                    ? "widget-card widget-card--missing"
                    : "widget-card";
                section.appendChild(card);
                applyCardPlacement(card, placement, scale);
                if (isMissing) {
                    card.innerHTML = renderMissingElementContent(placement.id);
                } else {
                    renderElementContent(card, element);
                }
            }
            card.className = isMissing
                ? "widget-card widget-card--missing"
                : "widget-card";
            applyCardPlacement(card, placement, scale);
            if (element) syncElementPresentation(card, element);
            const position = placements.indexOf(placement);
            if (section.children[position] !== card) {
                section.insertBefore(card, section.children[position] ?? null);
            }
        }
    }
    function clearEditChrome(section) {
        section
            .querySelectorAll(
                ":scope > .composer-grid-overlay, :scope > .composer-cell, :scope > .composer-shade, :scope > .composer-dropzone-line",
            )
            .forEach((node) => node.remove());
    }
    function renderEditChrome(section, placements) {
        section.appendChild(createGridOverlay());
        for (const placement of placements) {
            const element = state.elements.find(
                (candidateElement) => candidateElement.id === placement.id,
            );
            if (!element) {
                section.appendChild(createMissingCell(placement));
                continue;
            }
            const cell = createCell(element, placement, {
                includeContent: false,
            });
            cell.setAttribute("aria-label", element.label ?? placement.id);
            section.appendChild(cell);
        }
    }
    function renderGridComposer({ layoutOnly = false } = {}) {
        applyComposerPresentation(
            state.root,
            state.contentGrid,
            composerPresentation(state.contentGrid),
        );
        if (!document.contains(state.contentGrid)) return;
        document.getElementById("composer-elements-panel")?.remove();
        if (!state.layout || (state.layout.order && !state.layout.placements)) {
            state.layout = { placements: [], hidden: [] };
        }
        computeGridDimensions();
        if (!state.editing && state.persistLayoutPreferences) {
            applyLayoutForCurrentGridColumns();
        }
        initializePlacements();
        computeGridDimensions();
        state.contentGrid.classList.toggle(
            "composer-grid-active",
            state.editing,
        );
        const gridFormSnapshot = mergeFormStateSnapshots(
            loadPersistedFormState(state.preferenceKey),
            captureFormState(state.contentGrid),
        );
        let panel = state.contentGrid.querySelector(":scope > .content-panel");
        let section = panel?.querySelector(":scope > .content-section");
        if (!panel || !section) {
            parkPreservedElementNodes();
            state.contentGrid.innerHTML = "";
            panel = document.createElement("article");
            panel.className = "content-panel";
            section = document.createElement("div");
            section.className = "content-section";
            panel.appendChild(section);
            state.contentGrid.appendChild(panel);
        }
        state.gridSection = section;
        clearEditChrome(section);
        section.classList.toggle("composer-grid-active", state.editing);
        section.classList.toggle("composer-view-grid", !state.frameless);
        const visiblePlacements = getVisibleComposerPlacements();
        if (
            !state.editing &&
            !hasGridProfile(state) &&
            isCompactComposer(state.contentGrid, state.stackAt)
        ) {
            state.contentGrid.style.minHeight = "";
        }
        const scale = applySectionGridMetrics(section, visiblePlacements);
        renderPlacementCards(section, visiblePlacements, scale);
        if (state.editing) {
            computeGridDimensions();
            section.style.minHeight = `${state.gridPixelHeight ?? state.gridRows * UNIT}px`;
            renderEditChrome(section, visiblePlacements);
            createElementsPanel();
        } else {
            section.style.minHeight = "";
        }
        syncEditToggle();
        restoreFormState(state.contentGrid, gridFormSnapshot);
        bindFormDraftPersistence(state.contentGrid, state.preferenceKey);
        let contentRendered = false;
        for (const id of visiblePlacements.map((placement) => placement.id)) {
            const element = state.elements.find((entry) => entry.id === id);
            const host = state.contentGrid.querySelector(
                `[data-composer-element="${CSS.escape(id)}"]`,
            );
            const mounted = Boolean(host && consumeElementRender(host));
            contentRendered ||= mounted;
            if (!layoutOnly || mounted) element?.onRender?.();
        }
        if (!layoutOnly || contentRendered) state.onRender?.();
    }

    function refreshElements(elementIds) {
        refreshElementMarkup(elementIds);
        for (const id of elementIds) {
            const element = state.elements.find((entry) => entry.id === id);
            const host = state.contentGrid.querySelector(
                `[data-composer-element="${CSS.escape(id)}"]`,
            );
            if (host && consumeElementRender(host)) element?.onRender?.();
        }
        state.onRender?.();
    }

    function getEffectiveLayout() {
        const allIds = state.elements.map(
            (candidateElement) => candidateElement.id,
        );
        const pinnedIds = state.elements
            .filter((candidateElement) => candidateElement.pinned)
            .map((candidateElement) => candidateElement.id);
        const storedOrder = (state.layout?.order ?? []).filter((id) =>
            allIds.includes(id),
        );
        const storedHidden = state.layout?.hidden ?? null;
        const defaultHiddenIds = state.elements
            .filter(
                (candidateElement) =>
                    candidateElement.defaultHidden &&
                    !candidateElement.pinned &&
                    !storedOrder.includes(candidateElement.id) &&
                    !(storedHidden ?? []).includes(candidateElement.id),
            )
            .map((candidateElement) => candidateElement.id);
        const missing = allIds.filter(
            (id) => !storedOrder.includes(id) && !defaultHiddenIds.includes(id),
        );
        const order = [...storedOrder, ...missing];
        const baseHidden = storedHidden !== null ? storedHidden : [];
        const hidden = [
            ...new Set([...baseHidden, ...defaultHiddenIds]),
        ].filter((id) => allIds.includes(id) && !pinnedIds.includes(id));
        return { order, hidden };
    }
    function renderCards(effectiveLayout) {
        const { order, hidden } = effectiveLayout;
        return order
            .filter((id) => !hidden.includes(id))
            .map((id) => {
                const element = state.elements.find(
                    (candidateElement) => candidateElement.id === id,
                );
                if (!element) return "";
                const dragAttributes = state.editing ? ` draggable="true"` : "";
                const dragHandle = state.editing
                    ? `<div class="composer-drag-handle" aria-hidden="true">
               <span class="composer-drag-icon">⠿</span>
               <span class="composer-drag-label">${element.label}</span>
               ${!element.pinned ? `<button class="composer-remove-btn" data-composer-remove="${element.id}" type="button">${i18n.t("ui.reuse.remove")}</button>` : ""}
             </div>`
                    : "";
                const editingClass = state.editing ? " composer-editing" : "";
                const focusButton = element.focusControl
                    ? `<button type="button" class="focus-control-trigger btn-neutral" data-focus-surface="${escapeHtml(element.focusControl.id)}" aria-label="${escapeHtml(i18n.t(element.focusControl.labelKey))}">
                         <svg aria-hidden="true" viewBox="0 0 24 24" width="18" height="18"><path d="M8 3H3v5M16 3h5v5M8 21H3v-5m13 5h5v-5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
                       </button>`
                    : "";
                const isActive =
                    state.subPageNavigation &&
                    element.id === state.activeNestedPageId;
                const activeClass = isActive ? " active" : "";
                const hiddenAttribute =
                    state.subPageNavigation && !isActive ? " hidden" : "";
                if (element.subComposerOptions) {
                    const headingHtml = element.subComposerOptions.heading
                        ? `<h2 class="sub-composer-heading">${escapeHtml(element.subComposerOptions.heading)}</h2>`
                        : "";
                    return `<div class="content-section${activeClass}"${hiddenAttribute} id="${element.id}">${headingHtml}<div class="sub-composer-inner"></div></div>`;
                }
                return `<div class="content-section${activeClass}"${hiddenAttribute} id="${element.id}"><section class="widget-card${editingClass}" data-composer-element="${element.id}"${dragAttributes}>${dragHandle}${focusButton}${element.render(composerPresentation(state.contentGrid))}</section></div>`;
            })
            .join("");
    }
    function renderLibraryPanel(effectiveLayout) {
        const hiddenElements = state.elements.filter((candidateElement) =>
            effectiveLayout.hidden.includes(candidateElement.id),
        );
        const listItems = hiddenElements
            .map(
                (elementDefinition) => `<li class="composer-library-item">
           <span>${elementDefinition.label}</span>
           <button class="composer-add-btn" data-composer-add="${elementDefinition.id}" type="button">${i18n.t("ui.reuse.add")}</button>
         </li>`,
            )
            .join("");
        const emptyMessage = !hiddenElements.length
            ? `<li class="composer-library-empty">${i18n.t("ui.reuse.all_elements_visible")}</li>`
            : "";
        return `
      <aside class="composer-library">
        <div class="composer-library-header">
          <h3>${i18n.t("ui.reuse.elements")}</h3>
        </div>
        <ul class="composer-library-list">${listItems}${emptyMessage}</ul>
      </aside>
    `;
    }
    function renderNestedPageComposer() {
        const effectiveLayout = getEffectiveLayout();
        let html = "";
        const cardsHtml = renderCards(effectiveLayout);
        const editingClass = state.editing
            ? " composer-content-panel--editing"
            : "";
        html += `<article class="content-panel${editingClass}">${cardsHtml}</article>`;
        if (state.editing) {
            html += renderLibraryPanel(effectiveLayout);
        }
        state.contentGrid.innerHTML = html;
        bindNestedPageComposerEvents();
        syncEditToggle();
        for (const id of effectiveLayout.order) {
            if (effectiveLayout.hidden.includes(id)) continue;
            const element = state.elements.find((entry) => entry.id === id);
            const host = state.contentGrid.querySelector(
                `[data-composer-element="${CSS.escape(id)}"]`,
            );
            if (host)
                applyComposerPresentation(
                    state.root,
                    host,
                    composerPresentation(host),
                );
            element?.onRender?.();
        }
        state.onRender?.();
        const activeElement = state.elements.find(
            (candidateElement) =>
                candidateElement.id === state.activeNestedPageId,
        );
        if (activeElement?.subComposerOptions) {
            const outerDiv = state.contentGrid.querySelector(
                `#${state.activeNestedPageId}`,
            );
            const sectionDiv =
                outerDiv?.querySelector(".sub-composer-inner") ??
                outerDiv ??
                state.contentGrid;
            mountNestedComposer(activeElement, sectionDiv).catch(() => {});
        }
    }
    function bindNestedPageComposerEvents() {
        state.contentGrid
            .querySelectorAll("[data-composer-remove]")
            .forEach((button) => {
                button.addEventListener("click", () => {
                    const id = button.dataset.composerRemove;
                    const effective = getEffectiveLayout();
                    state.layout = {
                        order: effective.order,
                        hidden: [...effective.hidden, id],
                    };
                    renderNestedPageComposer();
                });
            });
        state.contentGrid
            .querySelectorAll("[data-composer-add]")
            .forEach((button) => {
                button.addEventListener("click", () => {
                    const id = button.dataset.composerAdd;
                    const effective = getEffectiveLayout();
                    state.layout = {
                        order: effective.order,
                        hidden: effective.hidden.filter(
                            (hiddenElementId) => hiddenElementId !== id,
                        ),
                    };
                    renderNestedPageComposer();
                });
            });

        state.contentGrid
            .querySelectorAll("[data-composer-element][draggable]")
            .forEach((card) => {
                card.addEventListener("dragstart", (event) => {
                    state.dragSourceId = card.dataset.composerElement;
                    card.classList.add("composer-dragging");
                    event.dataTransfer.effectAllowed = "move";
                });

                card.addEventListener("dragend", () => {
                    card.classList.remove("composer-dragging");
                    state.contentGrid
                        .querySelectorAll(".composer-drag-over")
                        .forEach((targetCard) => {
                            targetCard.classList.remove("composer-drag-over");
                        });
                    state.dragSourceId = null;
                });

                card.addEventListener("dragover", (event) => {
                    event.preventDefault();
                    event.dataTransfer.dropEffect = "move";
                    if (card.dataset.composerElement !== state.dragSourceId) {
                        state.contentGrid
                            .querySelectorAll(".composer-drag-over")
                            .forEach((targetCard) => {
                                targetCard.classList.remove(
                                    "composer-drag-over",
                                );
                            });
                        card.classList.add("composer-drag-over");
                    }
                });

                card.addEventListener("drop", async (event) => {
                    event.preventDefault();
                    card.classList.remove("composer-drag-over");
                    const targetId = card.dataset.composerElement;
                    if (!state.dragSourceId || state.dragSourceId === targetId)
                        return;

                    const effective = getEffectiveLayout();
                    const visibleOrder = effective.order.filter(
                        (id) => !effective.hidden.includes(id),
                    );
                    const sourceIndex = visibleOrder.indexOf(
                        state.dragSourceId,
                    );
                    const targetIndex = visibleOrder.indexOf(targetId);
                    if (sourceIndex === -1 || targetIndex === -1) return;

                    visibleOrder.splice(sourceIndex, 1);
                    // Removing source shifts all subsequent indices by -1; adjust targetIdx when source precedes target.
                    const insertIndex =
                        sourceIndex < targetIndex
                            ? targetIndex - 1
                            : targetIndex;
                    visibleOrder.splice(insertIndex, 0, state.dragSourceId);

                    const newOrder = [
                        ...visibleOrder,
                        ...effective.order.filter((id) =>
                            effective.hidden.includes(id),
                        ),
                    ];
                    state.layout = {
                        order: newOrder,
                        hidden: effective.hidden,
                    };
                    renderNestedPageComposer();
                });
            });
    }

    function render() {
        if (!state.contentGrid) return;
        if (state.subPageNavigation) {
            renderNestedPageComposer();
        } else {
            renderGridComposer();
        }
    }

    return {
        refreshElements,
        render,
        renderGridComposer,
        computeSubViewPlacements: computeNestedViewPlacements,
        syncLayoutToCurrentGridColumns,
        syncSubLayoutToCurrentGridColumns: syncNestedLayoutToCurrentGridColumns,
    };
}
