/** Sub-composer panel helpers for nested composer edit mode.
 * Export: createSubComposerPanelHandlers(deps). @param {object} deps @returns {object}
 */
import { halfGrid, snapGridFloor } from "./grid-math.js";

export function createSubComposerPanelHandlers({
    i18n,
    UNIT,
    getGridSize,
    getSubPanelId,
    getComposerPanelSafeTop,
    clampComposerPanelLeft,
    getComposerPanelHorizontalBounds,
    canSubPlace,
    compactSubPlacements,
    endEditMode,
    saveLayoutFor,
    initializeSubPlacements,
    renderSubGrid,
}) {
    function bindSubPanelItemDrag(item, el, state) {
        item.addEventListener("pointerdown", (e) => {
            if (e.button !== 0) return;
            e.preventDefault();
            item.setPointerCapture(e.pointerId);

            const gridSize = getGridSize(el);
            const w =
                gridSize.fullWidth || gridSize.fillWidth
                    ? state.gridCols
                    : gridSize.halfWidth
                      ? Math.max(gridSize.min[0], halfGrid(state.gridCols))
                      : Math.min(gridSize.default[0], state.gridCols);
            const h = gridSize.fillHeight
                ? state.gridRows
                : gridSize.halfHeight
                  ? Math.max(gridSize.min[1], halfGrid(state.gridRows))
                  : gridSize.default[1];

            let shade = null;
            let currentCol = -1;
            let currentRow = -1;
            let overGrid = false;

            function onMove(e) {
                const gridRect = state.container.getBoundingClientRect();
                const x = e.clientX - gridRect.left;
                const y = e.clientY - gridRect.top;
                const inGrid = x >= 0 && x <= gridRect.width && y >= 0;

                if (inGrid) {
                    if (!shade) {
                        shade = document.createElement("div");
                        shade.className = "composer-shade";
                        shade.style.width = `${w * UNIT}px`;
                        shade.style.height = `${h * UNIT}px`;
                        state.container.appendChild(shade);
                    }
                    const col = Math.max(
                        0,
                        Math.min(
                            state.gridCols - w,
                            snapGridFloor(x, state.gridCols),
                        ),
                    );
                    const row = Math.max(0, snapGridFloor(y, state.gridRows));
                    currentCol = col;
                    currentRow = row;
                    shade.style.left = `${col * UNIT}px`;
                    shade.style.top = `${row * UNIT}px`;
                    shade.classList.toggle(
                        "composer-shade--invalid",
                        !canSubPlace(state, col, row, w, h, null),
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

            function onUp() {
                item.removeEventListener("pointermove", onMove);
                item.removeEventListener("pointerup", onUp);
                item.removeEventListener("pointercancel", onUp);
                if (shade) shade.remove();
                if (
                    overGrid &&
                    canSubPlace(state, currentCol, currentRow, w, h, null)
                ) {
                    state.layout.hidden = state.layout.hidden.filter(
                        (id) => id !== el.id,
                    );
                    state.layout.placements.push({
                        id: el.id,
                        col: currentCol,
                        row: currentRow,
                        w,
                        h,
                    });
                    renderSubGrid(state);
                }
            }

            item.addEventListener("pointermove", onMove);
            item.addEventListener("pointerup", onUp);
            item.addEventListener("pointercancel", onUp);
        });
    }

    function createSubElementsPanel(state) {
        const panelId = getSubPanelId(state.preferenceKey);
        const hiddenElements = state.elements.filter((e) =>
            state.layout.hidden.includes(e.id),
        );

        const panel = document.createElement("div");
        panel.id = panelId;
        panel.className = "composer-panel";

        let listHtml;
        if (hiddenElements.length === 0) {
            listHtml = `<li class="composer-library-empty">${i18n.t("ui.reuse.all_elements_visible")}</li>`;
        } else {
            listHtml = hiddenElements
                .map(
                    (el) =>
                        `<li class="composer-library-item" data-composer-panel-item="${el.id}"><span>${el.label}</span></li>`,
                )
                .join("");
        }

        panel.innerHTML = `
      <div id="${panelId}-drag-handle" class="composer-panel-header">
        <span class="composer-panel-title">${i18n.t("ui.reuse.elements")}</span>
        <button class="composer-panel-minimize-btn" type="button">−</button>
      </div>
      <div class="composer-panel-body">
        <ul class="composer-library-list">${listHtml}</ul>
      </div>
      <div class="composer-panel-actions">
        <a href="#" class="composer-discard-btn btn-cancel btn-animated" role="button">${i18n.t("ui.reuse.discard")}</a>
        <a href="#" class="composer-done-btn btn-confirm btn-animated" role="button">${i18n.t("ui.reuse.done")}</a>
        <a href="#" class="composer-reset-btn btn-neutral btn-animated" role="button">↺ ${i18n.t("ui.reuse.reset_layout")}</a>
      </div>
    `;

        const safeTop = getComposerPanelSafeTop();
        if (state.panelPosition !== null) {
            panel.style.top = `${Math.max(safeTop, state.panelPosition.top)}px`;
            panel.style.left = `${clampComposerPanelLeft(state.panelPosition.left, 240)}px`;
            panel.style.right = "auto";
        } else {
            const gridRect = state.container.getBoundingClientRect();
            const panelLeft = clampComposerPanelLeft(gridRect.right + 12, 240);
            const panelTop = gridRect.top;
            panel.style.top = `${Math.max(safeTop, panelTop)}px`;
            panel.style.left = `${panelLeft}px`;
            panel.style.right = "auto";
        }

        document.body.appendChild(panel);

        const dragHandle = panel.querySelector(`#${panelId}-drag-handle`);
        if (dragHandle) {
            dragHandle.addEventListener("pointerdown", (e) => {
                if (e.button !== 0) return;
                if (e.target.closest("button")) return;
                e.preventDefault();
                dragHandle.setPointerCapture(e.pointerId);
                const startX = e.clientX - panel.offsetLeft;
                const startY = e.clientY - panel.offsetTop;
                function onMove(e) {
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
                        Math.min(maxLeft, e.clientX - startX),
                    );
                    const newTop = Math.max(
                        minTop,
                        Math.min(maxTop, e.clientY - startY),
                    );
                    panel.style.left = `${newLeft}px`;
                    panel.style.top = `${newTop}px`;
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
            });

        panel
            .querySelector(".composer-done-btn")
            .addEventListener("click", async (event) => {
                event.preventDefault();
                compactSubPlacements(state);
                state.editing = false;
                endEditMode();
                state.layoutProfiles = await saveLayoutFor(
                    state.preferenceKey,
                    state.layoutProfiles,
                    state.gridCols,
                    state.layout,
                );
                renderSubGrid(state);
            });

        panel
            .querySelector(".composer-discard-btn")
            .addEventListener("click", (event) => {
                event.preventDefault();
                state.layout = state.layoutSnapshot;
                state.editing = false;
                endEditMode();
                renderSubGrid(state);
            });

        panel
            .querySelector(".composer-reset-btn")
            .addEventListener("click", async (event) => {
                event.preventDefault();
                state.layout = { placements: [], hidden: [] };
                initializeSubPlacements(state);
                state.layoutSnapshot = JSON.parse(JSON.stringify(state.layout));
                state.layoutProfiles = await saveLayoutFor(
                    state.preferenceKey,
                    state.layoutProfiles,
                    state.gridCols,
                    state.layout,
                );
                renderSubGrid(state);
            });

        panel.querySelectorAll("[data-composer-panel-item]").forEach((item) => {
            const elId = item.dataset.composerPanelItem;
            const element = state.elements.find((e) => e.id === elId);
            if (element) bindSubPanelItemDrag(item, element, state);
        });
    }

    return { createSubElementsPanel };
}
