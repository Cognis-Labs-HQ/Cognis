/**
 * Renders and positions the composer element panel and its save/discard actions.
 * Exports createEditorPanelHandlers for one main composer instance.
 * @example const panel = createEditorPanelHandlers(dependencies); panel.createElementsPanel();
 * @param {object} dependencies Composer state, rendering and persistence callbacks.
 * @returns {object} Panel creation and positioning operations.
 */
import { fitComposerPanel } from "./responsive-layout.js";
export function createEditorPanelHandlers({
    state,
    i18n,
    bindPanelItemDrag,
    compactPlacements,
    endEditMode,
    saveLayout,
    renderGridComposer,
    initializePlacements,
}) {
    function bindPanelDrag(panel) {
        const handle = panel.querySelector("#composer-panel-drag-handle");
        if (!handle) return;
        handle.addEventListener("pointerdown", (e) => {
            if (e.button !== 0) return;
            if (e.target.closest("button")) return;
            e.preventDefault();
            handle.setPointerCapture(e.pointerId);
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
                fitComposerPanel(panel);
                state.panelPosition = { top: newTop, left: newLeft };
            }
            function onUp() {
                handle.removeEventListener("pointermove", onMove);
                handle.removeEventListener("pointerup", onUp);
                handle.removeEventListener("pointercancel", onUp);
            }
            handle.addEventListener("pointermove", onMove);
            handle.addEventListener("pointerup", onUp);
            handle.addEventListener("pointercancel", onUp);
        });
    }
    function getComposerPanelSafeTop() {
        const navRowBottom =
            state.root.querySelector(".global-navrow")?.getBoundingClientRect()
                ?.bottom ?? 0;
        const topbarBottom =
            state.root.querySelector(".global-topbar")?.getBoundingClientRect()
                ?.bottom ?? 0;
        return Math.max(
            12,
            Math.ceil(Math.max(navRowBottom, topbarBottom) + 12),
        );
    }
    /**
     * Calculates the horizontal drag/placement bounds for the floating composer
     * panel, preferring workspace bounds when available and falling back to the
     * viewport when workspace metrics are unavailable.
     *
     * @param {number} panelWidth
     * @returns {{ minLeft: number, maxLeft: number }}
     */
    function getComposerPanelHorizontalBounds(panelWidth) {
        const workspaceRect = state.root
            .querySelector(".workspace")
            ?.getBoundingClientRect();
        const inset = 12;
        if (workspaceRect) {
            const minLeft = Math.ceil(workspaceRect.left + inset);
            const maxLeft = Math.floor(
                workspaceRect.right - panelWidth - inset,
            );
            if (maxLeft >= minLeft) {
                return { minLeft, maxLeft };
            }
        }
        return {
            minLeft: 4,
            maxLeft: Math.max(4, window.innerWidth - panelWidth - 4),
        };
    }
    function clampComposerPanelLeft(nextLeft, panelWidth) {
        const bounds = getComposerPanelHorizontalBounds(panelWidth);
        return Math.max(bounds.minLeft, Math.min(bounds.maxLeft, nextLeft));
    }

    function createElementsPanel() {
        const hiddenElements = state.elements.filter((e) =>
            state.layout.hidden.includes(e.id),
        );

        const panel = document.createElement("div");
        panel.id = "composer-elements-panel";
        panel.className = "composer-panel";

        let listHtml;
        if (hiddenElements.length === 0) {
            listHtml = `<li class="composer-library-empty">${i18n.t("ui.reuse.all_elements_visible")}</li>`;
        } else {
            listHtml = hiddenElements
                .map(
                    (el) =>
                        `<li class="composer-library-item" data-composer-panel-item="${el.id}"><span>${el.label}</span><button type="button" class="composer-add-btn btn-confirm">${i18n.t("ui.reuse.add")}</button></li>`,
                )
                .join("");
        }

        panel.innerHTML = `
      <div id="composer-panel-drag-handle" class="composer-panel-header">
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
            const gridRect = state.contentGrid.getBoundingClientRect();
            const panelLeft = clampComposerPanelLeft(gridRect.right + 12, 240);
            const panelTop = gridRect.top;
            panel.style.top = `${Math.max(safeTop, panelTop)}px`;
            panel.style.left = `${panelLeft}px`;
            panel.style.right = "auto";
        }
        state.elementsPanel = panel;
        document.body.appendChild(panel);
        fitComposerPanel(panel);
        bindPanelDrag(panel);

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
                compactPlacements();
                state.editing = false;
                endEditMode();
                await saveLayout();
                renderGridComposer();
            });

        panel
            .querySelector(".composer-discard-btn")
            .addEventListener("click", (event) => {
                event.preventDefault();
                state.layout = state.layoutSnapshot;
                state.editing = false;
                endEditMode();
                renderGridComposer();
            });

        panel
            .querySelector(".composer-reset-btn")
            .addEventListener("click", async (event) => {
                event.preventDefault();
                state.layout = { placements: [], hidden: [] };
                initializePlacements();
                state.layoutSnapshot = JSON.parse(JSON.stringify(state.layout));
                await saveLayout();
                renderGridComposer();
            });

        panel.querySelectorAll("[data-composer-panel-item]").forEach((item) => {
            const elId = item.dataset.composerPanelItem;
            const element = state.elements.find((e) => e.id === elId);
            if (element) bindPanelItemDrag(item, element);
            item.querySelector(".composer-add-btn")?.addEventListener(
                "click",
                () => {
                    state.layout.hidden = state.layout.hidden.filter(
                        (id) => id !== elId,
                    );
                    initializePlacements({ reveal: [elId] });
                    renderGridComposer();
                },
            );
        });
    }

    return {
        destroy: () => state.elementsPanel?.remove(),
        createElementsPanel,
        getComposerPanelSafeTop,
        getComposerPanelHorizontalBounds,
        clampComposerPanelLeft,
    };
}
