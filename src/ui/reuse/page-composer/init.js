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
 *   tutorials?: Array<{ owner: string, minRole?: string, definitions: object[], i18n?: object }>,
 *   toolbar?: Array<{ id: string, label: string, render: () => string }>,
 *   toolbarScrollable?: boolean, contentScrolling?: boolean, fillViewport?: boolean, enableDomParking?: boolean,
 *   stackAt?: "compact" | "medium", readingOrder?: string[],
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
 * @returns {{ init(): Promise<void>, refresh(elements: Array): void, refreshElements(elementIds: string[]): void, openToolbar(trigger?: HTMLElement): void, closeToolbar(): void, getFloatingSlot(id: string): HTMLElement|null, showToast(message: string, options?: object): () => void }}
 */
import { createLayoutSaveHandler, commitLayoutEdit } from "./layout-save.js";
import { bindCapability } from "../capabilities.js";

import { watchComposerPresentation } from "./presentation.js";
import { mountViewportLayout } from "./viewport-layout.js";

import { apiFetch, configureConnectionRecoveryPrompt } from "../api-client.js";
import { renderDashboardLayout } from "../../layouts/dashboard-layout.js";
import { prefersReducedMotion } from "../motion.js";
import { showToast, configureToastDismissLabel } from "../toast.js";
import { createFormDraftManager } from "./form-draft.js";
import { createLayoutPersistence } from "./layout-persistence.js";
import { createGridOverlayHandlers } from "./grid-overlay.js";
import { createSubComposerHandlers as createNestedComposerHandlers } from "./sub-composer.js";
import { uiCtx } from "../ui-ctx.js";
import { mountComposerFloatingMenu } from "./floating-menu.js";
import { mountComposerTutorials } from "../tutorials/pages.js";
import { createComposerRenderer } from "./composer-render.js";
import { PAGE_COMPOSER_GRID_UNIT } from "./grid-math.js";
import {
    resolveElementGridSize,
    resolveGridColumnCount,
} from "./grid-sizing.js";
import { createPresenceTracker } from "./presence-tracker.js";
import {
    isCompactComposer,
    COMPOSER_COMPACT_BREAKPOINT,
    resolveComposerResize,
} from "./responsive-layout.js";
import { pageActions } from "../page-actions.js";
import { createFocusControlCoordinator } from "../focus-control.js";
import {
    getFloatingSlot as findFloatingSlot,
    restoreWindowScrollPosition,
} from "./dom-position.js";
import { mountComposerToolbarDrawer } from "./toolbar-drawer.js";

const log = bindCapability("ui:log");

