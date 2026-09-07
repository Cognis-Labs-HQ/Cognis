/**
 * Page composer orchestration.
 * Export: createPageComposer(root, options).
 * Usage: const composer = createPageComposer(root, { allowCustomization: true, elements, preferenceKey, i18n }); await composer.init();
 * Supports grid and sub-page layouts, persistence, and nested composers.
 * @param {HTMLElement} root - The #app root element for the page.
 * @param {{
 *   allowCustomization: boolean,
 *   elements: Array<{
 *     id: string, label: string, render: () => string,
 *     onRender?: () => void, onUnmount?: () => void,
 *     pinned?: boolean,
 *     gridSize?: { default: [number, number], min: [number, number], max?: [number, number] | 'full' | 'half' | ['half'|number, 'half'|number] },
 *   }>,
 *   preferenceKey: string,
 *   i18n: object,
 *   onRender?: () => void,
 *   pageContext?: { title: string, subtitle: string },
 *   toolbar?: Array<{ id: string, label: string, render: () => string }>,
 *   toolbarScrollable?: boolean, contentScrolling?: boolean, enableDomParking?: boolean,
 *   subNavigation?: Array<{ id: string, label: string, render: () => string }>,
 *   floatingMenu?: Array<{ id: string, label: string, render: () => string }>,
 *   subPageNavigation?: boolean, columns?: number,
 *   showTopbar?: boolean, showNavbar?: boolean, showThemeToggle?: boolean, showFooter?: boolean,
 *   persistLayoutPreferences?: boolean,
 *   pageOverrides?: Record<string, { showThemeToggle?: boolean }>,
 *   onBeforeSubPageSwitch?: (fromId: string|null, toId: string) => Promise<boolean>,
 *   requireAccountSession?: boolean,
 *   presenceTracker?: { enabled?: boolean, endpoint: string, pageId: string | (() => string) },
 *   pageManifest?: { features?: { pointerTracking?: boolean } },
 *   signal?: AbortSignal,
 * }} options
 * @returns {{ init(): Promise<void>, refresh(elements: Array): void, refreshElements(elementIds: string[]): void, getFloatingSlot(id: string): HTMLElement|null, showToast(message: string, options?: object): () => void }}
 */
import { apiFetch, configureConnectionRecoveryPrompt } from "../api-client.js";
import { renderDashboardLayout } from "../../layouts/dashboard-layout.js";
import { prefersReducedMotion } from "../motion.js";
import { showToast, configureToastDismissLabel } from "../toast.js";
import { createFormDraftManager } from "./form-draft.js";
import { createLayoutPersistence } from "./layout-persistence.js";
import { createGridOverlayHandlers } from "./grid-overlay.js";
import { createSubComposerHandlers } from "./sub-composer.js";
import { uiCtx } from "../ui-ctx.js";
import { createComposerRenderer } from "./composer-render.js";
import { PAGE_COMPOSER_GRID_UNIT } from "./grid-math.js";
import {
    resolveElementGridSize,
    resolveGridColumnCount,
} from "./grid-sizing.js";
import { createPresenceTracker } from "./presence-tracker.js";
import { pageActions } from "../page-actions.js";
import { createFocusControlCoordinator } from "../focus-control.js";
import {
    getFloatingSlot as findFloatingSlot,
    restoreWindowScrollPosition,
} from "./dom-position.js";
import { renderToolbarToggleIcon } from "./toolbar-icons.js";

