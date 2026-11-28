/**
 * Builds the nested composer's element library and save/discard/reset panel.
 *
 * Public exports:
 *   createNestedComposerPanelHandlers(deps) — creates the panel renderer for nested editor states.
 *
 * Usage:
 *   const panels = createNestedComposerPanelHandlers(dependencies);
 *   panels.createSubElementsPanel(state); // state identifies the active nested grid.
 *
 * @param {object} deps Injected sizing, placement, panel bounds, rendering and editing callbacks.
 * @returns {{createSubElementsPanel: function(object): void}} Panel creation for a nested state; the owner removes the panel on unmount.
 */
import { snapDragPlacement } from "./drag-placement.js";
import { commitLayoutEdit, stageLayoutReset } from "./layout-save.js";
import { bindComposerPointerDrag } from "./pointer-drag.js";

import { halfGrid, snapGridFloor } from "./grid-math.js";

import { resolveInitialGridWidth } from "./grid-sizing.js";
import { fitComposerPanel } from "./responsive-layout.js";
function createNestedComposerPanelHandlers({
    i18n,
    UNIT,
    getGridSize,
    getSubPanelId: getNestedPanelId,
    getComposerPanelSafeTop,
    clampComposerPanelLeft,
    getComposerPanelHorizontalBounds,
    canSubPlace: canNestedPlace,
    endEditMode,
    saveLayout,
    initializeSubPlacements: initializeNestedPlacements,
    renderSubGrid: renderNestedGrid,
}) {
    function bindNestedPanelItemDrag(item, elementDefinition, state) {
        item.addEventListener("pointerdown", (event) => {
            if (event.button !== 0 || event.target.closest("button")) return;
            event.preventDefault();

            const gridSize = getGridSize(elementDefinition);
            const width = resolveInitialGridWidth(gridSize, state.gridColumns);
            const height = gridSize.fillHeight
                ? state.gridRows
                : gridSize.halfHeight
                  ? Math.max(gridSize.min[1], halfGrid(state.gridRows))
                  : gridSize.default[1];

            let shade = null;
            let currentColumn = -1;
            let currentRow = -1;
            let overGrid = false;

            function onMove(moveEvent) {
                const gridRectangle = state.container.getBoundingClientRect();
                const horizontalCoordinate =
                    moveEvent.clientX - gridRectangle.left;
                const verticalCoordinate =
                    moveEvent.clientY - gridRectangle.top;
                const inGrid =
                    horizontalCoordinate >= 0 &&
                    horizontalCoordinate <= gridRectangle.width &&
                    verticalCoordinate >= 0;

                if (inGrid) {
                    if (!shade) {
                        shade = document.createElement("div");
                        shade.className = "composer-shade";
                        shade.style.width = `${width * state.gridTrackSize}px`;
                        shade.style.height = `${height * UNIT}px`;
                        state.container.appendChild(shade);
                    }
                    const column = Math.max(
                        0,
                        Math.min(
                            state.gridColumns - width,
                            snapGridFloor(
                                horizontalCoordinate,
                                state.gridColumns,
                                state.gridTrackSize,
                            ),
                        ),
                    );
                    const row = Math.max(
                        0,
                        snapGridFloor(verticalCoordinate, state.gridRows),
                    );
                    const target = snapDragPlacement(
                        { id: null, col: column, row, w: width, h: height },
                        state.gridRows,
                        (...argumentsList) =>
                            canNestedPlace(state, ...argumentsList),
                    );
                    currentColumn = column;
                    currentRow = target.row;
                    shade.classList.toggle(
                        "composer-shade--snapped",
                        target.row !== row,
                    );
                    shade.style.left = `${column * state.gridTrackSize}px`;
                    shade.style.top = `${currentRow * UNIT}px`;
                    shade.classList.toggle(
                        "composer-shade--invalid",
                        !canNestedPlace(
                            state,
                            column,
                            currentRow,
                            width,
                            height,
                            null,
                        ),
                    );
                    overGrid = true;
                } else {
                    if (shade) {
                        shade.remove();
                        shade = null;
                    }
                    overGrid = false;
                }
            }

            function onUp(event) {
                if (shade) shade.remove();
                if (event.type === "pointercancel") return;
                if (
                    overGrid &&
                    canNestedPlace(
                        state,
                        currentColumn,
                        currentRow,
                        width,
                        height,
                        null,
                    )
                ) {
                    state.layout.hidden = state.layout.hidden.filter(
                        (id) => id !== elementDefinition.id,
                    );
                    state.layout.placements.push({
                        id: elementDefinition.id,
                        col: currentColumn,
                        row: currentRow,
                        w: width,
                        h: height,
                    });
                    renderNestedGrid(state);
                }
            }

            bindComposerPointerDrag(item, event, onMove, onUp, state.container);
        });
    }

    function createNestedElementsPanel(state) {
        const panelId = getNestedPanelId(state.preferenceKey);
        const hiddenElements = state.elements.filter((candidateElement) =>
            state.layout.hidden.includes(candidateElement.id),
        );

        const panel = document.createElement("div");
        panel.id = panelId;
        panel.className = "composer-panel";
        panel.inert = state.saving === true;

        let listHtml;
        if (hiddenElements.length === 0) {
            listHtml = `<li class="composer-library-empty">${i18n.t("ui.reuse.all_elements_visible")}</li>`;
        } else {
            listHtml = hiddenElements
                .map(
                    (elementDefinition) =>
                        `<li class="composer-library-item" data-composer-panel-item="${elementDefinition.id}"><span>${elementDefinition.label}</span><button type="button" class="composer-add-btn btn-confirm">${i18n.t("ui.reuse.add")}</button></li>`,
                )
                .join("");
        }

        panel.innerHTML = `
      <div id="${panelId}-drag-handle" class="composer-panel-header">
        <span class="composer-panel-title">${i18n.t("ui.reuse.elements")}</span>
        <button aria-label="${i18n.t("ui.reuse.elements")}" aria-expanded="true" class="composer-panel-minimize-btn" type="button">−</button>
      </div>
      <div class="composer-panel-body">
        <ul class="composer-library-list">${listHtml}</ul>
      </div>
      <div class="composer-panel-actions">
        <div class="composer-panel-decisions">
          <a href="#" class="composer-discard-btn btn-cancel btn-animated" role="button">${i18n.t("ui.reuse.discard")}</a>
          <a href="#" class="composer-done-btn btn-confirm btn-animated" role="button">${i18n.t("ui.reuse.done")}</a>
        </div>
        <a href="#" class="composer-reset-btn btn-neutral btn-animated" role="button">↺ ${i18n.t("ui.reuse.reset_layout")}</a>
      </div>
    `;

        state.elementsPanel = panel;
        document.body.appendChild(panel);
        const panelWidth = panel.getBoundingClientRect().width;
        const safeTop = getComposerPanelSafeTop();
        if (state.panelPosition !== null) {
            panel.style.top = `${Math.max(safeTop, state.panelPosition.top)}px`;
            panel.style.left = `${clampComposerPanelLeft(state.panelPosition.left, panelWidth)}px`;
            panel.style.right = "auto";
        } else {
            const gridRectangle = state.container.getBoundingClientRect();
            const panelLeft = clampComposerPanelLeft(
                gridRectangle.right + 12,
                panelWidth,
            );
            const panelTop = gridRectangle.top;
            panel.style.top = `${Math.max(safeTop, panelTop)}px`;
            panel.style.left = `${panelLeft}px`;
            panel.style.right = "auto";
        }

        fitComposerPanel(panel);

        const dragHandle = panel.querySelector(`#${panelId}-drag-handle`);
        if (dragHandle) {
            dragHandle.addEventListener("pointerdown", (event) => {
                if (event.button !== 0) return;
                if (event.target.closest("button")) return;
                event.preventDefault();
                dragHandle.setPointerCapture(event.pointerId);
                const startX = event.clientX - panel.offsetLeft;
                const startY = event.clientY - panel.offsetTop;
                function onMove(moveEvent) {
                    const bounds = getComposerPanelHorizontalBounds(
                        panel.offsetWidth,
                    );
                    const maxLeft = bounds.maxLeft;
                    const minLeft = bounds.minLeft;
                    const minTop = getComposerPanelSafeTop();
                    const maxTop = Math.max(
                        minTop,
                        window.innerHeight - panel.offsetHeight - 4,
                    );
                    const newLeft = Math.max(
                        minLeft,
                        Math.min(maxLeft, moveEvent.clientX - startX),
                    );
                    const newTop = Math.max(
                        minTop,
                        Math.min(maxTop, moveEvent.clientY - startY),
                    );
                    panel.style.left = `${newLeft}px`;
                    panel.style.top = `${newTop}px`;
                    fitComposerPanel(panel);
                    state.panelPosition = { top: newTop, left: newLeft };
                }
                function onUp() {
                    dragHandle.removeEventListener("pointermove", onMove);
                    dragHandle.removeEventListener("pointerup", onUp);
                    dragHandle.removeEventListener("pointercancel", onUp);
                }
                dragHandle.addEventListener("pointermove", onMove);
                dragHandle.addEventListener("pointerup", onUp);
                dragHandle.addEventListener("pointercancel", onUp);
            });
        }

        panel
            .querySelector(".composer-panel-minimize-btn")
            .addEventListener("click", () => {
                const minimized = panel.classList.toggle(
                    "composer-panel--minimized",
                );
                panel.querySelector(
                    ".composer-panel-minimize-btn",
                ).textContent = minimized ? "+" : "−";
                panel
                    .querySelector(".composer-panel-minimize-btn")
                    .setAttribute("aria-expanded", String(!minimized));
                fitComposerPanel(panel);
            });

        panel
            .querySelector(".composer-done-btn")
            .addEventListener("click", async (event) => {
                event.preventDefault();
                await commitLayoutEdit({
                    state,
                    save: () => saveLayout(state),
                    finish: endEditMode,
                    render: () => renderNestedGrid(state),
                });
            });

        panel
            .querySelector(".composer-discard-btn")
            .addEventListener("click", (event) => {
                event.preventDefault();
                state.layout = state.layoutSnapshot;
                state.editing = false;
                endEditMode();
                renderNestedGrid(state);
            });

        panel
            .querySelector(".composer-reset-btn")
            .addEventListener("click", (event) => {
                event.preventDefault();
                stageLayoutReset({
                    state,
                    initialize: () => initializeNestedPlacements(state),
                    render: () => renderNestedGrid(state),
                });
            });

        panel.querySelectorAll("[data-composer-panel-item]").forEach((item) => {
            const elementId = item.dataset.composerPanelItem;
            const element = state.elements.find(
                (candidateElement) => candidateElement.id === elementId,
            );
            if (element) bindNestedPanelItemDrag(item, element, state);
            item.querySelector(".composer-add-btn")?.addEventListener(
                "click",
                () => {
                    state.layout.hidden = state.layout.hidden.filter(
                        (id) => id !== elementId,
                    );
                    initializeNestedPlacements(state, { reveal: [elementId] });
                    renderNestedGrid(state);
                },
            );
        });
    }

    return { createSubElementsPanel: createNestedElementsPanel };
}
export { createNestedComposerPanelHandlers };