export function createPageComposer(
    root,
    {
        allowCustomization,
        elements: initialElements,
        preferenceKey,
        i18n,
        onRender,
        pageContext,
        tutorials = [],
        toolbar = [],
        toolbarScrollable = false,
        contentScrolling = true,
        fillViewport = false,
        stackAt = "compact",
        readingOrder = [],
        enableDomParking = false,
        subNavigation: nestedNavigation = [],
        floatingMenu = [],
        subPageNavigation: nestedPageNavigation = false,
        columns = 1,
        showTopbar = true,
        showNavbar = true,
        showThemeToggle = true,
        showFooter = true,
        frameless = false,
        persistLayoutPreferences = true,
        pageOverrides = {},
        onBeforeSubPageSwitch: onBeforeNestedPageSwitch,
        requireAccountSession = showTopbar || showNavbar,
        enableAccountEnhancements = true,
        presenceTracker = null,
        pageManifest = null,
        signal,
    },
) {
    if (globalThis.__cognisPublicSpaRoute === true) {
        const publicPageContext = globalThis.__cognisPublicSpaRoutePageContext;
        if (!pageContext && publicPageContext) {
            pageContext = {
                title: i18n.t(publicPageContext.labelKey),
                subtitle: i18n.t(publicPageContext.descriptionKey),
            };
        }
        showTopbar = true;
        showNavbar = false;
        showThemeToggle = true;
        showFooter = true;
        frameless = false;
        requireAccountSession = false;
        enableAccountEnhancements = false;
    }

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
    let viewportCleanup;
    let presentationCleanup;
    let toolbarController;
    let activeNestedPageId = null;
    let panelPosition = null;
    let layoutSnapshot = null;
    let gridColumns = 1;
    let gridRows = 6;
    let resizeObserver = null;
    let lastObservedColumns = 0;
    let lastObservedCompact = false;
    let lastObservedWidth = 0;
    let gridSection = null;
    let editToggleAbortController = null;
    let composerEditToggleButton = null;
    let layoutProfiles = { layoutsByGrid: {} };
    let activePresenceTracker = null;
    let composerDestroyed = false;
    let focusControl = null;
    let nestedComposerHandlers = null;
    let gridOverlayHandlers = null;
    const tutorialLifetime = new AbortController();

    function destroy() {
        if (composerDestroyed) return;
        composerDestroyed = true;
        tutorialLifetime.abort();
        delete root.dataset.composerDrawer;
        delete root.dataset.composerTouch;
        viewportCleanup?.();
        presentationCleanup?.();
        activePresenceTracker?.destroy();
        activePresenceTracker = null;
        resizeObserver?.disconnect();
        resizeObserver = null;
        focusControl?.destroy();
        focusControl = null;
        nestedComposerHandlers?.destroy();
        gridOverlayHandlers?.destroy();
        editToggleAbortController?.abort();
        window.removeEventListener("beforeunload", handleBeforeUnload);
    }

    if (signal?.aborted) destroy();
    else signal?.addEventListener("abort", destroy, { once: true });

    const UNIT = PAGE_COMPOSER_GRID_UNIT; // grid cell size in pixels
    // Treat narrow grids as compact so single-pane rows expand and avoid
    // visibly wasted horizontal space on small screens.
    const COMPACT_SINGLE_ROW_FULL_WIDTH_MAX_COLUMNS = 10;
    const FORM_DRAFT_STORAGE_PREFIX = "cognis_form_draft";
    const LARGE_FORM_RESET_FIELD_THRESHOLD = 6;

    function handleBeforeUnload(event) {
        event.preventDefault();
        event.returnValue = "";
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
        saveLayoutByKey: persistLayoutByKey,
        cloneLayoutData,
    } = createLayoutPersistence({ apiFetch });

    const saveLayoutByKey = createLayoutSaveHandler({
        ctx: uiCtx,
        save: persistLayoutByKey,
        notify: showToast,
        i18n,
        signal: tutorialLifetime.signal,
    });

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
        const loaded = await loadLayoutByKey(preferenceKey, gridColumns);
        layoutProfiles = loaded.profiles;
        return cloneLayoutData(loaded.layout);
    }

    function hasStoredLayoutProfiles() {
        return Object.keys(layoutProfiles?.layoutsByGrid ?? {}).length > 0;
    }

    async function saveLayout() {
        const saved = await saveLayoutByKey(
            preferenceKey,
            layoutProfiles,
            gridColumns,
            layout,
        );
        if (!saved) return false;
        layoutProfiles = saved;
        return true;
    }

    function applyLayoutForCurrentGridColumns() {
        const selected = getLayoutForGrid(layoutProfiles, gridColumns);
        if (!selected.layout) return false;
        layout = cloneLayoutData(selected.layout);
        return true;
    }

    function applyNestedLayoutForCurrentGridColumns(state) {
        const selected = getLayoutForGrid(state.layoutProfiles, state.gridCols);
        if (!selected.layout) return false;
        state.layout = cloneLayoutData(selected.layout);
        return true;
    }

    const getPreferredGridColumnCount = () =>
        resolveGridColumnCount({ contentGrid, root, unit: UNIT });
    const getGridSize = resolveElementGridSize;

    function getNestedPanelId(preferenceKey) {
        return (
            "composer-elements-panel-" +
            preferenceKey.replace(/[^a-z0-9]/g, "-")
        );
    }

    const composerState = {
        root,
        signal: tutorialLifetime.signal,
        allowCustomization,
        frameless,
        fillViewport,
        stackAt,
        readingOrder,
        preferenceKey,
        persistLayoutPreferences,
        subPageNavigation: nestedPageNavigation,
        onRender: () => {
            toolbarController?.syncTogglePlacement();
            onRender?.();
        },
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
            return activeNestedPageId;
        },
        set activeSubPageId(value) {
            activeNestedPageId = value;
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
            return gridColumns;
        },
        set gridCols(value) {
            gridColumns = value;
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

    gridOverlayHandlers = createGridOverlayHandlers({
        state: composerState,
        UNIT,
        i18n,
        escapeHtml,
        getGridSize,
        renderGridComposer: () => renderer.renderGridComposer(),
        saveLayout,
        endEditMode,
    });

    nestedComposerHandlers = createNestedComposerHandlers({
        signal: tutorialLifetime.signal,
        i18n,
        UNIT,
        beginEditMode,
        endEditMode,
        getGridSize,
        getSubPanelId: getNestedPanelId,
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
        computeSubViewPlacements: (nestedState) =>
            renderer.computeSubViewPlacements(nestedState),
        syncSubEditToggle: syncNestedEditToggle,
        applySubLayoutForCurrentGridColumns:
            applyNestedLayoutForCurrentGridColumns,
    });

    renderer = createComposerRenderer({
        state: composerState,
        UNIT,
        MOBILE_LAYOUT_WIDTH_RECLAIM_BREAKPOINT: COMPOSER_COMPACT_BREAKPOINT,
        COMPACT_SINGLE_ROW_FULL_WIDTH_MAX_COLS:
            COMPACT_SINGLE_ROW_FULL_WIDTH_MAX_COLUMNS,
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
        computeSubGridDimensions:
            nestedComposerHandlers.computeSubGridDimensions,
        initializeSubPlacements: nestedComposerHandlers.initializeSubPlacements,
        syncEditToggle,
        mountSubComposer: nestedComposerHandlers.mountSubComposer,
        unmountSubComposer: nestedComposerHandlers.unmountSubComposer,
        captureFormState,
        restoreFormState,
        mergeFormStateSnapshots,
        loadPersistedFormState,
        bindFormDraftPersistence,
    });

    const { compactPlacements } = gridOverlayHandlers;
    const {
        mountSubComposer: mountNestedComposer,
        unmountSubComposer: unmountNestedComposer,
        renderSubGrid: renderNestedGrid,
        compactSubPlacements: compactNestedPlacements,
    } = nestedComposerHandlers;
    const {
        render,
        renderGridComposer,
        syncLayoutToCurrentGridColumns,
        syncSubLayoutToCurrentGridColumns: syncNestedLayoutToCurrentGridColumns,
    } = renderer;

    function syncNestedEditToggle(state) {
        const editButton = getComposerEditToggleButton();
        if (!editButton) return;
        if (uiCtx.capabilities.get("session:isGuest")?.() === true) {
            editButton.remove();
            return;
        }
        if (!state.allowCustomization) {
            editButton.hidden = true;
            return;
        }
        editButton.hidden = false;
        state.editToggleAbortController?.abort();
        state.editToggleAbortController = new AbortController();
        const { signal } = state.editToggleAbortController;
        if (!state.editing) {
            editButton.innerHTML =
                '<span class="composer-edit-icon" aria-hidden="true"></span>';
            editButton.title = i18n.t("ui.reuse.edit_layout");
            editButton.addEventListener(
                "click",
                () => {
                    syncNestedLayoutToCurrentGridColumns(state);
                    state.layoutSnapshot = JSON.parse(
                        JSON.stringify(state.layout),
                    );
                    state.editing = true;
                    beginEditMode();
                    renderNestedGrid(state);
                },
                { signal },
            );
        } else {
            editButton.textContent = "✓";
            editButton.title = i18n.t("ui.reuse.done");
            editButton.addEventListener(
                "click",
                async () => {
                    await commitLayoutEdit({
                        state,
                        prepare: () => compactNestedPlacements(state),
                        save: () => nestedComposerHandlers.saveSubLayout(state),
                        finish: endEditMode,
                        render: () => renderNestedGrid(state),
                    });
                },
                { signal },
            );
        }
    }

    function syncEditToggle() {
        const editButton = getComposerEditToggleButton();
        if (!editButton) return;
        if (uiCtx.capabilities.get("session:isGuest")?.() === true) {
            editButton.remove();
            return;
        }
        if (!allowCustomization) {
            editButton.hidden = true;
            return;
        }
        editButton.hidden = false;
        editToggleAbortController?.abort();
        editToggleAbortController = new AbortController();
        const { signal } = editToggleAbortController;
        if (!editing) {
            editButton.innerHTML =
                '<span class="composer-edit-icon" aria-hidden="true"></span>';
            editButton.title = i18n.t("ui.reuse.edit_layout");
            editButton.addEventListener(
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
            editButton.textContent = "✓";
            editButton.title = i18n.t("ui.reuse.done");
            editButton.addEventListener(
                "click",
                async () => {
                    await commitLayoutEdit({
                        state: composerState,
                        prepare: () => {
                            if (!nestedPageNavigation) compactPlacements();
                        },
                        save: saveLayout,
                        finish: endEditMode,
                        render,
                    });
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
        const toggleElement = root.querySelector("#theme-toggle");
        if (toggleElement) toggleElement.hidden = !effectiveShowThemeToggle;
    }

    async function switchNestedPage(id) {
        if (onBeforeNestedPageSwitch) {
            const allowed = await onBeforeNestedPageSwitch(
                activeNestedPageId,
                id,
            );
            if (!allowed) return false;
        }
        const previousId = activeNestedPageId;
        activeNestedPageId = id;
        const panel =
            contentGrid.querySelector(".content-panel") ?? contentGrid;
        panel.querySelectorAll(".content-section").forEach((section) => {
            const isActive = section.id === activeNestedPageId;
            section.hidden = !isActive;
            section.classList.toggle("active", isActive);
        });
        root.querySelectorAll("[data-composer-scroll]").forEach((button) => {
            button.classList.toggle(
                "active",
                button.dataset.composerScroll === activeNestedPageId,
            );
        });
        const previousElement = previousId
            ? elements.find(
                  (candidateElement) => candidateElement.id === previousId,
              )
            : null;
        if (previousElement?.subComposerOptions)
            unmountNestedComposer(previousElement);
        const newElement = elements.find(
            (candidateElement) => candidateElement.id === id,
        );
        if (newElement?.subComposerOptions) {
            const outerDiv = contentGrid.querySelector(`#${id}`);
            const sectionDiv =
                outerDiv?.querySelector(".sub-composer-inner") ??
                outerDiv ??
                contentGrid;
            mountNestedComposer(newElement, sectionDiv).catch(() => {});
        }
        history.replaceState(null, "", `#${activeNestedPageId}`);
        applyPageOverrides(id);
        onRender?.();
        return true;
    }

    async function initialize() {
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
                ? toolbar
                      .map((item) => {
                          const content = item.render();
                          return content
                              ? `<section class="composer-sidebar-section">${content}</section>`
                              : "";
                      })
                      .join("")
                : undefined;
        const nestedNavigationHtml =
            Array.isArray(nestedNavigation) && nestedNavigation.length > 0
                ? nestedNavigation.map((item) => item.render()).join("")
                : undefined;

        const floatingHtml =
            Array.isArray(floatingMenu) && floatingMenu.length > 0
                ? "\u200b"
                : undefined;

        await renderDashboardLayout(root, {
            signal,
            i18n,
            pageContext: pageContextHtml,
            toolbar: toolbarHtml,
            subNavigation: nestedNavigationHtml,
            floatingToolbar: floatingHtml,
            content: "",
            showTopbar,
            showNavbar,
            showThemeToggle,
            showFooter,
            requireAccountSession,
            enableAccountEnhancements,
        });
        if (composerDestroyed) return;
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
        if (composerDestroyed) return;

        if (Array.isArray(floatingMenu) && floatingMenu.length > 0)
            mountComposerFloatingMenu({
                root,
                items: floatingMenu,
                signal: tutorialLifetime.signal,
                ctx: uiCtx,
            });

        const mainWindow = root.querySelector(".main-window");
        contentGrid = root.querySelector(".content-grid");
        presentationCleanup?.();
        presentationCleanup = watchComposerPresentation(
            root,
            contentGrid,
            tutorialLifetime.signal,
        );
        if (columns === 2)
            contentGrid?.classList.add("content-grid--two-column");
        let closeMobileDrawerIfNeeded = () => {};
        viewportCleanup?.();
        if (fillViewport) {
            if (elements.length !== 1 || allowCustomization)
                throw new Error("viewport_layout_requires_one_fixed_element");
            viewportCleanup = mountViewportLayout(root, {
                signal: tutorialLifetime.signal,
            });
        }

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
            const toolbarDrawer = mountComposerToolbarDrawer({
                root,
                i18n,
                toolbarScrollable,
                signal: tutorialLifetime.signal,
                log: uiCtx.capabilities.get("ui:log"),
            });
            toolbarController = toolbarDrawer;
            if (toolbarDrawer)
                closeMobileDrawerIfNeeded =
                    toolbarDrawer.closeMobileDrawerIfNeeded;
        }

        if (nestedPageNavigation) {
            const hashId = window.location.hash.slice(1);
            const validIds = elements.map(
                (candidateElement) => candidateElement.id,
            );
            activeNestedPageId =
                hashId && validIds.includes(hashId)
                    ? hashId
                    : (validIds[0] ?? null);
            if (activeNestedPageId) applyPageOverrides(activeNestedPageId);
        }

        root.querySelectorAll("[data-composer-scroll]").forEach((button) => {
            if (nestedPageNavigation) {
                button.classList.toggle(
                    "active",
                    button.dataset.composerScroll === activeNestedPageId,
                );
                button.addEventListener("click", async () => {
                    const didSwitch = await switchNestedPage(
                        button.dataset.composerScroll,
                    );
                    if (didSwitch) {
                        closeMobileDrawerIfNeeded();
                    }
                });
            } else {
                button.addEventListener("click", () => {
                    root.querySelector(
                        `#${button.dataset.composerScroll}`,
                    )?.scrollIntoView({
                        behavior: prefersReducedMotion() ? "auto" : "smooth",
                    });
                    root.querySelectorAll("[data-composer-scroll]").forEach(
                        (button) => button.classList.remove("active"),
                    );
                    button.classList.add("active");
                    closeMobileDrawerIfNeeded();
                });
            }
        });

        gridColumns = getPreferredGridColumnCount();
        lastObservedColumns = gridColumns;
        lastObservedCompact = isCompactComposer(contentGrid, stackAt);
        lastObservedWidth = contentGrid?.getBoundingClientRect().width ?? 0;

        layout = null;

        if (!nestedPageNavigation && contentGrid) {
            resizeObserver = new ResizeObserver(() => {
                if (!contentGrid || !document.contains(contentGrid)) return;
                const newColumns = getPreferredGridColumnCount();
                const compact = isCompactComposer(contentGrid, stackAt);
                const width = contentGrid.getBoundingClientRect().width;
                const resize = resolveComposerResize(
                    {
                        columns: lastObservedColumns,
                        compact: lastObservedCompact,
                        width: lastObservedWidth,
                    },
                    { columns: newColumns, compact, width },
                    editing,
                );
                if (resize.render) {
                    lastObservedColumns = newColumns;
                    lastObservedCompact = compact;
                    lastObservedWidth = width;
                    gridColumns = newColumns;
                    if (resize.reflow) {
                        renderer.syncLayoutToCurrentGridColumns();
                    } else if (!editing && persistLayoutPreferences) {
                        applyLayoutForCurrentGridColumns();
                    }
                    renderGridComposer({ layoutOnly: true });
                }
            });
            resizeObserver.observe(contentGrid.parentElement ?? contentGrid);
            resizeObserver.observe(contentGrid);
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
                    void log(
                        "warn",
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
        await mountComposerTutorials(uiCtx, {
            root,
            i18n,
            lifetime: tutorialLifetime,
            tutorials,
            elements,
        });
        await uiCtx.runFlow("page:mounted", {
            root,
            pathname: window.location.pathname,
            signal,
        });
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
    }

    return {
        init: initialize,
        refresh,
        refreshElements,
        openToolbar: (trigger) => toolbarController?.open(trigger),
        closeToolbar: () => toolbarController?.closeMobileDrawerIfNeeded(),
        getFloatingSlot: (id) => findFloatingSlot(root, id),
        showToast,
        refreshPresence: () => activePresenceTracker?.refresh(),
        destroy,
    };
}
