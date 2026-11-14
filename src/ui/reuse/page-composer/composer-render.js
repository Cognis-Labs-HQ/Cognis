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
import { isCompactComposer } from "./responsive-layout.js";
import { createDomPreservation } from "./dom-preservation.js";
import { createPlacementResolver } from "./placement-resolver.js";
export function createComposerRenderer({
    state,
    UNIT,
    MOBILE_LAYOUT_WIDTH_RECLAIM_BREAKPOINT,
    COMPACT_SINGLE_ROW_FULL_WIDTH_MAX_COLS,
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
    computeSubGridDimensions,
    initializeSubPlacements,
    syncEditToggle,
    mountSubComposer,
    unmountSubComposer,
    captureFormState,
    restoreFormState,
    mergeFormStateSnapshots,
    loadPersistedFormState,
    bindFormDraftPersistence,
}) {
    const { parkPreservedElementNodes, renderElementContent, refreshElements } =
        createDomPreservation(state);

    const {
        computeViewPlacements,
        computeSubViewPlacements,
        syncLayoutToCurrentGridColumns,
        syncSubLayoutToCurrentGridColumns,
    } = createPlacementResolver({
        state,
        getGridSize,
        MOBILE_LAYOUT_WIDTH_RECLAIM_BREAKPOINT,
        COMPACT_SINGLE_ROW_FULL_WIDTH_MAX_COLS,
        computeGridDimensions,
        initializePlacements,
        computeSubGridDimensions,
        initializeSubPlacements,
    });

    function getVisibleComposerPlacements() {
        return state.editing
            ? state.layout.placements
                  .filter((p) => !state.layout.hidden.includes(p.id))
                  .sort((a, b) => a.row - b.row || a.col - b.col)
            : computeViewPlacements();
    }
    function getPlacementScale(placements) {
        const hasFractional =
            !state.frameless &&
            placements.some(
                (p) =>
                    p.col % 1 !== 0 ||
                    p.row % 1 !== 0 ||
                    p.w % 1 !== 0 ||
                    p.h % 1 !== 0,
            );
        return hasFractional ? 2 : 1;
    }
    function applySectionGridMetrics(section, placements) {
        if (state.frameless) return 1;
        const compact = !state.editing && isCompactComposer(state.contentGrid);
        section.classList.toggle("composer-view-grid--compact", compact);
        const scale = getPlacementScale(placements);
        section.classList.add("composer-view-grid");
        section.style.setProperty(
            "--grid-cols",
            String(state.gridCols * scale),
        );
        section.style.setProperty(
            "--composer-grid-row-size",
            `${UNIT / scale}px`,
        );
        return scale;
    }
    function applyCardPlacement(card, placement, scale) {
        if (state.frameless) return;
        if (!state.editing && isCompactComposer(state.contentGrid)) {
            card.style.gridColumn = "1 / -1";
            card.style.gridRow = "auto";
            return;
        }
        const scaledCol = placement.col * scale;
        const scaledRow = placement.row * scale;
        const scaledWidth = placement.w * scale;
        const scaledHeight = placement.h * scale;
        card.style.gridColumn = `${Math.round(scaledCol) + 1} / span ${Math.round(scaledWidth)}`;
        card.style.gridRow = `${Math.round(scaledRow) + 1} / span ${Math.round(scaledHeight)}`;
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
            const element = state.elements.find((e) => e.id === placement.id);
            const isMissing = !element;
            let card = Array.from(section.children).find(
                (child) =>
                    child.dataset?.composerElement === placement.id &&
                    !child.classList.contains("composer-cell"),
            );
            if (!card) {
                card = document.createElement("section");
                card.dataset.composerElement = placement.id;
                section.appendChild(card);
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
            const element = state.elements.find((e) => e.id === placement.id);
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
    function renderGridComposer() {
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
        if (!state.editing && isCompactComposer(state.contentGrid)) {
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
        const renderedElementIds = visiblePlacements.map((p) => p.id);
        for (const id of renderedElementIds) {
            const element = state.elements.find((entry) => entry.id === id);
            element?.onRender?.();
        }
        state.onRender?.();
    }
    function getEffectiveLayout() {
        const allIds = state.elements.map((e) => e.id);
        const pinnedIds = state.elements
            .filter((e) => e.pinned)
            .map((e) => e.id);
        const storedOrder = (state.layout?.order ?? []).filter((id) =>
            allIds.includes(id),
        );
        const storedHidden = state.layout?.hidden ?? null;
        const defaultHiddenIds = state.elements
            .filter(
                (e) =>
                    e.defaultHidden &&
                    !e.pinned &&
                    !storedOrder.includes(e.id) &&
                    !(storedHidden ?? []).includes(e.id),
            )
            .map((e) => e.id);
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
                const element = state.elements.find((e) => e.id === id);
                if (!element) return "";
                const dragAttrs = state.editing ? ` draggable="true"` : "";
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
                    element.id === state.activeSubPageId;
                const activeClass = isActive ? " active" : "";
                const hiddenAttr =
                    state.subPageNavigation && !isActive ? " hidden" : "";
                if (element.subComposerOptions) {
                    const headingHtml = element.subComposerOptions.heading
                        ? `<h2 class="sub-composer-heading">${escapeHtml(element.subComposerOptions.heading)}</h2>`
                        : "";
                    return `<div class="content-section${activeClass}"${hiddenAttr} id="${element.id}">${headingHtml}<div class="sub-composer-inner"></div></div>`;
                }
                return `<div class="content-section${activeClass}"${hiddenAttr} id="${element.id}"><section class="widget-card${editingClass}" data-composer-element="${element.id}"${dragAttrs}>${dragHandle}${focusButton}${element.render()}</section></div>`;
            })
            .join("");
    }
    function renderLibraryPanel(effectiveLayout) {
        const hiddenElements = state.elements.filter((e) =>
            effectiveLayout.hidden.includes(e.id),
        );
        const listItems = hiddenElements
            .map(
                (el) => `<li class="composer-library-item">
           <span>${el.label}</span>
           <button class="composer-add-btn" data-composer-add="${el.id}" type="button">${i18n.t("ui.reuse.add")}</button>
         </li>`,
            )
            .join("");
        const emptyMsg = !hiddenElements.length
            ? `<li class="composer-library-empty">${i18n.t("ui.reuse.all_elements_visible")}</li>`
            : "";
        return `
      <aside class="composer-library">
        <div class="composer-library-header">
          <h3>${i18n.t("ui.reuse.elements")}</h3>
        </div>
        <ul class="composer-library-list">${listItems}${emptyMsg}</ul>
      </aside>
    `;
    }
    function renderSubPageComposer() {
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
        bindSubPageComposerEvents();
        syncEditToggle();
        for (const id of effectiveLayout.order) {
            if (effectiveLayout.hidden.includes(id)) continue;
            const element = state.elements.find((entry) => entry.id === id);
            element?.onRender?.();
        }
        state.onRender?.();
        const activeEl = state.elements.find(
            (e) => e.id === state.activeSubPageId,
        );
        if (activeEl?.subComposerOptions) {
            const outerDiv = state.contentGrid.querySelector(
                `#${state.activeSubPageId}`,
            );
            const sectionDiv =
                outerDiv?.querySelector(".sub-composer-inner") ??
                outerDiv ??
                state.contentGrid;
            mountSubComposer(activeEl, sectionDiv).catch(() => {});
        }
    }
    function bindSubPageComposerEvents() {
        state.contentGrid
            .querySelectorAll("[data-composer-remove]")
            .forEach((btn) => {
                btn.addEventListener("click", () => {
                    const id = btn.dataset.composerRemove;
                    const effective = getEffectiveLayout();
                    state.layout = {
                        order: effective.order,
                        hidden: [...effective.hidden, id],
                    };
                    renderSubPageComposer();
                });
            });
        state.contentGrid
            .querySelectorAll("[data-composer-add]")
            .forEach((btn) => {
                btn.addEventListener("click", () => {
                    const id = btn.dataset.composerAdd;
                    const effective = getEffectiveLayout();
                    state.layout = {
                        order: effective.order,
                        hidden: effective.hidden.filter((h) => h !== id),
                    };
                    renderSubPageComposer();
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
                        .forEach((el) => {
                            el.classList.remove("composer-drag-over");
                        });
                    state.dragSourceId = null;
                });

                card.addEventListener("dragover", (event) => {
                    event.preventDefault();
                    event.dataTransfer.dropEffect = "move";
                    if (card.dataset.composerElement !== state.dragSourceId) {
                        state.contentGrid
                            .querySelectorAll(".composer-drag-over")
                            .forEach((el) => {
                                el.classList.remove("composer-drag-over");
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
                    const sourceIdx = visibleOrder.indexOf(state.dragSourceId);
                    const targetIdx = visibleOrder.indexOf(targetId);
                    if (sourceIdx === -1 || targetIdx === -1) return;

                    visibleOrder.splice(sourceIdx, 1);
                    // Removing source shifts all subsequent indices by -1; adjust targetIdx when source precedes target.
                    const insertIdx =
                        sourceIdx < targetIdx ? targetIdx - 1 : targetIdx;
                    visibleOrder.splice(insertIdx, 0, state.dragSourceId);

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
                    renderSubPageComposer();
                });
            });
    }

    function render() {
        if (!state.contentGrid) return;
        if (state.subPageNavigation) {
            renderSubPageComposer();
        } else {
            renderGridComposer();
        }
    }

    return {
        refreshElements,
        render,
        renderGridComposer,
        computeSubViewPlacements,
        syncLayoutToCurrentGridColumns,
        syncSubLayoutToCurrentGridColumns,
    };
}