export function createPageComposer(
    root,
    {
        allowCustomization,
        elements: initialElements,
        preferenceKey,
        i18n,
        onRender,
        pageContext,
        toolbar = [],
        toolbarScrollable = false,
        contentScrolling = true,
        enableDomParking = false,
        subNavigation = [],
        floatingMenu = [],
        subPageNavigation = false,
        columns = 1,
        showTopbar = true,
        showNavbar = true,
        showThemeToggle = true,
        showFooter = true,
        frameless = false,
        persistLayoutPreferences = true,
        pageOverrides = {},
        onBeforeSubPageSwitch,
        requireAccountSession = showTopbar || showNavbar,
        enableAccountEnhancements = true,
        presenceTracker = null,
        pageManifest = null,
        signal,
    },
) {
    function escapeHtml(value) {
        return String(value)
            .replaceAll("&", "&amp;")
            .replaceAll("<", "&lt;")
            .replaceAll(">", "&gt;");
    }

    let elements = initialElements;
    let layout = null;
    let editing = false;
    let dragSourceId = null;
    let contentGrid = null;
    let activeSubPageId = null;
    let panelPosition = null;
    let layoutSnapshot = null;
    let gridCols = 1;
    let gridRows = 6;
    let resizeObserver = null;
    let lastObservedCols = 0;
    let gridSection = null;
    let editToggleAbortController = null;
    let composerEditToggleButton = null;
    let layoutProfiles = { layoutsByGrid: {} };
    let activePresenceTracker = null;
    let composerDestroyed = false;
    let focusControl = null;

    function destroy() {
        if (composerDestroyed) return;
        composerDestroyed = true;
        activePresenceTracker?.destroy();
        activePresenceTracker = null;
        resizeObserver?.disconnect();
        resizeObserver = null;
        focusControl?.destroy();
        focusControl = null;
    }

    if (signal?.aborted) destroy();
    else signal?.addEventListener("abort", destroy, { once: true });

    const UNIT = PAGE_COMPOSER_GRID_UNIT; // grid cell size in pixels
    const MOBILE_TOOLBAR_BREAKPOINT = 900;
    const MOBILE_LAYOUT_WIDTH_RECLAIM_BREAKPOINT = 640;
    // Treat narrow grids as compact so single-pane rows expand and avoid
    // visibly wasted horizontal space on small screens.
    const COMPACT_SINGLE_ROW_FULL_WIDTH_MAX_COLS = 10;
    const FORM_DRAFT_STORAGE_PREFIX = "cognis_form_draft";
    const LARGE_FORM_RESET_FIELD_THRESHOLD = 6;

    function handleBeforeUnload(e) {
        e.preventDefault();
        e.returnValue = "";
    }

    let activeEdits = 0;

    function beginEditMode() {
        activeEdits++;
        if (activeEdits === 1) {
            window.addEventListener("beforeunload", handleBeforeUnload);
        }
    }

    function endEditMode() {
        activeEdits = Math.max(0, activeEdits - 1);
        if (activeEdits === 0) {
            window.removeEventListener("beforeunload", handleBeforeUnload);
        }
    }
    const {
        getLayoutForGrid,
        loadLayoutByKey,
        saveLayoutByKey,
        cloneLayoutData,
    } = createLayoutPersistence({ apiFetch });

    const {
        captureFormState,
        restoreFormState,
        mergeFormStateSnapshots,
        loadPersistedFormState,
        bindFormDraftPersistence,
    } = createFormDraftManager({
        FORM_DRAFT_STORAGE_PREFIX,
        LARGE_FORM_RESET_FIELD_THRESHOLD,
        i18n,
    });

    async function loadLayout() {
        const loaded = await loadLayoutByKey(preferenceKey, gridCols);
        layoutProfiles = loaded.profiles;
        return cloneLayoutData(loaded.layout);
    }

    function hasStoredLayoutProfiles() {
        return Object.keys(layoutProfiles?.layoutsByGrid ?? {}).length > 0;
    }

    async function saveLayout() {
        layoutProfiles = await saveLayoutByKey(
            preferenceKey,
            layoutProfiles,
            gridCols,
            layout,
        );
    }

    function applyLayoutForCurrentGridColumns() {
        const selected = getLayoutForGrid(layoutProfiles, gridCols);
        if (!selected.layout) return false;
        layout = cloneLayoutData(selected.layout);
        return true;
    }

    function applySubLayoutForCurrentGridColumns(state) {
        const selected = getLayoutForGrid(state.layoutProfiles, state.gridCols);
        if (!selected.layout) return false;
        state.layout = cloneLayoutData(selected.layout);
        return true;
    }

    const getPreferredGridColumnCount = () =>
        resolveGridColumnCount({ contentGrid, root, unit: UNIT });
    const getGridSize = resolveElementGridSize;

    function getSubPanelId(preferenceKey) {
        return (
            "composer-elements-panel-" +
            preferenceKey.replace(/[^a-z0-9]/g, "-")
        );
    }

    const composerState = {
        root,
        allowCustomization,
        frameless,
        preferenceKey,
        persistLayoutPreferences,
        subPageNavigation,
        onRender,
        get elements() {
            return elements;
        },
        set elements(value) {
            elements = value;
        },
        get layout() {
            return layout;
        },
        set layout(value) {
            layout = value;
        },
        get editing() {
            return editing;
        },
        set editing(value) {
            editing = value;
        },
        get dragSourceId() {
            return dragSourceId;
        },
        set dragSourceId(value) {
            dragSourceId = value;
        },
        get contentGrid() {
            return contentGrid;
        },
        set contentGrid(value) {
            contentGrid = value;
        },
        get activeSubPageId() {
            return activeSubPageId;
        },
        set activeSubPageId(value) {
            activeSubPageId = value;
        },
        get panelPosition() {
            return panelPosition;
        },
        set panelPosition(value) {
            panelPosition = value;
        },
        get layoutSnapshot() {
            return layoutSnapshot;
        },
        set layoutSnapshot(value) {
            layoutSnapshot = value;
        },
        get gridCols() {
            return gridCols;
        },
        set gridCols(value) {
            gridCols = value;
        },
        get gridRows() {
            return gridRows;
        },
        set gridRows(value) {
            gridRows = value;
        },
        get gridSection() {
            return gridSection;
        },
        set gridSection(value) {
            gridSection = value;
        },
        enableDomParking,
    };

    let renderer;

    const gridOverlayHandlers = createGridOverlayHandlers({
        state: composerState,
        UNIT,
        i18n,
        escapeHtml,
        getGridSize,
        renderGridComposer: () => renderer.renderGridComposer(),
        saveLayout,
        endEditMode,
    });

    const subComposerHandlers = createSubComposerHandlers({
        i18n,
        UNIT,
        beginEditMode,
        endEditMode,
        getGridSize,
        getSubPanelId,
        getComposerPanelSafeTop: gridOverlayHandlers.getComposerPanelSafeTop,
        clampComposerPanelLeft: gridOverlayHandlers.clampComposerPanelLeft,
        getComposerPanelHorizontalBounds:
            gridOverlayHandlers.getComposerPanelHorizontalBounds,
        buildDropZoneLine: gridOverlayHandlers.buildDropZoneLine,
        loadLayoutFor: loadLayoutByKey,
        saveLayoutFor: saveLayoutByKey,
        cloneLayoutData,
        captureFormState,
        restoreFormState,
        mergeFormStateSnapshots,
        loadPersistedFormState,
        bindFormDraftPersistence,
        computeSubViewPlacements: (subState) =>
            renderer.computeSubViewPlacements(subState),
        syncSubEditToggle,
        applySubLayoutForCurrentGridColumns,
    });

    renderer = createComposerRenderer({
        state: composerState,
        UNIT,
        MOBILE_LAYOUT_WIDTH_RECLAIM_BREAKPOINT,
        COMPACT_SINGLE_ROW_FULL_WIDTH_MAX_COLS,
        i18n,
        escapeHtml,
        getGridSize,
        renderMissingElementContent:
            gridOverlayHandlers.renderMissingElementContent,
        createGridOverlay: gridOverlayHandlers.createGridOverlay,
        createCell: gridOverlayHandlers.createCell,
        createMissingCell: gridOverlayHandlers.createMissingCell,
        createElementsPanel: gridOverlayHandlers.createElementsPanel,
        computeGridDimensions: gridOverlayHandlers.computeGridDimensions,
        initializePlacements: gridOverlayHandlers.initializePlacements,
        applyLayoutForCurrentGridColumns,
        computeSubGridDimensions: subComposerHandlers.computeSubGridDimensions,
        initializeSubPlacements: subComposerHandlers.initializeSubPlacements,
        syncEditToggle,
        mountSubComposer: subComposerHandlers.mountSubComposer,
        unmountSubComposer: subComposerHandlers.unmountSubComposer,
        captureFormState,
        restoreFormState,
        mergeFormStateSnapshots,
        loadPersistedFormState,
        bindFormDraftPersistence,
    });

    const { compactPlacements } = gridOverlayHandlers;
    const {
        mountSubComposer,
        unmountSubComposer,
        renderSubGrid,
        compactSubPlacements,
    } = subComposerHandlers;
    const {
        render,
        renderGridComposer,
        syncLayoutToCurrentGridColumns,
        syncSubLayoutToCurrentGridColumns,
    } = renderer;

    function syncSubEditToggle(state) {
        const editBtn = getComposerEditToggleButton();
        if (!editBtn) return;
        if (uiCtx.capabilities.get("session:isGuest")?.() === true) {
            editBtn.remove();
            return;
        }
        if (!state.allowCustomization) {
            editBtn.hidden = true;
            return;
        }
        editBtn.hidden = false;
        state.editToggleAbortController?.abort();
        state.editToggleAbortController = new AbortController();
        const { signal } = state.editToggleAbortController;
        if (!state.editing) {
            editBtn.innerHTML =
                '<span class="composer-edit-icon" aria-hidden="true"></span>';
            editBtn.title = i18n.t("ui.reuse.edit_layout");
            editBtn.addEventListener(
                "click",
                () => {
                    syncSubLayoutToCurrentGridColumns(state);
                    state.layoutSnapshot = JSON.parse(
                        JSON.stringify(state.layout),
                    );
                    state.editing = true;
                    beginEditMode();
                    renderSubGrid(state);
                },
                { signal },
            );
        } else {
            editBtn.textContent = "✓";
            editBtn.title = i18n.t("ui.reuse.done");
            editBtn.addEventListener(
                "click",
                async () => {
                    compactSubPlacements(state);
                    state.editing = false;
                    endEditMode();
                    state.layoutProfiles = await saveLayoutByKey(
                        state.preferenceKey,
                        state.layoutProfiles,
                        state.gridCols,
                        state.layout,
                    );
                    renderSubGrid(state);
                },
                { signal },
            );
        }
    }

    function syncEditToggle() {
        const editBtn = getComposerEditToggleButton();
        if (!editBtn) return;
        if (uiCtx.capabilities.get("session:isGuest")?.() === true) {
            editBtn.remove();
            return;
        }
        if (!allowCustomization) {
            editBtn.hidden = true;
            return;
        }
        editBtn.hidden = false;
        editToggleAbortController?.abort();
        editToggleAbortController = new AbortController();
        const { signal } = editToggleAbortController;
        if (!editing) {
            editBtn.innerHTML =
                '<span class="composer-edit-icon" aria-hidden="true"></span>';
            editBtn.title = i18n.t("ui.reuse.edit_layout");
            editBtn.addEventListener(
                "click",
                () => {
                    syncLayoutToCurrentGridColumns();
                    layoutSnapshot = JSON.parse(JSON.stringify(layout));
                    editing = true;
                    beginEditMode();
                    render();
                },
                { signal },
            );
        } else {
            editBtn.textContent = "✓";
            editBtn.title = i18n.t("ui.reuse.done");
            editBtn.addEventListener(
                "click",
                async () => {
                    if (!subPageNavigation) {
                        compactPlacements();
                    }
                    editing = false;
                    endEditMode();
                    await saveLayout();
                    render();
                },
                { signal },
            );
        }
    }

    function getComposerEditToggleButton() {
        return composerEditToggleButton;
    }

    function applyPageOverrides(id) {
        const overrides = pageOverrides[id] ?? {};
        const effectiveShowThemeToggle =
            "showThemeToggle" in overrides
                ? overrides.showThemeToggle
                : showThemeToggle;
        const toggleEl = root.querySelector("#theme-toggle");
        if (toggleEl) toggleEl.hidden = !effectiveShowThemeToggle;
    }

    async function switchSubPage(id) {
        if (onBeforeSubPageSwitch) {
            const allowed = await onBeforeSubPageSwitch(activeSubPageId, id);
            if (!allowed) return false;
        }
        const prevId = activeSubPageId;
        activeSubPageId = id;
        const panel =
            contentGrid.querySelector(".content-panel") ?? contentGrid;
        panel.querySelectorAll(".content-section").forEach((section) => {
            const isActive = section.id === activeSubPageId;
            section.hidden = !isActive;
            section.classList.toggle("active", isActive);
        });
        root.querySelectorAll("[data-composer-scroll]").forEach((btn) => {
            btn.classList.toggle(
                "active",
                btn.dataset.composerScroll === activeSubPageId,
            );
        });
        const prevEl = prevId ? elements.find((e) => e.id === prevId) : null;
        if (prevEl?.subComposerOptions) unmountSubComposer(prevEl);
        const newEl = elements.find((e) => e.id === id);
        if (newEl?.subComposerOptions) {
            const outerDiv = contentGrid.querySelector(`#${id}`);
            const sectionDiv =
                outerDiv?.querySelector(".sub-composer-inner") ??
                outerDiv ??
                contentGrid;
            mountSubComposer(newEl, sectionDiv).catch(() => {});
        }
        history.replaceState(null, "", `#${activeSubPageId}`);
        applyPageOverrides(id);
        onRender?.();
        return true;
    }

    async function init() {
        if (composerDestroyed) return;
        configureToastDismissLabel(i18n.t("ui.reuse.dismiss"));
        configureConnectionRecoveryPrompt(
            i18n.t("ui.reuse.connection_lost_refresh_prompt"),
            i18n.t("ui.reuse.connection_restored_refresh_prompt"),
        );

        const pageContextHtml = pageContext
            ? `<h1>${pageContext.title}</h1><p>${pageContext.subtitle}</p>`
            : "";

        const toolbarHtml =
            Array.isArray(toolbar) && toolbar.length > 0
                ? toolbar.map((t) => t.render()).join("")
                : undefined;
        const subNavigationHtml =
            Array.isArray(subNavigation) && subNavigation.length > 0
                ? subNavigation.map((item) => item.render()).join("")
                : undefined;

        const floatingHtml =
            Array.isArray(floatingMenu) && floatingMenu.length > 0
                ? "\u200b"
                : undefined;

        await renderDashboardLayout(root, {
            i18n,
            pageContext: pageContextHtml,
            toolbar: toolbarHtml,
            subNavigation: subNavigationHtml,
            floatingToolbar: floatingHtml,
            content: "",
            showTopbar,
            showNavbar,
            showThemeToggle,
            showFooter,
            requireAccountSession,
            enableAccountEnhancements,
        });
        composerEditToggleButton = root.querySelector("#composer-edit-toggle");
        pageActions.mount(root, { signal });
        focusControl = createFocusControlCoordinator({
            root,
            manifest: pageManifest,
            elements,
            i18n,
            signal,
        });
        await focusControl.mount();

        if (Array.isArray(floatingMenu) && floatingMenu.length > 0) {
            const floatingToolbar = root.querySelector(".floating-toolbar");
            if (floatingToolbar) {
                floatingToolbar.innerHTML = "";
                for (const item of floatingMenu) {
                    const slot = document.createElement("div");
                    slot.dataset.floatingSlot = item.id;
                    slot.hidden = true;
                    slot.innerHTML = item.render();
                    floatingToolbar.appendChild(slot);
                }
                const updateToolbarVisibility = () => {
                    const anyVisible = [
                        ...floatingToolbar.querySelectorAll(
                            "[data-floating-slot]",
                        ),
                    ].some((s) => !s.hidden);
                    floatingToolbar.hidden = !anyVisible;
                };
                const slotObserver = new MutationObserver(
                    updateToolbarVisibility,
                );
                floatingToolbar
                    .querySelectorAll("[data-floating-slot]")
                    .forEach((slot) => {
                        slotObserver.observe(slot, {
                            attributes: true,
                            attributeFilter: ["hidden"],
                        });
                    });
                updateToolbarVisibility();
            }
        }

        const mainWindow = root.querySelector(".main-window");
        contentGrid = root.querySelector(".content-grid");
        if (columns === 2)
            contentGrid?.classList.add("content-grid--two-column");
        let closeMobileDrawerIfNeeded = () => {};

        if (!contentScrolling) {
            root.querySelector(".workspace")?.classList.add(
                "app-page--document-scroll",
            );
        }

        if (frameless) {
            root.querySelector(".app-shell")?.classList.add(
                "app-shell--frameless",
            );
            root.querySelector(".workspace")?.classList.add(
                "app-page--frameless",
            );
        }

        if (Array.isArray(toolbar) && toolbar.length > 0) {
            const toolbarEl = root.querySelector(".toolbar");
            if (toolbarEl) {
                const mobileMedia = window.matchMedia(
                    `(max-width: ${MOBILE_TOOLBAR_BREAKPOINT}px)`,
                );
                let mobileDrawerOpen = false;
                const mainWindow = root.querySelector(".main-window");
                const shell = root.querySelector(".app-shell");
                mainWindow?.querySelector(".toolbar-mobile-toggle")?.remove();
                mainWindow?.querySelector(".toolbar-mobile-backdrop")?.remove();
                shell?.querySelector(".toolbar-mobile-backdrop")?.remove();
                const mobileToggleBtn = document.createElement("button");
                mobileToggleBtn.type = "button";
                mobileToggleBtn.className = "toolbar-mobile-toggle";
                const mobileBackdrop = document.createElement("div");
                mobileBackdrop.className = "toolbar-mobile-backdrop";
                if (mainWindow) {
                    mainWindow.insertBefore(
                        mobileToggleBtn,
                        toolbarEl.nextSibling,
                    );
                }
                if (mainWindow) {
                    mainWindow.appendChild(mobileBackdrop);
                } else if (shell) {
                    shell.appendChild(mobileBackdrop);
                }

                function isMobileDrawerMode() {
                    return mobileMedia.matches;
                }

                closeMobileDrawerIfNeeded = () => {
                    if (isMobileDrawerMode() && mobileDrawerOpen) {
                        setMobileDrawerOpen(false, { restoreFocus: false });
                    }
                };

                function setMobileDrawerOpen(
                    nextOpen,
                    { restoreFocus = true } = {},
                ) {
                    const open = isMobileDrawerMode() && nextOpen;
                    mobileDrawerOpen = open;
                    toolbarEl.classList.toggle("toolbar--mobile-open", open);
                    mobileBackdrop.classList.toggle(
                        "toolbar-mobile-backdrop--open",
                        open,
                    );
                    mobileBackdrop.hidden = !open;
                    if (!open && restoreFocus && mobileToggleBtn.isConnected) {
                        mobileToggleBtn.focus();
                    }
                    mobileToggleBtn.setAttribute("aria-expanded", String(open));
                    mobileToggleBtn.classList.toggle(
                        "toolbar-mobile-toggle--drawer-open",
                        open,
                    );
                    mobileToggleBtn.innerHTML = renderToolbarToggleIcon(open);
                    mobileToggleBtn.setAttribute(
                        "aria-label",
                        open
                            ? i18n.t("ui.layout.toolbar.collapse")
                            : i18n.t("ui.layout.toolbar.expand"),
                    );
                }

                mobileToggleBtn.setAttribute("aria-expanded", "false");
                mobileToggleBtn.innerHTML = renderToolbarToggleIcon(false);
                mobileToggleBtn.setAttribute(
                    "aria-label",
                    i18n.t("ui.layout.toolbar.expand"),
                );
                setMobileDrawerOpen(false, { restoreFocus: false });

                mobileToggleBtn.addEventListener("click", () => {
                    setMobileDrawerOpen(!mobileDrawerOpen);
                });
                toolbarEl.addEventListener("click", (event) => {
                    if (!isMobileDrawerMode() || !mobileDrawerOpen) return;
                    const target = event.target;
                    if (!(target instanceof Element)) return;
                    if (target.closest(".toolbar-mobile-toggle")) return;
                    if (
                        target.closest("a[href]") ||
                        target.closest("button:not(.toolbar-mobile-toggle)")
                    ) {
                        setMobileDrawerOpen(false, { restoreFocus: false });
                    }
                });
                mobileBackdrop.addEventListener("click", () => {
                    setMobileDrawerOpen(false);
                });
                mobileMedia.addEventListener("change", () => {
                    if (!isMobileDrawerMode()) {
                        setMobileDrawerOpen(false, { restoreFocus: false });
                    }
                });

                if (toolbarScrollable) {
                    toolbarEl.classList.add("toolbar--scrollable");
                    toolbarEl.tabIndex = 0;
                    const headerEl = root.querySelector(".site-header");
                    const footerEl = root.querySelector(".global-footer");
                    let layoutObserver;
                    function syncToolbarPosition() {
                        if (!toolbarEl.isConnected) {
                            layoutObserver?.disconnect();
                            return;
                        }
                        const headerHeight = headerEl
                            ? headerEl.getBoundingClientRect().height
                            : 0;
                        const footerHeight = footerEl
                            ? footerEl.getBoundingClientRect().height
                            : 0;
                        toolbarEl.style.setProperty(
                            "--toolbar-sticky-top",
                            `${headerHeight}px`,
                        );
                        // 24px accounts for the workspace's top margin gap.
                        toolbarEl.style.setProperty(
                            "--toolbar-max-height",
                            `calc(100dvh - ${headerHeight}px - ${footerHeight}px - 24px)`,
                        );
                    }
                    syncToolbarPosition();
                    layoutObserver = new ResizeObserver(syncToolbarPosition);
                    if (headerEl) layoutObserver.observe(headerEl);
                    if (footerEl) layoutObserver.observe(footerEl);
                    layoutObserver.observe(document.documentElement);
                }
            }
        }

        if (subPageNavigation) {
            const hashId = window.location.hash.slice(1);
            const validIds = elements.map((e) => e.id);
            activeSubPageId =
                hashId && validIds.includes(hashId)
                    ? hashId
                    : (validIds[0] ?? null);
            if (activeSubPageId) applyPageOverrides(activeSubPageId);
        }

        root.querySelectorAll("[data-composer-scroll]").forEach((btn) => {
            if (subPageNavigation) {
                btn.classList.toggle(
                    "active",
                    btn.dataset.composerScroll === activeSubPageId,
                );
                btn.addEventListener("click", async () => {
                    const didSwitch = await switchSubPage(
                        btn.dataset.composerScroll,
                    );
                    if (didSwitch) {
                        closeMobileDrawerIfNeeded();
                    }
                });
            } else {
                btn.addEventListener("click", () => {
                    root.querySelector(
                        `#${btn.dataset.composerScroll}`,
                    )?.scrollIntoView({
                        behavior: prefersReducedMotion() ? "auto" : "smooth",
                    });
                    root.querySelectorAll("[data-composer-scroll]").forEach(
                        (b) => b.classList.remove("active"),
                    );
                    btn.classList.add("active");
                    closeMobileDrawerIfNeeded();
                });
            }
        });

        gridCols = getPreferredGridColumnCount();
        lastObservedCols = gridCols;

        layout = null;

        if (!subPageNavigation && contentGrid) {
            resizeObserver = new ResizeObserver(() => {
                if (!contentGrid || !document.contains(contentGrid)) return;
                const newCols = getPreferredGridColumnCount();
                if (newCols !== lastObservedCols) {
                    lastObservedCols = newCols;
                    gridCols = newCols;
                    if (!editing && persistLayoutPreferences) {
                        applyLayoutForCurrentGridColumns();
                    }
                    renderGridComposer();
                }
            });
            resizeObserver.observe(contentGrid.parentElement ?? contentGrid);
        }

        render();

        if (persistLayoutPreferences) {
            loadLayout()
                .then((loadedLayout) => {
                    // Skip applying async-loaded layout data when the grid has
                    // been unmounted, the user has already started editing, or
                    // there is no stored layout/profile data to apply.
                    if (
                        !contentGrid ||
                        !document.contains(contentGrid) ||
                        editing ||
                        (!loadedLayout && !hasStoredLayoutProfiles())
                    ) {
                        return;
                    }
                    layout = loadedLayout;
                    render();
                })
                .catch((error) => {
                    console.warn(
                        "[page-composer] failed to load saved layout preferences:",
                        error,
                    );
                });
        }

        activePresenceTracker?.destroy();
        activePresenceTracker = null;
        if (presenceTracker?.enabled !== false && presenceTracker?.endpoint) {
            activePresenceTracker = createPresenceTracker({
                ...presenceTracker,
                pointerTracking:
                    pageManifest?.features?.pointerTracking === true,
                i18n,
            });
            activePresenceTracker.mount(mainWindow);
        }
    }

    function refresh(newElements) {
        const previousScrollLeft = window.scrollX;
        const previousScrollTop = window.scrollY;
        if (editing) endEditMode();
        editing = false;
        if (Array.isArray(newElements)) {
            elements = newElements;
        }
        render();
        restoreWindowScrollPosition(previousScrollLeft, previousScrollTop);
    }

    function refreshElements(elementIds) {
        renderer.refreshElements(elementIds);
        onRender?.();
    }

    return {
        init,
        refresh,
        refreshElements,
        getFloatingSlot: (id) => findFloatingSlot(root, id),
        showToast,
        refreshPresence: () => activePresenceTracker?.refresh(),
        destroy,
    };
}
