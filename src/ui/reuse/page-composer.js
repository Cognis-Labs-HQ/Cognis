/**
 * Page composer — orchestrates the full dashboard layout for a page. For pages
 * without sub-page navigation, renders a free-form grid (Android-widget-style)
 * where elements are absolutely positioned, draggable, and resizable. For
 * sub-page navigation pages (settings, administration, docs), renders the
 * traditional vertical list with section switching.
 *
 * Layouts are persisted to the user-preferences API under the caller-supplied key
 * so each page retains its own arrangement independently.
 *
 * Public exports:
 *   createPageComposer(root, options) — creates a layout composer and returns
 *     an instance with init() and refresh() methods.
 *
 * Usage:
 *   const composer = createPageComposer(document.querySelector('#app'), {
 *     allowCustomization: true,
 *     elements: [
 *       {
 *         id: 'modules',
 *         label: 'Modules',
 *         render: () => '<h2>Modules</h2>...',
 *         gridSize: { default: [4, 3], min: [2, 2], max: [6, 4] },
 *       },
 *       { id: 'pinned-widget', label: 'Widget', render: () => '...', pinned: true },
 *     ],
 *     preferenceKey: 'administration-layout',
 *     i18n,
 *     pageContext: { title: 'Administration', subtitle: 'Admin tools and controls.' },
 *     onRender: () => bindMyPageEvents(),
 *   });
 *   await composer.init();
 *   // Later, re-render with fresh data:
 *   composer.refresh(updatedElements);
 *
 * Sub-page navigation:
 *   Pass subPageNavigation: true to show only one element at a time. Toolbar
 *   buttons with [data-composer-scroll] become section selectors — clicking one
 *   shows that section, hides the others, and marks the button active. The active
 *   section is also reflected in the URL hash so deep-links work.
 *
 * Pinned elements:
 *   Set pinned: true on an element to prevent it from being removed by the user.
 *   Pinned elements still appear in the drag handle for reordering but have no
 *   remove button.
 *
 * Grid size:
 *   Each element may declare a gridSize field to control its size on the grid.
 *   Example: gridSize: { default: [4, 3], min: [2, 2], max: [6, 4] }
 *   When absent, defaults to { default: [4, 3], min: [2, 2] }.
 *   Each value is [width, height] in grid units (90 px each).
 *   Magic string values for max:
 *     'full'  — spans all available columns (full width).
 *     'half'  — spans half the available columns (half width). When the grid
 *               dimension is odd, placements snap to half-grid increments
 *               (UNIT / 2 steps) so elements can fill the space evenly.
 *     'fill'  — spans the remaining columns from the placement position to
 *               the right edge of the grid (fill remaining space).
 *   To apply half/fill on both axes, use max: ['half', 'half'] or max: ['fill', 'fill'].
 *   To mix, use max: ['half', n], max: ['fill', n], max: [n, 'half'], etc.
 *
 * Multi-column layout:
 *   Pass columns: 2 to render the content grid in two columns (sub-page navigation
 *   path only). Grid mode handles layout natively and ignores this option.
 *
 * Sub-composer heading:
 *   Pass heading: 'Section title' in subComposerOptions to render an h2 above the
 *   sub-composer grid. The heading is rendered outside the inner grid container so
 *   it is preserved across re-renders triggered by resize or sub-page switching.
 *
 * @param {HTMLElement} root - The #app root element for the page.
 * @param {{
 *   allowCustomization: boolean,
 *   elements: Array<{
 *     id: string,
 *     label: string,
 *     render: () => string,
 *     onRender?: () => void,
 *     onUnmount?: () => void,
 *     pinned?: boolean,
 *     gridSize?: { default: [number, number], min: [number, number], max?: [number, number] | 'full' | 'half' | ['half'|number, 'half'|number] },
 *   }>,
 *   preferenceKey: string,
 *   i18n: object,
 *   onRender?: () => void,
 *   pageContext?: { title: string, subtitle: string },
 *   toolbar?: Array<{ id: string, label: string, render: () => string }>,
 *   toolbarScrollable?: boolean,
 *   subNavigation?: Array<{ id: string, label: string, render: () => string }>,
 *   floatingMenu?: Array<{ id: string, label: string, render: () => string }>,
 *   subPageNavigation?: boolean,
 *   columns?: number,
 *   showTopbar?: boolean,
 *   showNavbar?: boolean,
 *   showThemeToggle?: boolean,
 *   showFooter?: boolean,
 *   persistLayoutPreferences?: boolean,
 *   pageOverrides?: Record<string, { showThemeToggle?: boolean }>,
 *   onBeforeSubPageSwitch?: (fromId: string|null, toId: string) => Promise<boolean>,
 * }} options
 * @returns {{ init(): Promise<void>, refresh(elements: Array): void, getFloatingSlot(id: string): HTMLElement|null, showToast(message: string, options?: object): () => void }}
 */

import { apiFetch, configureConnectionRecoveryPrompt } from "./api-client.js";
import { renderDashboardLayout } from "../layouts/dashboard-layout.js";
import { prefersReducedMotion } from "./motion.js";
import { showToast, configureToastDismissLabel } from "./toast.js";

const TOOLBAR_TOGGLE_OPEN_SVG =
    '<svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path d="M3 3L13 13" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/><path d="M13 3L3 13" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>';

const TOOLBAR_TOGGLE_CLOSED_SVG =
    '<svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path d="M2.5 4H13.5" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/><path d="M2.5 8H13.5" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/><path d="M2.5 12H13.5" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>';

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
    let layoutProfiles = { layoutsByGrid: {} };

    const UNIT = 90; // grid cell size in pixels
    const MOBILE_TOOLBAR_BREAKPOINT = 900;
    const FORM_DRAFT_STORAGE_PREFIX = "cognis_form_draft";
    const LARGE_FORM_RESET_FIELD_THRESHOLD = 6;

    function gridStep(dim) {
        return dim % 2 === 1 ? 0.5 : 1;
    }

    function halfGrid(dim) {
        return dim % 2 === 1 ? dim / 2 : Math.floor(dim / 2);
    }

    function snapGridFloor(px, dim) {
        const step = gridStep(dim);
        return Math.floor(px / (UNIT * step)) * step;
    }

    function snapGridRound(raw, dim) {
        const step = gridStep(dim);
        return Math.round(raw / step) * step;
    }

    function buildOccupiedSet(placements, hidden, excludeId) {
        const cells = new Set();
        for (const placement of placements) {
            if (placement.id === excludeId) continue;
            if (hidden.includes(placement.id)) continue;
            for (
                let r = placement.row * 2;
                r < (placement.row + placement.h) * 2;
                r++
            ) {
                for (
                    let c = placement.col * 2;
                    c < (placement.col + placement.w) * 2;
                    c++
                ) {
                    cells.add(`${c},${r}`);
                }
            }
        }
        return cells;
    }

    function checkPlacement(cells, col, row, w, h) {
        for (let r = row * 2; r < (row + h) * 2; r++) {
            for (let c = col * 2; c < (col + w) * 2; c++) {
                if (cells.has(`${c},${r}`)) return false;
            }
        }
        return true;
    }

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

    function getLayoutProfileKey(gridColumnCount) {
        return `cols-${Math.max(1, Number(gridColumnCount) || 0)}`;
    }

    function parseLayoutProfileColumns(profileKey) {
        const match = /^cols-(\d+)$/.exec(profileKey);
        if (!match) return null;
        return Number.parseInt(match[1], 10);
    }

    function normalizeLayoutProfiles(rawLayout) {
        if (
            rawLayout &&
            typeof rawLayout === "object" &&
            !Array.isArray(rawLayout) &&
            rawLayout.layoutsByGrid &&
            typeof rawLayout.layoutsByGrid === "object" &&
            !Array.isArray(rawLayout.layoutsByGrid)
        ) {
            return {
                layoutsByGrid: { ...rawLayout.layoutsByGrid },
            };
        }
        return { layoutsByGrid: {} };
    }

    function getLayoutForGrid(rawLayout, gridColumnCount) {
        const normalized = normalizeLayoutProfiles(rawLayout);
        const profileKey = getLayoutProfileKey(gridColumnCount);
        const exactLayout = normalized.layoutsByGrid[profileKey];
        if (exactLayout) {
            return {
                layout: exactLayout,
                profiles: normalized,
            };
        }

        const availableKeys = Object.keys(normalized.layoutsByGrid);
        const targetCols = Math.max(1, Number(gridColumnCount) || 1);
        let nearestKey = null;
        let nearestDistance = Number.POSITIVE_INFINITY;
        for (const key of availableKeys) {
            const keyCols = parseLayoutProfileColumns(key);
            if (!Number.isFinite(keyCols)) continue;
            const distance = Math.abs(keyCols - targetCols);
            if (distance < nearestDistance) {
                nearestDistance = distance;
                nearestKey = key;
            }
        }
        if (nearestKey) {
            return {
                layout: normalized.layoutsByGrid[nearestKey],
                profiles: normalized,
            };
        }

        if (
            rawLayout &&
            typeof rawLayout === "object" &&
            !Array.isArray(rawLayout)
        ) {
            return {
                layout: rawLayout,
                profiles: {
                    layoutsByGrid: {
                        [profileKey]: rawLayout,
                    },
                },
            };
        }

        return {
            layout: null,
            profiles: normalized,
        };
    }

    function setLayoutForGrid(profiles, gridColumnCount, nextLayout) {
        const normalized = normalizeLayoutProfiles(profiles);
        const profileKey = getLayoutProfileKey(gridColumnCount);
        normalized.layoutsByGrid[profileKey] = nextLayout;
        return normalized;
    }

    async function loadLayoutByKey(key, gridColumnCount) {
        const account = localStorage.getItem("cognis_account");
        const token = localStorage.getItem("cognis_access_token");
        if (!account || !token) {
            return { layout: null, profiles: { layoutsByGrid: {} } };
        }
        try {
            const response = await apiFetch(
                `/api/v1/users/${encodeURIComponent(account)}/preferences/${encodeURIComponent(key)}`,
            );
            if (!response.ok) {
                return { layout: null, profiles: { layoutsByGrid: {} } };
            }
            const payload = await response.json();
            const raw = payload?.data?.layoutJson;
            const parsed = raw ? JSON.parse(raw) : null;
            return getLayoutForGrid(parsed, gridColumnCount);
        } catch {
            return { layout: null, profiles: { layoutsByGrid: {} } };
        }
    }

    async function saveLayoutByKey(key, profiles, gridColumnCount, nextLayout) {
        const account = localStorage.getItem("cognis_account");
        const token = localStorage.getItem("cognis_access_token");
        if (!account || !token) {
            return normalizeLayoutProfiles(profiles);
        }
        const nextProfiles = setLayoutForGrid(
            profiles,
            gridColumnCount,
            nextLayout,
        );
        await apiFetch(
            `/api/v1/users/${encodeURIComponent(account)}/preferences/${encodeURIComponent(key)}`,
            {
                method: "PUT",
                headers: { "content-type": "application/json" },
                body: JSON.stringify({ layout: nextProfiles }),
            },
        );
        return nextProfiles;
    }

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

    function cloneLayoutData(layoutData) {
        return layoutData ? JSON.parse(JSON.stringify(layoutData)) : null;
    }

    function getFormFieldKey(field, fieldIndex) {
        return field.name
            ? `name:${field.name}`
            : field.id
              ? `id:${field.id}`
              : `pos:${fieldIndex}`;
    }

    function isSensitiveDraftField(field) {
        const fieldType = String(field.type ?? "").toLowerCase();
        if (
            fieldType === "password" ||
            fieldType === "file" ||
            fieldType === "hidden"
        ) {
            return true;
        }
        const fingerprint = `${field.name ?? ""} ${field.id ?? ""}`;
        return /(^|[\W_])(password|passphrase|secret|token|api[_-]?key|auth[_-]?code)([\W_]|$)/i.test(
            fingerprint,
        );
    }

    function readFormFieldValue(field) {
        if (field.type === "checkbox" || field.type === "radio") {
            return field.checked;
        }
        return field.value;
    }

    function writeFormFieldValue(field, value) {
        if (field.type === "file") {
            return;
        }
        if (field.type === "checkbox" || field.type === "radio") {
            field.checked = Boolean(value);
            return;
        }
        field.value = typeof value === "string" ? value : "";
    }

    /**
     * @param {Element} container
     * @param {{ persistableOnly?: boolean }} [options]
     * @returns {Map<string, Map<string, (string|boolean)>>}
     */
    function captureFormState(container, options = {}) {
        const { persistableOnly = false } = options;
        const snapshot = new Map();
        container
            .querySelectorAll("[data-composer-element]")
            .forEach((card) => {
                const elementId = card.dataset.composerElement;
                if (!elementId) return;
                const fields = card.querySelectorAll("input, textarea, select");
                if (fields.length === 0) return;
                const fieldMap = new Map();
                fields.forEach((field, fieldIndex) => {
                    if (field.type === "file") {
                        return;
                    }
                    if (persistableOnly && isSensitiveDraftField(field)) {
                        return;
                    }
                    const key = getFormFieldKey(field, fieldIndex);
                    fieldMap.set(key, readFormFieldValue(field));
                });
                if (fieldMap.size > 0) {
                    snapshot.set(elementId, fieldMap);
                }
            });
        return snapshot;
    }

    /**
     * @param {Element} container
     * @param {Map<string, Map<string, (string|boolean)>>} snapshot
     */
    function restoreFormState(container, snapshot) {
        if (!snapshot || snapshot.size === 0) return;
        container
            .querySelectorAll("[data-composer-element]")
            .forEach((card) => {
                const elementId = card.dataset.composerElement;
                if (!elementId) return;
                const fieldMap = snapshot.get(elementId);
                if (!fieldMap) return;
                card.querySelectorAll("input, textarea, select").forEach(
                    (field, fieldIndex) => {
                        const key = getFormFieldKey(field, fieldIndex);
                        if (!fieldMap.has(key)) return;
                        writeFormFieldValue(field, fieldMap.get(key));
                    },
                );
            });
    }

    /**
     * @param {Map<string, Map<string, (string|boolean)>>} source
     * @returns {Map<string, Map<string, (string|boolean)>>}
     */
    function cloneFormStateSnapshot(source) {
        if (!source || source.size === 0) return new Map();
        const clone = new Map();
        source.forEach((fieldMap, elementId) => {
            clone.set(elementId, new Map(fieldMap));
        });
        return clone;
    }

    /**
     * @param {Map<string, Map<string, (string|boolean)>>} baseSnapshot
     * @param {Map<string, Map<string, (string|boolean)>>} overrideSnapshot
     * @returns {Map<string, Map<string, (string|boolean)>>}
     */
    function mergeFormStateSnapshots(baseSnapshot, overrideSnapshot) {
        const merged = cloneFormStateSnapshot(baseSnapshot);
        if (!overrideSnapshot || overrideSnapshot.size === 0) {
            return merged;
        }
        overrideSnapshot.forEach((fieldMap, elementId) => {
            const mergedFieldMap = new Map(merged.get(elementId) ?? []);
            fieldMap.forEach((value, fieldKey) => {
                mergedFieldMap.set(fieldKey, value);
            });
            if (mergedFieldMap.size > 0) {
                merged.set(elementId, mergedFieldMap);
            }
        });
        return merged;
    }

    /**
     * @param {Map<string, Map<string, (string|boolean)>>} snapshot
     * @returns {Record<string, Record<string, (string|boolean)>>}
     */
    function serializeFormStateSnapshot(snapshot) {
        const serialized = {};
        if (!snapshot || snapshot.size === 0) {
            return serialized;
        }
        snapshot.forEach((fieldMap, elementId) => {
            const record = {};
            fieldMap.forEach((value, fieldKey) => {
                record[fieldKey] = value;
            });
            if (Object.keys(record).length > 0) {
                serialized[elementId] = record;
            }
        });
        return serialized;
    }

    /**
     * @param {unknown} rawValue
     * @returns {Map<string, Map<string, (string|boolean)>>}
     */
    function deserializeFormStateSnapshot(rawValue) {
        if (
            !rawValue ||
            typeof rawValue !== "object" ||
            Array.isArray(rawValue)
        ) {
            return new Map();
        }
        const snapshot = new Map();
        for (const [elementId, fieldValue] of Object.entries(rawValue)) {
            if (
                !fieldValue ||
                typeof fieldValue !== "object" ||
                Array.isArray(fieldValue)
            ) {
                continue;
            }
            const fieldMap = new Map();
            for (const [fieldKey, value] of Object.entries(fieldValue)) {
                if (typeof value === "string" || typeof value === "boolean") {
                    fieldMap.set(fieldKey, value);
                }
            }
            if (fieldMap.size > 0) {
                snapshot.set(elementId, fieldMap);
            }
        }
        return snapshot;
    }

    function getDraftStorageScope(scopeKey) {
        const account = localStorage.getItem("cognis_account");
        if (!account || !scopeKey) {
            return null;
        }
        const pagePath = window.location.pathname || "";
        return `${FORM_DRAFT_STORAGE_PREFIX}:${account}:${pagePath}:${scopeKey}`;
    }

    function loadPersistedFormState(scopeKey) {
        const storageScope = getDraftStorageScope(scopeKey);
        if (!storageScope) {
            return new Map();
        }
        try {
            const raw = localStorage.getItem(storageScope);
            if (!raw) return new Map();
            return deserializeFormStateSnapshot(JSON.parse(raw));
        } catch {
            return new Map();
        }
    }

    function savePersistedFormState(scopeKey, snapshot) {
        const storageScope = getDraftStorageScope(scopeKey);
        if (!storageScope) {
            return;
        }
        const serialized = serializeFormStateSnapshot(snapshot);
        if (Object.keys(serialized).length === 0) {
            localStorage.removeItem(storageScope);
            return;
        }
        localStorage.setItem(storageScope, JSON.stringify(serialized));
    }

    function clearPersistedFormState(scopeKey, elementId = null) {
        const storageScope = getDraftStorageScope(scopeKey);
        if (!storageScope) {
            return;
        }
        if (!elementId) {
            localStorage.removeItem(storageScope);
            return;
        }
        const nextSnapshot = loadPersistedFormState(scopeKey);
        nextSnapshot.delete(elementId);
        savePersistedFormState(scopeKey, nextSnapshot);
    }

    function resetFormFieldsInCard(card) {
        card.querySelectorAll("input, textarea, select").forEach((field) => {
            if (field.type === "file") return;
            if (field.type === "checkbox" || field.type === "radio") {
                field.checked = field.defaultChecked;
                return;
            }
            const defaultValue =
                typeof field.defaultValue === "string"
                    ? field.defaultValue
                    : "";
            field.value = defaultValue;
        });
    }

    function bindDraftResetButton(card, scopeKey) {
        const fields = Array.from(
            card.querySelectorAll("input, textarea, select"),
        );
        const persistableFields = fields.filter(
            (field) => !isSensitiveDraftField(field) && field.type !== "file",
        );
        if (persistableFields.length < LARGE_FORM_RESET_FIELD_THRESHOLD) {
            card.querySelector("[data-composer-draft-reset-wrapper]")?.remove();
            return;
        }
        if (card.querySelector("[data-composer-draft-reset-wrapper]")) {
            return;
        }
        const elementId = card.dataset.composerElement;
        if (!elementId) return;
        const wrapper = document.createElement("div");
        wrapper.className = "composer-form-draft-actions";
        wrapper.dataset.composerDraftResetWrapper = "true";
        const button = document.createElement("button");
        button.type = "button";
        button.className = "composer-form-draft-reset-btn";
        button.textContent = `↺ ${i18n.t("ui.reuse.reset_draft")}`;
        button.setAttribute("aria-label", i18n.t("ui.reuse.reset_draft"));
        button.addEventListener("click", () => {
            resetFormFieldsInCard(card);
            clearPersistedFormState(scopeKey, elementId);
        });
        wrapper.appendChild(button);
        const firstForm = card.querySelector("form");
        if (firstForm) {
            firstForm.appendChild(wrapper);
        } else {
            card.appendChild(wrapper);
        }
    }

    function bindFormDraftPersistence(container, scopeKey) {
        if (!scopeKey) return;
        const persistDraftSnapshot = () => {
            const snapshot = captureFormState(container, {
                persistableOnly: true,
            });
            savePersistedFormState(scopeKey, snapshot);
        };
        container
            .querySelectorAll("[data-composer-element]")
            .forEach((card) => {
                const elementId = card.dataset.composerElement;
                if (!elementId) return;
                card.querySelectorAll("input, textarea, select").forEach(
                    (field) => {
                        if (field.type === "file") return;
                        field.addEventListener("input", persistDraftSnapshot);
                        field.addEventListener("change", persistDraftSnapshot);
                    },
                );
                card.querySelectorAll("form").forEach((form) => {
                    form.addEventListener("submit", () => {
                        clearPersistedFormState(scopeKey, elementId);
                    });
                });
                bindDraftResetButton(card, scopeKey);
            });
        persistDraftSnapshot();
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

    /**
     * Resolves a stable column count by trying progressively broader width
     * containers. This prevents transient 0-width reads during init from
     * incorrectly selecting a narrow layout profile.
     *
     * @returns {number}
     */
    function getPreferredGridColumnCount() {
        const widthCandidates = [];
        if (contentGrid) {
            contentGrid.style.width = "";
        }
        widthCandidates.push(
            contentGrid ? contentGrid.getBoundingClientRect().width : 0,
        );
        widthCandidates.push(
            contentGrid?.parentElement?.getBoundingClientRect().width ?? 0,
        );
        widthCandidates.push(
            root.querySelector(".main-window")?.getBoundingClientRect().width ??
                0,
        );
        widthCandidates.push(
            root.querySelector(".workspace")?.getBoundingClientRect().width ??
                0,
        );
        widthCandidates.push(window.innerWidth);
        const resolvedWidth = widthCandidates.find(
            (width) => Number.isFinite(width) && width > 0,
        );
        return Math.max(1, Math.floor((resolvedWidth ?? UNIT) / UNIT));
    }

    function getGridSize(el) {
        const maxVal = el.gridSize?.max;

        if (maxVal === "full") {
            return {
                default: el.gridSize.default ?? [4, 3],
                min: el.gridSize.min ?? [2, 2],
                max: null,
                fullWidth: true,
                fillWidth: false,
                halfWidth: false,
                halfHeight: false,
                fillHeight: false,
            };
        }

        if (maxVal === "fill") {
            return {
                default: el.gridSize?.default ?? [4, 3],
                min: el.gridSize?.min ?? [2, 2],
                max: null,
                fullWidth: false,
                fillWidth: true,
                halfWidth: false,
                halfHeight: false,
                fillHeight: false,
            };
        }

        if (maxVal === "half") {
            return {
                default: el.gridSize?.default ?? [4, 3],
                min: el.gridSize?.min ?? [2, 2],
                max: null,
                fullWidth: false,
                fillWidth: false,
                halfWidth: true,
                halfHeight: false,
                fillHeight: false,
            };
        }

        let resolvedMax = maxVal ?? null;
        let halfWidth = false;
        let halfHeight = false;
        let fillWidth = false;
        let fillHeight = false;

        if (Array.isArray(maxVal)) {
            halfWidth = maxVal[0] === "half";
            fillWidth = maxVal[0] === "fill";
            halfHeight = maxVal[1] === "half";
            fillHeight = maxVal[1] === "fill";
            const resolvedWidth =
                halfWidth || fillWidth ? null : (maxVal[0] ?? null);
            const resolvedHeight =
                halfHeight || fillHeight ? null : (maxVal[1] ?? null);
            resolvedMax =
                resolvedWidth === null && resolvedHeight === null
                    ? null
                    : [resolvedWidth, resolvedHeight];
        }

        return {
            default: el.gridSize?.default ?? [4, 3],
            min: el.gridSize?.min ?? [2, 2],
            max: resolvedMax,
            fullWidth: false,
            fillWidth,
            halfWidth,
            halfHeight,
            fillHeight,
        };
    }

    function computeGridDimensions() {
        if (!contentGrid) return;
        contentGrid.style.width = "";
        const width = contentGrid.getBoundingClientRect().width;
        gridCols = Math.max(1, Math.floor(width / UNIT));
        const visiblePlacements = (layout?.placements ?? []).filter(
            (p) => !(layout?.hidden ?? []).includes(p.id),
        );
        const maxBottom = visiblePlacements.reduce(
            (m, p) => Math.max(m, p.row + p.h),
            0,
        );
        const extra = editing ? 1 : 0;
        gridRows = Math.max(
            editing ? Math.max(3, maxBottom + 2) : 1,
            maxBottom + extra,
        );
        contentGrid.style.minHeight =
            frameless && !editing ? "" : `${gridRows * UNIT}px`;
        contentGrid.style.width = editing ? `${gridCols * UNIT}px` : "";
        if (editing && gridSection) {
            gridSection.style.minHeight = `${gridRows * UNIT}px`;
            gridSection.style.width = `${gridCols * UNIT}px`;
        }
    }

    function canPlace(col, row, w, h, excludeId) {
        if (col < 0 || row < 0 || col + w > gridCols) return false;
        const cells = buildOccupiedSet(
            layout?.placements ?? [],
            layout?.hidden ?? [],
            excludeId,
        );
        return checkPlacement(cells, col, row, w, h);
    }

    function applyGravity(col, row, w, h, excludeId) {
        const step = gridStep(gridRows);
        for (let r = 0; r <= row; r += step) {
            if (canPlace(col, r, w, h, excludeId)) return r;
        }
        return row;
    }

    function findSwapCandidate(col, row, w, h, excludeId) {
        const displaced = [];
        for (const placement of layout?.placements ?? []) {
            if (placement.id === excludeId) continue;
            if ((layout?.hidden ?? []).includes(placement.id)) continue;
            const overlapsH =
                col < placement.col + placement.w && col + w > placement.col;
            const overlapsV =
                row < placement.row + placement.h && row + h > placement.row;
            if (overlapsH && overlapsV) displaced.push(placement);
        }
        if (displaced.length !== 1) return null;
        const candidate = displaced[0];
        const source = layout.placements.find((p) => p.id === excludeId);
        if (!source) return null;
        if (source.col + candidate.w > gridCols) return null;
        const others = (layout?.placements ?? []).filter(
            (p) =>
                p.id !== excludeId &&
                p.id !== candidate.id &&
                !(layout?.hidden ?? []).includes(p.id),
        );
        const occupied = buildOccupiedSet(others, [], null);
        if (
            !checkPlacement(
                occupied,
                source.col,
                source.row,
                candidate.w,
                candidate.h,
            )
        )
            return null;
        const postSwapColsOverlap =
            candidate.col < source.col + candidate.w &&
            candidate.col + w > source.col;
        const postSwapRowsOverlap =
            candidate.row < source.row + candidate.h &&
            candidate.row + h > source.row;
        if (postSwapColsOverlap && postSwapRowsOverlap) return null;
        return candidate;
    }

    function buildDropZoneLine(srcCol, srcRow, candidate, tgtCol, tgtRow) {
        const line = document.createElement("div");
        line.className = "composer-dropzone-line";
        const dCol = Math.abs(tgtCol - srcCol);
        const dRow = Math.abs(tgtRow - srcRow);
        if (dCol >= dRow) {
            line.classList.add("composer-dropzone-line--v");
            const lineX =
                tgtCol >= srcCol
                    ? (candidate.col + candidate.w) * UNIT
                    : candidate.col * UNIT;
            line.style.left = `${lineX}px`;
            line.style.top = `${candidate.row * UNIT}px`;
            line.style.height = `${candidate.h * UNIT}px`;
        } else {
            line.classList.add("composer-dropzone-line--h");
            const lineY =
                tgtRow >= srcRow
                    ? (candidate.row + candidate.h) * UNIT
                    : candidate.row * UNIT;
            line.style.top = `${lineY}px`;
            line.style.left = `${candidate.col * UNIT}px`;
            line.style.width = `${candidate.w * UNIT}px`;
        }
        return line;
    }

    function initializePlacements() {
        if (!layout.placements) layout.placements = [];
        if (!layout.hidden) layout.hidden = [];
        layout.placements = layout.placements.filter((p) =>
            elements.some((e) => e.id === p.id),
        );
        layout.hidden = layout.hidden.filter((id) =>
            elements.some((e) => e.id === id),
        );
        for (const element of elements) {
            if (layout.hidden.includes(element.id)) continue;
            if (layout.placements.some((p) => p.id === element.id)) continue;
            if (element.defaultHidden && !element.pinned) {
                layout.hidden.push(element.id);
                continue;
            }
            const gridSize = getGridSize(element);
            const cStep = gridStep(gridCols);
            const rStep = gridStep(gridRows);
            const baseW = gridSize.fullWidth
                ? gridCols
                : gridSize.halfWidth
                  ? Math.max(gridSize.min[0], halfGrid(gridCols))
                  : Math.min(gridSize.default[0], gridCols);
            const baseH = gridSize.halfHeight
                ? Math.max(gridSize.min[1], halfGrid(gridRows))
                : gridSize.default[1];
            let placed = false;
            for (let row = 0; !placed; row += rStep) {
                const colLimit = gridSize.fillWidth
                    ? gridCols
                    : Math.max(0, gridCols - baseW);
                for (let col = 0; col <= colLimit; col += cStep) {
                    const w = gridSize.fillWidth
                        ? Math.max(gridSize.min[0], gridCols - col)
                        : gridSize.halfWidth && col + baseW + cStep === gridCols
                          ? baseW + cStep
                          : baseW;
                    const h = gridSize.fillHeight
                        ? Math.max(gridSize.min[1], gridRows - row)
                        : baseH;
                    if (canPlace(col, row, w, h, null)) {
                        layout.placements.push({
                            id: element.id,
                            col,
                            row,
                            w,
                            h,
                        });
                        placed = true;
                        break;
                    }
                }
            }
        }
    }

    function createGridOverlay() {
        const overlay = document.createElement("div");
        overlay.className = "composer-grid-overlay";
        overlay.style.left = "0";
        overlay.style.top = "0";
        overlay.style.width = `${gridCols * UNIT}px`;
        overlay.style.height = `${gridRows * UNIT}px`;
        const cStep = gridStep(gridCols);
        const rStep = gridStep(gridRows);
        const cellW = UNIT * cStep;
        const cellH = UNIT * rStep;
        for (let r = 0; r < gridRows; r += rStep) {
            for (let c = 0; c < gridCols; c += cStep) {
                const cell = document.createElement("div");
                cell.className =
                    cStep < 1 || rStep < 1
                        ? "composer-grid-cell composer-grid-cell--half"
                        : "composer-grid-cell";
                cell.style.left = `${c * UNIT}px`;
                cell.style.top = `${r * UNIT}px`;
                cell.style.width = `${cellW}px`;
                cell.style.height = `${cellH}px`;
                overlay.appendChild(cell);
            }
        }
        return overlay;
    }

    function createCell(el, placement) {
        const cell = document.createElement("div");
        cell.className = "composer-cell";
        cell.dataset.composerElement = el.id;
        cell.style.left = `${placement.col * UNIT}px`;
        cell.style.top = `${placement.row * UNIT}px`;
        cell.style.width = `${placement.w * UNIT}px`;
        cell.style.height = `${placement.h * UNIT}px`;

        if (editing) {
            cell.classList.add("composer-cell--editable");

            cell.addEventListener("pointerdown", (e) => {
                if (e.button !== 0) return;
                if (e.target.closest("button")) return;
                e.preventDefault();
                cell.setPointerCapture(e.pointerId);

                const shade = document.createElement("div");
                shade.className = "composer-shade";
                shade.style.left = `${placement.col * UNIT}px`;
                shade.style.top = `${placement.row * UNIT}px`;
                shade.style.width = `${placement.w * UNIT}px`;
                shade.style.height = `${placement.h * UNIT}px`;
                gridSection.appendChild(shade);

                cell.classList.add("composer-cell--dragging");

                let currentCol = placement.col;
                let currentRow = placement.row;
                let swapTarget = null;
                let dropZoneLine = null;

                function onMove(e) {
                    const panel = document.getElementById(
                        "composer-elements-panel",
                    );
                    const overPanel =
                        panel &&
                        (() => {
                            const panelRect = panel.getBoundingClientRect();
                            return (
                                e.clientX >= panelRect.left &&
                                e.clientX <= panelRect.right &&
                                e.clientY >= panelRect.top &&
                                e.clientY <= panelRect.bottom
                            );
                        })();

                    if (dropZoneLine) {
                        dropZoneLine.remove();
                        dropZoneLine = null;
                    }
                    swapTarget = null;

                    if (overPanel && !el.pinned) {
                        shade.classList.add("composer-shade--invalid");
                        panel?.classList.add("composer-panel--drop-target");
                        return;
                    }
                    shade.classList.remove("composer-shade--invalid");
                    panel?.classList.remove("composer-panel--drop-target");

                    const gridRect = gridSection.getBoundingClientRect();
                    const x = e.clientX - gridRect.left;
                    const y = e.clientY - gridRect.top;
                    const col = Math.max(
                        0,
                        Math.min(
                            gridCols - placement.w,
                            snapGridRound(x / UNIT - placement.w / 2, gridCols),
                        ),
                    );
                    const rawRow = Math.max(
                        0,
                        snapGridRound(y / UNIT - placement.h / 2, gridRows),
                    );

                    if (rawRow + placement.h > gridRows) {
                        gridRows = rawRow + placement.h + 1;
                        gridSection.style.minHeight = `${gridRows * UNIT}px`;
                    }

                    currentCol = col;
                    currentRow = rawRow;
                    shade.style.left = `${col * UNIT}px`;
                    shade.style.top = `${rawRow * UNIT}px`;

                    if (
                        !canPlace(col, rawRow, placement.w, placement.h, el.id)
                    ) {
                        const candidate = findSwapCandidate(
                            col,
                            rawRow,
                            placement.w,
                            placement.h,
                            el.id,
                        );
                        if (candidate) {
                            swapTarget = candidate;
                            dropZoneLine = buildDropZoneLine(
                                placement.col,
                                placement.row,
                                candidate,
                                col,
                                rawRow,
                            );
                            gridSection.appendChild(dropZoneLine);
                        } else {
                            shade.classList.add("composer-shade--invalid");
                        }
                    }
                }

                async function onUp(e) {
                    cell.removeEventListener("pointermove", onMove);
                    cell.removeEventListener("pointerup", onUp);
                    cell.removeEventListener("pointercancel", onUp);
                    document
                        .getElementById("composer-elements-panel")
                        ?.classList.remove("composer-panel--drop-target");
                    if (dropZoneLine) {
                        dropZoneLine.remove();
                        dropZoneLine = null;
                    }
                    shade.remove();
                    cell.classList.remove("composer-cell--dragging");

                    const panel = document.getElementById(
                        "composer-elements-panel",
                    );
                    const overPanel =
                        panel &&
                        (() => {
                            const panelRect = panel.getBoundingClientRect();
                            return (
                                e.clientX >= panelRect.left &&
                                e.clientX <= panelRect.right &&
                                e.clientY >= panelRect.top &&
                                e.clientY <= panelRect.bottom
                            );
                        })();

                    if (overPanel && !el.pinned) {
                        layout.hidden.push(el.id);
                        layout.placements = layout.placements.filter(
                            (p) => p.id !== el.id,
                        );
                        renderGridComposer();
                        return;
                    }

                    const currentSwapTarget = swapTarget;
                    swapTarget = null;

                    if (currentSwapTarget) {
                        const targetPlacement = layout.placements.find(
                            (lp) => lp.id === el.id,
                        );
                        const swapPlacement = layout.placements.find(
                            (lp) => lp.id === currentSwapTarget.id,
                        );
                        if (targetPlacement && swapPlacement) {
                            const oldCol = targetPlacement.col;
                            const oldRow = targetPlacement.row;
                            targetPlacement.col = currentSwapTarget.col;
                            targetPlacement.row = currentSwapTarget.row;
                            swapPlacement.col = oldCol;
                            swapPlacement.row = oldRow;
                            renderGridComposer();
                        }
                    } else {
                        const moved =
                            currentCol !== placement.col ||
                            currentRow !== placement.row;
                        if (
                            moved &&
                            canPlace(
                                currentCol,
                                currentRow,
                                placement.w,
                                placement.h,
                                el.id,
                            )
                        ) {
                            const targetPlacement = layout.placements.find(
                                (lp) => lp.id === el.id,
                            );
                            if (targetPlacement) {
                                targetPlacement.col = currentCol;
                                targetPlacement.row = currentRow;
                            }
                            renderGridComposer();
                        }
                    }
                }

                cell.addEventListener("pointermove", onMove);
                cell.addEventListener("pointerup", onUp);
                cell.addEventListener("pointercancel", onUp);
            });

            if (!el.pinned) {
                const closeBtn = document.createElement("button");
                closeBtn.className = "composer-close-btn";
                closeBtn.type = "button";
                closeBtn.textContent = "×";
                closeBtn.setAttribute("aria-label", i18n.t("ui.reuse.remove"));
                closeBtn.addEventListener("pointerdown", (e) =>
                    e.stopPropagation(),
                );
                closeBtn.addEventListener("click", () => {
                    layout.hidden.push(el.id);
                    layout.placements = layout.placements.filter(
                        (p) => p.id !== el.id,
                    );
                    renderGridComposer();
                });
                cell.appendChild(closeBtn);
            }
        }

        const content = document.createElement("div");
        content.className = "widget-card composer-cell-content";
        content.innerHTML = el.render();
        cell.appendChild(content);

        if (editing) {
            const gridSize = getGridSize(el);
            const canResizeE =
                !gridSize.fullWidth &&
                (!gridSize.max || gridSize.max[0] > gridSize.min[0]);
            const canResizeS =
                !gridSize.max || gridSize.max[1] > gridSize.min[1];

            if (canResizeE) {
                const handleE = document.createElement("div");
                handleE.className = "composer-resize-handle composer-resize-e";
                bindResizeHandle(handleE, "e", el, placement);
                cell.appendChild(handleE);
            }
            if (canResizeS) {
                const handleS = document.createElement("div");
                handleS.className = "composer-resize-handle composer-resize-s";
                bindResizeHandle(handleS, "s", el, placement);
                cell.appendChild(handleS);
            }
            if (canResizeE && canResizeS) {
                const handleSE = document.createElement("div");
                handleSE.className =
                    "composer-resize-handle composer-resize-se";
                bindResizeHandle(handleSE, "se", el, placement);
                cell.appendChild(handleSE);
            }
        }

        return cell;
    }

    function bindResizeHandle(handle, direction, el, placement) {
        handle.addEventListener("pointerdown", (e) => {
            if (e.button !== 0) return;
            e.preventDefault();
            e.stopPropagation();
            handle.setPointerCapture(e.pointerId);

            const gridSize = getGridSize(el);

            const shade = document.createElement("div");
            shade.className = "composer-shade";
            shade.style.left = `${placement.col * UNIT}px`;
            shade.style.top = `${placement.row * UNIT}px`;
            shade.style.width = `${placement.w * UNIT}px`;
            shade.style.height = `${placement.h * UNIT}px`;
            gridSection.appendChild(shade);

            const cell = handle.closest(".composer-cell");
            cell.classList.add("composer-cell--resizing");

            let currentW = placement.w;
            let currentH = placement.h;

            function clampValue(val, min, max) {
                if (max != null) return Math.max(min, Math.min(max, val));
                return Math.max(min, val);
            }

            function onMove(e) {
                const gridRect = gridSection.getBoundingClientRect();
                const x = e.clientX - gridRect.left;
                const y = e.clientY - gridRect.top;
                if (direction === "e" || direction === "se") {
                    const rawW = snapGridRound(
                        (x - placement.col * UNIT) / UNIT,
                        gridCols,
                    );
                    const maxW = gridSize.max
                        ? gridSize.max[0]
                        : gridCols - placement.col;
                    currentW = clampValue(
                        rawW,
                        gridSize.min[0],
                        Math.min(maxW, gridCols - placement.col),
                    );
                }
                if (direction === "s" || direction === "se") {
                    const rawH = snapGridRound(
                        (y - placement.row * UNIT) / UNIT,
                        gridRows,
                    );
                    currentH = clampValue(
                        rawH,
                        gridSize.min[1],
                        gridSize.max ? gridSize.max[1] : null,
                    );
                }
                shade.style.width = `${currentW * UNIT}px`;
                shade.style.height = `${currentH * UNIT}px`;
                shade.classList.toggle(
                    "composer-shade--invalid",
                    !canPlace(
                        placement.col,
                        placement.row,
                        currentW,
                        currentH,
                        el.id,
                    ),
                );
            }

            function onUp() {
                handle.removeEventListener("pointermove", onMove);
                handle.removeEventListener("pointerup", onUp);
                handle.removeEventListener("pointercancel", onUp);
                shade.remove();
                cell.classList.remove("composer-cell--resizing");
                const sizeChanged =
                    currentW !== placement.w || currentH !== placement.h;
                const valid = canPlace(
                    placement.col,
                    placement.row,
                    currentW,
                    currentH,
                    el.id,
                );
                if (sizeChanged && valid) {
                    const targetPlacement = layout.placements.find(
                        (lp) => lp.id === el.id,
                    );
                    if (targetPlacement) {
                        targetPlacement.w = currentW;
                        targetPlacement.h = currentH;
                    }
                    renderGridComposer();
                }
            }

            handle.addEventListener("pointermove", onMove);
            handle.addEventListener("pointerup", onUp);
            handle.addEventListener("pointercancel", onUp);
        });
    }

    function canPlaceInSet(set, col, row, w, h) {
        if (col < 0 || row < 0 || col + w > gridCols) return false;
        const cells = buildOccupiedSet(set, [], null);
        return checkPlacement(cells, col, row, w, h);
    }

    function compactPlacements() {
        const visible = layout.placements.filter(
            (p) => !layout.hidden.includes(p.id),
        );
        visible.sort((a, b) => a.row - b.row || a.col - b.col);
        const rStep = gridStep(gridRows);
        const settled = [];
        for (const placement of visible) {
            let bestRow = placement.row;
            for (let r = 0; r < placement.row; r += rStep) {
                if (
                    canPlaceInSet(
                        settled,
                        placement.col,
                        r,
                        placement.w,
                        placement.h,
                    )
                ) {
                    bestRow = r;
                    break;
                }
            }
            settled.push({ ...placement, row: bestRow });
        }
        for (const placement of settled) {
            const orig = layout.placements.find((lp) => lp.id === placement.id);
            if (orig) orig.row = placement.row;
        }
    }

    function bindPanelItemDrag(item, el) {
        item.addEventListener("pointerdown", (e) => {
            if (e.button !== 0) return;
            e.preventDefault();
            item.setPointerCapture(e.pointerId);

            const gridSize = getGridSize(el);
            const w =
                gridSize.fullWidth || gridSize.fillWidth
                    ? gridCols
                    : gridSize.halfWidth
                      ? Math.max(gridSize.min[0], halfGrid(gridCols))
                      : Math.min(gridSize.default[0], gridCols);
            const h = gridSize.fillHeight
                ? gridRows
                : gridSize.halfHeight
                  ? Math.max(gridSize.min[1], halfGrid(gridRows))
                  : gridSize.default[1];

            let shade = null;
            let currentCol = -1;
            let currentRow = -1;
            let overGrid = false;

            function onMove(e) {
                const gridRect = gridSection.getBoundingClientRect();
                const x = e.clientX - gridRect.left;
                const y = e.clientY - gridRect.top;
                const inGrid = x >= 0 && x <= gridRect.width && y >= 0;

                if (inGrid) {
                    if (!shade) {
                        shade = document.createElement("div");
                        shade.className = "composer-shade";
                        shade.style.width = `${w * UNIT}px`;
                        shade.style.height = `${h * UNIT}px`;
                        gridSection.appendChild(shade);
                    }
                    const col = Math.max(
                        0,
                        Math.min(gridCols - w, snapGridFloor(x, gridCols)),
                    );
                    const rawRow = Math.max(0, snapGridFloor(y, gridRows));
                    const row = applyGravity(col, rawRow, w, h, null);
                    currentCol = col;
                    currentRow = row;
                    shade.style.left = `${col * UNIT}px`;
                    shade.style.top = `${row * UNIT}px`;
                    shade.classList.toggle(
                        "composer-shade--invalid",
                        !canPlace(col, row, w, h, null),
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
                if (overGrid && canPlace(currentCol, currentRow, w, h, null)) {
                    layout.hidden = layout.hidden.filter((id) => id !== el.id);
                    layout.placements.push({
                        id: el.id,
                        col: currentCol,
                        row: currentRow,
                        w,
                        h,
                    });
                    renderGridComposer();
                }
            }

            item.addEventListener("pointermove", onMove);
            item.addEventListener("pointerup", onUp);
            item.addEventListener("pointercancel", onUp);
        });
    }

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
                panelPosition = { top: newTop, left: newLeft };
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
            root.querySelector(".global-navrow")?.getBoundingClientRect()
                ?.bottom ?? 0;
        const topbarBottom =
            root.querySelector(".global-topbar")?.getBoundingClientRect()
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
        const workspaceRect = root
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
        const hiddenElements = elements.filter((e) =>
            layout.hidden.includes(e.id),
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
                        `<li class="composer-library-item" data-composer-panel-item="${el.id}"><span>${el.label}</span></li>`,
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
        <button class="composer-discard-btn" type="button">${i18n.t("ui.reuse.discard")}</button>
        <button class="composer-done-btn" type="button">${i18n.t("ui.reuse.done")}</button>
        <button class="composer-reset-btn" type="button">↺ ${i18n.t("ui.reuse.reset_layout")}</button>
      </div>
    `;

        const safeTop = getComposerPanelSafeTop();
        if (panelPosition !== null) {
            panel.style.top = `${Math.max(safeTop, panelPosition.top)}px`;
            panel.style.left = `${clampComposerPanelLeft(panelPosition.left, 240)}px`;
            panel.style.right = "auto";
        } else {
            const gridRect = contentGrid.getBoundingClientRect();
            const panelLeft = clampComposerPanelLeft(gridRect.right + 12, 240);
            const panelTop = gridRect.top;
            panel.style.top = `${Math.max(safeTop, panelTop)}px`;
            panel.style.left = `${panelLeft}px`;
            panel.style.right = "auto";
        }
        document.body.appendChild(panel);
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
            .addEventListener("click", async () => {
                compactPlacements();
                editing = false;
                endEditMode();
                await saveLayout();
                renderGridComposer();
            });

        panel
            .querySelector(".composer-discard-btn")
            .addEventListener("click", () => {
                layout = layoutSnapshot;
                editing = false;
                endEditMode();
                renderGridComposer();
            });

        panel
            .querySelector(".composer-reset-btn")
            .addEventListener("click", async () => {
                layout = { placements: [], hidden: [] };
                initializePlacements();
                layoutSnapshot = JSON.parse(JSON.stringify(layout));
                await saveLayout();
                renderGridComposer();
            });

        panel.querySelectorAll("[data-composer-panel-item]").forEach((item) => {
            const elId = item.dataset.composerPanelItem;
            const element = elements.find((e) => e.id === elId);
            if (element) bindPanelItemDrag(item, element);
        });
    }

    const subStates = new Map();

    async function loadLayoutFor(key, gridColumnCount) {
        return loadLayoutByKey(key, gridColumnCount);
    }

    async function saveLayoutFor(key, profiles, gridColumnCount, layoutData) {
        return saveLayoutByKey(key, profiles, gridColumnCount, layoutData);
    }

    function getSubPanelId(preferenceKey) {
        return (
            "composer-elements-panel-" +
            preferenceKey.replace(/[^a-z0-9]/g, "-")
        );
    }

    function computeSubGridDimensions(state) {
        if (!state.container) return;
        state.container.style.width = "";
        const width = state.container.getBoundingClientRect().width;
        state.gridCols = Math.max(1, Math.floor(width / UNIT));
        const visiblePlacements = (state.layout?.placements ?? []).filter(
            (p) => !(state.layout?.hidden ?? []).includes(p.id),
        );
        const maxBottom = visiblePlacements.reduce(
            (m, p) => Math.max(m, p.row + p.h),
            0,
        );
        const extra = state.editing ? 1 : 0;
        state.gridRows = Math.max(
            state.editing ? Math.max(3, maxBottom + 2) : 1,
            maxBottom + extra,
        );
        state.container.style.minHeight = `${state.gridRows * UNIT}px`;
        state.container.style.width = `${state.gridCols * UNIT}px`;
    }

    function canSubPlace(state, col, row, w, h, excludeId) {
        if (col < 0 || row < 0 || col + w > state.gridCols) return false;
        const cells = buildOccupiedSet(
            state.layout?.placements ?? [],
            state.layout?.hidden ?? [],
            excludeId,
        );
        return checkPlacement(cells, col, row, w, h);
    }

    function canSubPlaceInSet(state, set, col, row, w, h) {
        if (col < 0 || row < 0 || col + w > state.gridCols) return false;
        const cells = buildOccupiedSet(set, [], null);
        return checkPlacement(cells, col, row, w, h);
    }

    function findSubSwapCandidate(state, col, row, w, h, excludeId) {
        const displaced = [];
        for (const placement of state.layout?.placements ?? []) {
            if (placement.id === excludeId) continue;
            if ((state.layout?.hidden ?? []).includes(placement.id)) continue;
            const overlapsH =
                col < placement.col + placement.w && col + w > placement.col;
            const overlapsV =
                row < placement.row + placement.h && row + h > placement.row;
            if (overlapsH && overlapsV) displaced.push(placement);
        }
        if (displaced.length !== 1) return null;
        const candidate = displaced[0];
        const source = state.layout.placements.find((p) => p.id === excludeId);
        if (!source) return null;
        if (source.col + candidate.w > state.gridCols) return null;
        const others = (state.layout?.placements ?? []).filter(
            (p) =>
                p.id !== excludeId &&
                p.id !== candidate.id &&
                !(state.layout?.hidden ?? []).includes(p.id),
        );
        const occupied = buildOccupiedSet(others, [], null);
        if (
            !checkPlacement(
                occupied,
                source.col,
                source.row,
                candidate.w,
                candidate.h,
            )
        )
            return null;
        const postSwapColsOverlap =
            candidate.col < source.col + candidate.w &&
            candidate.col + w > source.col;
        const postSwapRowsOverlap =
            candidate.row < source.row + candidate.h &&
            candidate.row + h > source.row;
        if (postSwapColsOverlap && postSwapRowsOverlap) return null;
        return candidate;
    }

    function initializeSubPlacements(state) {
        if (!state.layout.placements) state.layout.placements = [];
        if (!state.layout.hidden) state.layout.hidden = [];
        state.layout.placements = state.layout.placements.filter((p) =>
            state.elements.some((e) => e.id === p.id),
        );
        state.layout.hidden = state.layout.hidden.filter((id) =>
            state.elements.some((e) => e.id === id),
        );
        for (const element of state.elements) {
            if (state.layout.hidden.includes(element.id)) continue;
            if (state.layout.placements.some((p) => p.id === element.id))
                continue;
            if (element.defaultHidden && !element.pinned) {
                state.layout.hidden.push(element.id);
                continue;
            }
            const gridSize = getGridSize(element);
            const cStep = gridStep(state.gridCols);
            const rStep = gridStep(state.gridRows);
            const baseW = gridSize.fullWidth
                ? state.gridCols
                : gridSize.halfWidth
                  ? Math.max(gridSize.min[0], halfGrid(state.gridCols))
                  : Math.min(gridSize.default[0], state.gridCols);
            const baseH = gridSize.halfHeight
                ? Math.max(gridSize.min[1], halfGrid(state.gridRows))
                : gridSize.default[1];
            let placed = false;
            for (let row = 0; !placed; row += rStep) {
                const colLimit = gridSize.fillWidth
                    ? state.gridCols
                    : Math.max(0, state.gridCols - baseW);
                for (let col = 0; col <= colLimit; col += cStep) {
                    const w = gridSize.fillWidth
                        ? Math.max(gridSize.min[0], state.gridCols - col)
                        : gridSize.halfWidth &&
                            col + baseW + cStep === state.gridCols
                          ? baseW + cStep
                          : baseW;
                    const h = gridSize.fillHeight
                        ? Math.max(gridSize.min[1], state.gridRows - row)
                        : baseH;
                    if (canSubPlace(state, col, row, w, h, null)) {
                        state.layout.placements.push({
                            id: element.id,
                            col,
                            row,
                            w,
                            h,
                        });
                        placed = true;
                        break;
                    }
                }
            }
        }
    }

    function compactSubPlacements(state) {
        const visible = state.layout.placements.filter(
            (p) => !state.layout.hidden.includes(p.id),
        );
        visible.sort((a, b) => a.row - b.row || a.col - b.col);
        const rStep = gridStep(state.gridRows);
        const settled = [];
        for (const placement of visible) {
            let bestRow = placement.row;
            for (let r = 0; r < placement.row; r += rStep) {
                if (
                    canSubPlaceInSet(
                        state,
                        settled,
                        placement.col,
                        r,
                        placement.w,
                        placement.h,
                    )
                ) {
                    bestRow = r;
                    break;
                }
            }
            settled.push({ ...placement, row: bestRow });
        }
        for (const placement of settled) {
            const orig = state.layout.placements.find(
                (lp) => lp.id === placement.id,
            );
            if (orig) orig.row = placement.row;
        }
    }

    function createSubGridOverlay(state) {
        const overlay = document.createElement("div");
        overlay.className = "composer-grid-overlay";
        overlay.style.left = "0";
        overlay.style.top = "0";
        overlay.style.width = `${state.gridCols * UNIT}px`;
        overlay.style.height = `${state.gridRows * UNIT}px`;
        const cStep = gridStep(state.gridCols);
        const rStep = gridStep(state.gridRows);
        const cellW = UNIT * cStep;
        const cellH = UNIT * rStep;
        for (let r = 0; r < state.gridRows; r += rStep) {
            for (let c = 0; c < state.gridCols; c += cStep) {
                const cell = document.createElement("div");
                cell.className =
                    cStep < 1 || rStep < 1
                        ? "composer-grid-cell composer-grid-cell--half"
                        : "composer-grid-cell";
                cell.style.left = `${c * UNIT}px`;
                cell.style.top = `${r * UNIT}px`;
                cell.style.width = `${cellW}px`;
                cell.style.height = `${cellH}px`;
                overlay.appendChild(cell);
            }
        }
        return overlay;
    }

    function bindSubResizeHandle(handle, direction, el, placement, state) {
        handle.addEventListener("pointerdown", (e) => {
            if (e.button !== 0) return;
            e.preventDefault();
            e.stopPropagation();
            handle.setPointerCapture(e.pointerId);

            const gridSize = getGridSize(el);

            const shade = document.createElement("div");
            shade.className = "composer-shade";
            shade.style.left = `${placement.col * UNIT}px`;
            shade.style.top = `${placement.row * UNIT}px`;
            shade.style.width = `${placement.w * UNIT}px`;
            shade.style.height = `${placement.h * UNIT}px`;
            state.container.appendChild(shade);

            const cell = handle.closest(".composer-cell");
            cell.classList.add("composer-cell--resizing");

            let currentW = placement.w;
            let currentH = placement.h;

            function clampValue(val, min, max) {
                if (max != null) return Math.max(min, Math.min(max, val));
                return Math.max(min, val);
            }

            function onMove(e) {
                const gridRect = state.container.getBoundingClientRect();
                const x = e.clientX - gridRect.left;
                const y = e.clientY - gridRect.top;
                if (direction === "e" || direction === "se") {
                    const rawW = snapGridRound(
                        (x - placement.col * UNIT) / UNIT,
                        state.gridCols,
                    );
                    const maxW = gridSize.max
                        ? gridSize.max[0]
                        : state.gridCols - placement.col;
                    currentW = clampValue(
                        rawW,
                        gridSize.min[0],
                        Math.min(maxW, state.gridCols - placement.col),
                    );
                }
                if (direction === "s" || direction === "se") {
                    const rawH = snapGridRound(
                        (y - placement.row * UNIT) / UNIT,
                        state.gridRows,
                    );
                    currentH = clampValue(
                        rawH,
                        gridSize.min[1],
                        gridSize.max ? gridSize.max[1] : null,
                    );
                }
                shade.style.width = `${currentW * UNIT}px`;
                shade.style.height = `${currentH * UNIT}px`;
                shade.classList.toggle(
                    "composer-shade--invalid",
                    !canSubPlace(
                        state,
                        placement.col,
                        placement.row,
                        currentW,
                        currentH,
                        el.id,
                    ),
                );
            }

            function onUp() {
                handle.removeEventListener("pointermove", onMove);
                handle.removeEventListener("pointerup", onUp);
                handle.removeEventListener("pointercancel", onUp);
                shade.remove();
                cell.classList.remove("composer-cell--resizing");
                const sizeChanged =
                    currentW !== placement.w || currentH !== placement.h;
                const valid = canSubPlace(
                    state,
                    placement.col,
                    placement.row,
                    currentW,
                    currentH,
                    el.id,
                );
                if (sizeChanged && valid) {
                    const targetPlacement = state.layout.placements.find(
                        (lp) => lp.id === el.id,
                    );
                    if (targetPlacement) {
                        targetPlacement.w = currentW;
                        targetPlacement.h = currentH;
                    }
                    renderSubGrid(state);
                }
            }

            handle.addEventListener("pointermove", onMove);
            handle.addEventListener("pointerup", onUp);
            handle.addEventListener("pointercancel", onUp);
        });
    }

    function createSubCell(el, placement, state) {
        const cell = document.createElement("div");
        cell.className = "composer-cell";
        cell.dataset.composerElement = el.id;
        cell.style.left = `${placement.col * UNIT}px`;
        cell.style.top = `${placement.row * UNIT}px`;
        cell.style.width = `${placement.w * UNIT}px`;
        cell.style.height = `${placement.h * UNIT}px`;

        if (state.editing) {
            cell.classList.add("composer-cell--editable");

            cell.addEventListener("pointerdown", (e) => {
                if (e.button !== 0) return;
                if (e.target.closest("button")) return;
                e.preventDefault();
                cell.setPointerCapture(e.pointerId);

                const shade = document.createElement("div");
                shade.className = "composer-shade";
                shade.style.left = `${placement.col * UNIT}px`;
                shade.style.top = `${placement.row * UNIT}px`;
                shade.style.width = `${placement.w * UNIT}px`;
                shade.style.height = `${placement.h * UNIT}px`;
                state.container.appendChild(shade);

                cell.classList.add("composer-cell--dragging");

                let currentCol = placement.col;
                let currentRow = placement.row;
                let swapTarget = null;
                let dropZoneLine = null;

                function onMove(e) {
                    const panel = document.getElementById(
                        getSubPanelId(state.preferenceKey),
                    );
                    const overPanel =
                        panel &&
                        (() => {
                            const panelRect = panel.getBoundingClientRect();
                            return (
                                e.clientX >= panelRect.left &&
                                e.clientX <= panelRect.right &&
                                e.clientY >= panelRect.top &&
                                e.clientY <= panelRect.bottom
                            );
                        })();

                    if (dropZoneLine) {
                        dropZoneLine.remove();
                        dropZoneLine = null;
                    }
                    swapTarget = null;

                    if (overPanel && !el.pinned) {
                        shade.classList.add("composer-shade--invalid");
                        panel?.classList.add("composer-panel--drop-target");
                        return;
                    }
                    shade.classList.remove("composer-shade--invalid");
                    panel?.classList.remove("composer-panel--drop-target");

                    const gridRect = state.container.getBoundingClientRect();
                    const x = e.clientX - gridRect.left;
                    const y = e.clientY - gridRect.top;
                    const col = Math.max(
                        0,
                        Math.min(
                            state.gridCols - placement.w,
                            snapGridRound(
                                x / UNIT - placement.w / 2,
                                state.gridCols,
                            ),
                        ),
                    );
                    const row = Math.max(
                        0,
                        snapGridRound(
                            y / UNIT - placement.h / 2,
                            state.gridRows,
                        ),
                    );

                    if (row + placement.h > state.gridRows) {
                        state.gridRows = row + placement.h + 1;
                        state.container.style.minHeight = `${state.gridRows * UNIT}px`;
                    }

                    currentCol = col;
                    currentRow = row;
                    shade.style.left = `${col * UNIT}px`;
                    shade.style.top = `${row * UNIT}px`;

                    if (
                        !canSubPlace(
                            state,
                            col,
                            row,
                            placement.w,
                            placement.h,
                            el.id,
                        )
                    ) {
                        const candidate = findSubSwapCandidate(
                            state,
                            col,
                            row,
                            placement.w,
                            placement.h,
                            el.id,
                        );
                        if (candidate) {
                            swapTarget = candidate;
                            dropZoneLine = buildDropZoneLine(
                                placement.col,
                                placement.row,
                                candidate,
                                col,
                                row,
                            );
                            state.container.appendChild(dropZoneLine);
                        } else {
                            shade.classList.add("composer-shade--invalid");
                        }
                    }
                }

                async function onUp(e) {
                    cell.removeEventListener("pointermove", onMove);
                    cell.removeEventListener("pointerup", onUp);
                    cell.removeEventListener("pointercancel", onUp);
                    document
                        .getElementById(getSubPanelId(state.preferenceKey))
                        ?.classList.remove("composer-panel--drop-target");
                    if (dropZoneLine) {
                        dropZoneLine.remove();
                        dropZoneLine = null;
                    }
                    shade.remove();
                    cell.classList.remove("composer-cell--dragging");

                    const panel = document.getElementById(
                        getSubPanelId(state.preferenceKey),
                    );
                    const overPanel =
                        panel &&
                        (() => {
                            const panelRect = panel.getBoundingClientRect();
                            return (
                                e.clientX >= panelRect.left &&
                                e.clientX <= panelRect.right &&
                                e.clientY >= panelRect.top &&
                                e.clientY <= panelRect.bottom
                            );
                        })();

                    if (overPanel && !el.pinned) {
                        state.layout.hidden.push(el.id);
                        state.layout.placements =
                            state.layout.placements.filter(
                                (p) => p.id !== el.id,
                            );
                        renderSubGrid(state);
                        return;
                    }

                    const currentSwapTarget = swapTarget;
                    swapTarget = null;

                    if (currentSwapTarget) {
                        const targetPlacement = state.layout.placements.find(
                            (lp) => lp.id === el.id,
                        );
                        const swapPlacement = state.layout.placements.find(
                            (lp) => lp.id === currentSwapTarget.id,
                        );
                        if (targetPlacement && swapPlacement) {
                            const oldCol = targetPlacement.col;
                            const oldRow = targetPlacement.row;
                            targetPlacement.col = currentSwapTarget.col;
                            targetPlacement.row = currentSwapTarget.row;
                            swapPlacement.col = oldCol;
                            swapPlacement.row = oldRow;
                            renderSubGrid(state);
                        }
                    } else {
                        const moved =
                            currentCol !== placement.col ||
                            currentRow !== placement.row;
                        if (
                            moved &&
                            canSubPlace(
                                state,
                                currentCol,
                                currentRow,
                                placement.w,
                                placement.h,
                                el.id,
                            )
                        ) {
                            const targetPlacement =
                                state.layout.placements.find(
                                    (lp) => lp.id === el.id,
                                );
                            if (targetPlacement) {
                                targetPlacement.col = currentCol;
                                targetPlacement.row = currentRow;
                            }
                            renderSubGrid(state);
                        }
                    }
                }

                cell.addEventListener("pointermove", onMove);
                cell.addEventListener("pointerup", onUp);
                cell.addEventListener("pointercancel", onUp);
            });

            if (!el.pinned) {
                const closeBtn = document.createElement("button");
                closeBtn.className = "composer-close-btn";
                closeBtn.type = "button";
                closeBtn.textContent = "×";
                closeBtn.setAttribute("aria-label", i18n.t("ui.reuse.remove"));
                closeBtn.addEventListener("pointerdown", (e) =>
                    e.stopPropagation(),
                );
                closeBtn.addEventListener("click", () => {
                    state.layout.hidden.push(el.id);
                    state.layout.placements = state.layout.placements.filter(
                        (p) => p.id !== el.id,
                    );
                    renderSubGrid(state);
                });
                cell.appendChild(closeBtn);
            }
        }

        const content = document.createElement("div");
        content.className = "widget-card composer-cell-content";
        content.innerHTML = el.render();
        cell.appendChild(content);

        if (state.editing) {
            const gridSize = getGridSize(el);
            const canResizeE =
                !gridSize.fullWidth &&
                (!gridSize.max || gridSize.max[0] > gridSize.min[0]);
            const canResizeS =
                !gridSize.max || gridSize.max[1] > gridSize.min[1];

            if (canResizeE) {
                const handleE = document.createElement("div");
                handleE.className = "composer-resize-handle composer-resize-e";
                bindSubResizeHandle(handleE, "e", el, placement, state);
                cell.appendChild(handleE);
            }
            if (canResizeS) {
                const handleS = document.createElement("div");
                handleS.className = "composer-resize-handle composer-resize-s";
                bindSubResizeHandle(handleS, "s", el, placement, state);
                cell.appendChild(handleS);
            }
            if (canResizeE && canResizeS) {
                const handleSE = document.createElement("div");
                handleSE.className =
                    "composer-resize-handle composer-resize-se";
                bindSubResizeHandle(handleSE, "se", el, placement, state);
                cell.appendChild(handleSE);
            }
        }

        return cell;
    }

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
        <button class="composer-discard-btn" type="button">${i18n.t("ui.reuse.discard")}</button>
        <button class="composer-done-btn" type="button">${i18n.t("ui.reuse.done")}</button>
        <button class="composer-reset-btn" type="button">↺ ${i18n.t("ui.reuse.reset_layout")}</button>
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
            .addEventListener("click", async () => {
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
            .addEventListener("click", () => {
                state.layout = state.layoutSnapshot;
                state.editing = false;
                endEditMode();
                renderSubGrid(state);
            });

        panel
            .querySelector(".composer-reset-btn")
            .addEventListener("click", async () => {
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

    function renderSubGrid(state) {
        document.getElementById(getSubPanelId(state.preferenceKey))?.remove();

        if (!state.layout || (state.layout.order && !state.layout.placements)) {
            state.layout = { placements: [], hidden: [] };
        }

        computeSubGridDimensions(state);
        initializeSubPlacements(state);
        computeSubGridDimensions(state);

        const subGridFormSnapshot = mergeFormStateSnapshots(
            loadPersistedFormState(state.preferenceKey),
            captureFormState(state.container),
        );
        state.container.innerHTML = "";

        if (state.editing) {
            state.container.classList.add("composer-grid-active");
            state.container.style.minHeight = `${state.gridRows * UNIT}px`;
            state.container.style.width = `${state.gridCols * UNIT}px`;
            state.container.appendChild(createSubGridOverlay(state));

            const visiblePlacements = state.layout.placements.filter(
                (p) => !state.layout.hidden.includes(p.id),
            );
            for (const placement of visiblePlacements) {
                const element = state.elements.find(
                    (e) => e.id === placement.id,
                );
                if (!element) continue;
                state.container.appendChild(
                    createSubCell(element, placement, state),
                );
            }
        } else {
            state.container.classList.remove("composer-grid-active");
            state.container.style.minHeight = "";
            state.container.style.width = "";

            if (state.columns === 2) {
                state.container.classList.add("content-grid--two-column");
            }

            const sorted = computeSubViewPlacements(state);

            for (const placement of sorted) {
                const element = state.elements.find(
                    (e) => e.id === placement.id,
                );
                if (!element) continue;
                const card = document.createElement("div");
                card.className = "widget-card";
                card.dataset.composerElement = element.id;
                card.innerHTML = element.render();
                state.container.appendChild(card);
            }
        }

        syncSubEditToggle(state);

        if (state.editing) {
            createSubElementsPanel(state);
        }

        restoreFormState(state.container, subGridFormSnapshot);
        bindFormDraftPersistence(state.container, state.preferenceKey);

        state.onRender?.();
    }

    async function mountSubComposer(el, sectionContainer) {
        let state = subStates.get(el.id);
        if (!state) {
            state = {
                layout: null,
                layoutProfiles: { layoutsByGrid: {} },
                editing: false,
                layoutSnapshot: null,
                gridCols: 1,
                gridRows: 6,
                lastObservedCols: 0,
                panelPosition: null,
                resizeObserver: null,
                container: null,
                columns: el.subComposerOptions.columns ?? 1,
                elements: el.subComposerOptions.elements,
                allowCustomization:
                    el.subComposerOptions.allowCustomization ?? false,
                preferenceKey: el.subComposerOptions.preferenceKey,
                onRender: el.subComposerOptions.onRender,
                onUnmount: el.subComposerOptions.onUnmount,
            };
            const initialGridCols = Math.max(
                1,
                Math.floor(
                    sectionContainer.getBoundingClientRect().width / UNIT,
                ),
            );
            const loaded = await loadLayoutFor(
                state.preferenceKey,
                initialGridCols,
            );
            state.layout = cloneLayoutData(loaded.layout);
            state.layoutProfiles = loaded.profiles;
            subStates.set(el.id, state);
        }

        state.container = sectionContainer;

        if (!state.layout || (state.layout.order && !state.layout.placements)) {
            state.layout = { placements: [], hidden: [] };
        }

        computeSubGridDimensions(state);
        initializeSubPlacements(state);
        computeSubGridDimensions(state);
        renderSubGrid(state);

        if (state.resizeObserver) {
            state.resizeObserver.disconnect();
        }
        state.resizeObserver = new ResizeObserver(() => {
            if (!state.container) return;
            state.container.style.width = "";
            const width = state.container.getBoundingClientRect().width;
            const newCols = Math.max(1, Math.floor(width / UNIT));
            if (newCols !== state.lastObservedCols) {
                state.lastObservedCols = newCols;
                state.gridCols = newCols;
                if (!state.editing) {
                    applySubLayoutForCurrentGridColumns(state);
                }
                computeSubGridDimensions(state);
                renderSubGrid(state);
            }
        });
        state.resizeObserver.observe(sectionContainer);
    }

    function unmountSubComposer(el) {
        const state = subStates.get(el.id);
        if (!state) return;
        state.onUnmount?.();
        document.getElementById(getSubPanelId(state.preferenceKey))?.remove();
        state.resizeObserver?.disconnect();
        state.resizeObserver = null;
        if (state.container) {
            state.container.classList.remove("composer-grid-active");
            state.container.classList.remove("content-grid--two-column");
            state.container.innerHTML = "";
        }
        state.container = null;
    }

    function getOrCreateFloatingToolbar() {
        let floatingToolbar = root.querySelector(".floating-toolbar");
        if (!floatingToolbar) {
            floatingToolbar = document.createElement("div");
            floatingToolbar.className = "floating-toolbar";
            floatingToolbar.hidden = true;
            root.appendChild(floatingToolbar);
        }
        return floatingToolbar;
    }

    function syncSubEditToggle(state) {
        const editBtn = document.getElementById("composer-edit-toggle");
        if (!editBtn) return;
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
                    state.layoutProfiles = await saveLayoutFor(
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
        const editBtn = document.getElementById("composer-edit-toggle");
        if (!editBtn) return;
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

    function repackPlacementsIntoColumns(
        sortedVisible,
        maxCols,
        elems = elements,
    ) {
        const packed = [];
        const cStep = gridStep(maxCols);
        for (const orig of sortedVisible) {
            const element = elems.find((e) => e.id === orig.id);
            const gridSize = element ? getGridSize(element) : null;
            let w;
            if (gridSize?.fullWidth) {
                w = maxCols;
            } else if (gridSize?.halfWidth) {
                w = Math.min(
                    maxCols,
                    Math.max(gridSize.min[0], halfGrid(maxCols)),
                );
            } else {
                w = Math.min(orig.w, maxCols);
            }
            const h = orig.h;
            let placed = false;
            for (let row = 0; !placed; row += cStep) {
                for (
                    let col = 0;
                    col <= Math.max(0, maxCols - w);
                    col += cStep
                ) {
                    const cells = buildOccupiedSet(packed, [], null);
                    const fits = checkPlacement(cells, col, row, w, h);
                    if (fits) {
                        packed.push({ ...orig, col, row, w });
                        placed = true;
                        break;
                    }
                }
            }
        }
        return packed;
    }

    function resolvePlacementWidthBounds(placement, maxCols, elems = elements) {
        const element = elems.find((entry) => entry.id === placement.id);
        const currentWidth = Math.min(maxCols, Math.max(1, placement.w));
        if (!element) {
            return {
                min: currentWidth,
                max: maxCols,
            };
        }
        const gridSize = getGridSize(element);
        const minWidth = Math.min(maxCols, Math.max(1, gridSize.min[0]));
        if (gridSize.fullWidth || gridSize.fillWidth) {
            return { min: maxCols, max: maxCols };
        }
        if (gridSize.halfWidth) {
            const halfWidth = Math.min(
                maxCols,
                Math.max(minWidth, halfGrid(maxCols)),
            );
            return { min: halfWidth, max: halfWidth };
        }
        const declaredMaxWidth =
            Array.isArray(gridSize.max) &&
            Number.isFinite(gridSize.max[0]) &&
            gridSize.max[0] !== null
                ? gridSize.max[0]
                : null;
        const maxWidth = declaredMaxWidth
            ? Math.min(maxCols, Math.max(minWidth, declaredMaxWidth))
            : maxCols;
        return { min: minWidth, max: maxWidth };
    }

    function normalizePlacementRowsForGridWidth(
        sortedVisible,
        maxCols,
        elems = elements,
    ) {
        const MAX_ROW_WIDTH_DISTRIBUTION_ITERATIONS = 4000;
        const step = gridStep(maxCols);
        const epsilon = 0.001;
        const rowGroups = [];
        for (const placement of sortedVisible) {
            const previousRow = rowGroups.at(-1);
            if (!previousRow || previousRow.row !== placement.row) {
                rowGroups.push({
                    row: placement.row,
                    placements: [placement],
                });
                continue;
            }
            previousRow.placements.push(placement);
        }

        const normalized = [];
        let changed = false;
        for (const rowGroup of rowGroups) {
            if (rowGroup.placements.length < 2) {
                normalized.push(
                    ...rowGroup.placements.map((placement) => ({
                        ...placement,
                    })),
                );
                continue;
            }
            const descriptors = rowGroup.placements.map((placement) => {
                const bounds = resolvePlacementWidthBounds(
                    placement,
                    maxCols,
                    elems,
                );
                const boundedWidth = Math.min(
                    bounds.max,
                    Math.max(bounds.min, placement.w),
                );
                return {
                    placement,
                    min: bounds.min,
                    max: bounds.max,
                    proportionalBaseWidth: boundedWidth,
                    assignedWidth: boundedWidth,
                };
            });
            if (
                descriptors.some(
                    (descriptor) =>
                        descriptor.min === maxCols &&
                        rowGroup.placements.length > 1,
                )
            ) {
                return null;
            }
            const minimumWidthTotal = descriptors.reduce(
                (sum, descriptor) => sum + descriptor.min,
                0,
            );
            if (minimumWidthTotal > maxCols + epsilon) {
                return null;
            }
            const ratioTotal = descriptors.reduce(
                (sum, descriptor) => sum + descriptor.proportionalBaseWidth,
                0,
            );
            if (ratioTotal <= 0) {
                return null;
            }
            for (const descriptor of descriptors) {
                const rawTarget =
                    (descriptor.proportionalBaseWidth / ratioTotal) * maxCols;
                descriptor.assignedWidth = Math.min(
                    descriptor.max,
                    Math.max(
                        descriptor.min,
                        Math.round(rawTarget / step) * step,
                    ),
                );
            }

            let currentTotal = descriptors.reduce(
                (sum, descriptor) => sum + descriptor.assignedWidth,
                0,
            );
            let remaining = Math.round((maxCols - currentTotal) / step) * step;
            let guard = 0;
            while (
                remaining > epsilon &&
                guard < MAX_ROW_WIDTH_DISTRIBUTION_ITERATIONS
            ) {
                guard++;
                const candidate = descriptors
                    .filter(
                        (descriptor) =>
                            descriptor.assignedWidth + step <=
                            descriptor.max + epsilon,
                    )
                    .sort((left, right) => {
                        const rightDistance =
                            right.assignedWidth - right.proportionalBaseWidth;
                        const leftDistance =
                            left.assignedWidth - left.proportionalBaseWidth;
                        if (rightDistance !== leftDistance) {
                            return rightDistance - leftDistance;
                        }
                        return (
                            right.proportionalBaseWidth -
                            left.proportionalBaseWidth
                        );
                    })[0];
                if (!candidate) {
                    break;
                }
                candidate.assignedWidth += step;
                remaining = Math.round((remaining - step) / step) * step;
            }
            while (
                remaining < -epsilon &&
                guard < MAX_ROW_WIDTH_DISTRIBUTION_ITERATIONS
            ) {
                guard++;
                const candidate = descriptors
                    .filter(
                        (descriptor) =>
                            descriptor.assignedWidth - step >=
                            descriptor.min - epsilon,
                    )
                    .sort((left, right) => {
                        const rightDistance =
                            right.assignedWidth - right.proportionalBaseWidth;
                        const leftDistance =
                            left.assignedWidth - left.proportionalBaseWidth;
                        if (rightDistance !== leftDistance) {
                            return rightDistance - leftDistance;
                        }
                        return right.assignedWidth - left.assignedWidth;
                    })[0];
                if (!candidate) {
                    break;
                }
                candidate.assignedWidth -= step;
                remaining = Math.round((remaining + step) / step) * step;
            }
            if (Math.abs(remaining) > epsilon) {
                return null;
            }

            let column = 0;
            for (const descriptor of descriptors) {
                if (column + descriptor.assignedWidth > maxCols + epsilon) {
                    return null;
                }
                const nextPlacement = {
                    ...descriptor.placement,
                    col: column,
                    w: descriptor.assignedWidth,
                };
                if (
                    nextPlacement.col !== descriptor.placement.col ||
                    nextPlacement.w !== descriptor.placement.w
                ) {
                    changed = true;
                }
                normalized.push(nextPlacement);
                column += descriptor.targetWidth;
            }
        }

        return changed ? normalized : sortedVisible;
    }

    function syncLayoutToCurrentGridColumns() {
        if (!layout || !contentGrid) return;
        computeGridDimensions();
        initializePlacements();
        const adjustedPlacements = computeViewPlacements();
        const adjustedById = new Map(
            adjustedPlacements.map((placement) => [placement.id, placement]),
        );
        layout.placements = layout.placements.map((placement) => {
            const adjusted = adjustedById.get(placement.id);
            return adjusted
                ? {
                      ...placement,
                      col: adjusted.col,
                      row: adjusted.row,
                      w: adjusted.w,
                      h: adjusted.h,
                  }
                : placement;
        });
    }

    function syncSubLayoutToCurrentGridColumns(state) {
        if (!state.layout || !state.container) return;
        computeSubGridDimensions(state);
        initializeSubPlacements(state);
        const adjustedPlacements = computeSubViewPlacements(state);
        const adjustedById = new Map(
            adjustedPlacements.map((placement) => [placement.id, placement]),
        );
        state.layout.placements = state.layout.placements.map((placement) => {
            const adjusted = adjustedById.get(placement.id);
            return adjusted
                ? {
                      ...placement,
                      col: adjusted.col,
                      row: adjusted.row,
                      w: adjusted.w,
                      h: adjusted.h,
                  }
                : placement;
        });
    }

    function computeViewPlacements() {
        const visible = layout.placements
            .filter((p) => !layout.hidden.includes(p.id))
            .sort((a, b) => a.row - b.row || a.col - b.col);
        const normalizedRows = normalizePlacementRowsForGridWidth(
            visible,
            gridCols,
        );
        if (normalizedRows) {
            return normalizedRows;
        }

        const needsRepack = visible.some((p) => {
            if (p.col + p.w > gridCols) return true;
            const element = elements.find((e) => e.id === p.id);
            if (!element) return false;
            const gridSize = getGridSize(element);
            if (gridSize.fullWidth && p.w !== gridCols) return true;
            if (gridSize.halfWidth) {
                const target = Math.min(
                    gridCols,
                    Math.max(gridSize.min[0], halfGrid(gridCols)),
                );
                if (p.w !== target) return true;
            }
            return false;
        });
        if (!needsRepack) return visible;

        return repackPlacementsIntoColumns(visible, gridCols);
    }

    function computeSubViewPlacements(state) {
        const visible = state.layout.placements
            .filter((pl) => !state.layout.hidden.includes(pl.id))
            .sort((a, b) => a.row - b.row || a.col - b.col);
        const normalizedRows = normalizePlacementRowsForGridWidth(
            visible,
            state.gridCols,
            state.elements,
        );
        if (normalizedRows) {
            return normalizedRows;
        }

        const needsRepack = visible.some((pl) => {
            if (pl.col + pl.w > state.gridCols) return true;
            const element = state.elements.find((e) => e.id === pl.id);
            if (!element) return false;
            const gridSize = getGridSize(element);
            if (gridSize.fullWidth && pl.w !== state.gridCols) return true;
            if (gridSize.halfWidth) {
                const target = Math.min(
                    state.gridCols,
                    Math.max(gridSize.min[0], halfGrid(state.gridCols)),
                );
                if (pl.w !== target) return true;
            }
            return false;
        });
        if (!needsRepack) return visible;

        return repackPlacementsIntoColumns(
            visible,
            state.gridCols,
            state.elements,
        );
    }

    function renderGridComposer() {
        if (!document.contains(contentGrid)) return;
        document.getElementById("composer-elements-panel")?.remove();

        if (!layout || (layout.order && !layout.placements)) {
            layout = { placements: [], hidden: [] };
        }

        computeGridDimensions();
        if (!editing && persistLayoutPreferences) {
            applyLayoutForCurrentGridColumns();
        }
        initializePlacements();
        computeGridDimensions();

        contentGrid.classList.remove("composer-grid-active");
        const gridFormSnapshot = mergeFormStateSnapshots(
            loadPersistedFormState(preferenceKey),
            captureFormState(contentGrid),
        );
        contentGrid.innerHTML = "";

        const panel = document.createElement("article");
        panel.className = "content-panel";
        const section = document.createElement("div");
        section.className = "content-section";
        panel.appendChild(section);
        contentGrid.appendChild(panel);
        gridSection = section;

        if (editing) {
            section.classList.add("composer-grid-active");
            section.style.minHeight = `${gridRows * UNIT}px`;
            section.style.width = `${gridCols * UNIT}px`;
            section.appendChild(createGridOverlay());
        } else if (!frameless) {
            section.classList.add("composer-view-grid");
        }

        const visiblePlacements = editing
            ? layout.placements
                  .filter((p) => !layout.hidden.includes(p.id))
                  .sort((a, b) => a.row - b.row || a.col - b.col)
            : computeViewPlacements();

        if (!editing) {
            const hasFractional =
                !frameless &&
                visiblePlacements.some(
                    (p) =>
                        p.col % 1 !== 0 ||
                        p.row % 1 !== 0 ||
                        p.w % 1 !== 0 ||
                        p.h % 1 !== 0,
                );
            const scale = hasFractional ? 2 : 1;
            if (!frameless) {
                section.style.setProperty(
                    "--grid-cols",
                    String(gridCols * scale),
                );
                section.style.setProperty(
                    "--composer-grid-row-size",
                    `${UNIT / scale}px`,
                );
            }
            for (const placement of visiblePlacements) {
                const element = elements.find((e) => e.id === placement.id);
                if (!element) continue;
                const card = document.createElement("section");
                card.className = "widget-card";
                card.dataset.composerElement = element.id;
                if (!frameless) {
                    const scaledCol = placement.col * scale;
                    const scaledRow = placement.row * scale;
                    const scaledWidth = placement.w * scale;
                    const scaledHeight = placement.h * scale;
                    card.style.gridColumn = `${Math.round(scaledCol) + 1} / span ${Math.round(scaledWidth)}`;
                    card.style.gridRow = `${Math.round(scaledRow) + 1} / span ${Math.round(scaledHeight)}`;
                }
                card.innerHTML = element.render();
                section.appendChild(card);
            }
        }

        if (editing) {
            for (const placement of visiblePlacements) {
                const element = elements.find((e) => e.id === placement.id);
                if (!element) continue;
                section.appendChild(createCell(element, placement));
            }
        }

        syncEditToggle();

        if (editing) {
            createElementsPanel();
        }

        restoreFormState(contentGrid, gridFormSnapshot);
        bindFormDraftPersistence(contentGrid, preferenceKey);

        const renderedElementIds = visiblePlacements.map((p) => p.id);
        for (const id of renderedElementIds) {
            const element = elements.find((entry) => entry.id === id);
            element?.onRender?.();
        }

        onRender?.();
    }

    function getEffectiveLayout() {
        const allIds = elements.map((e) => e.id);
        const pinnedIds = elements.filter((e) => e.pinned).map((e) => e.id);
        const storedOrder = (layout?.order ?? []).filter((id) =>
            allIds.includes(id),
        );
        const storedHidden = layout?.hidden ?? null;
        const defaultHiddenIds = elements
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
                const element = elements.find((e) => e.id === id);
                if (!element) return "";
                const dragAttrs = editing ? ` draggable="true"` : "";
                const dragHandle = editing
                    ? `<div class="composer-drag-handle" aria-hidden="true">
               <span class="composer-drag-icon">⠿</span>
               <span class="composer-drag-label">${element.label}</span>
               ${!element.pinned ? `<button class="composer-remove-btn" data-composer-remove="${element.id}" type="button">${i18n.t("ui.reuse.remove")}</button>` : ""}
             </div>`
                    : "";
                const editingClass = editing ? " composer-editing" : "";
                const isActive =
                    subPageNavigation && element.id === activeSubPageId;
                const activeClass = isActive ? " active" : "";
                const hiddenAttr =
                    subPageNavigation && !isActive ? " hidden" : "";
                if (element.subComposerOptions) {
                    const headingHtml = element.subComposerOptions.heading
                        ? `<h2 class="sub-composer-heading">${escapeHtml(element.subComposerOptions.heading)}</h2>`
                        : "";
                    return `<div class="content-section${activeClass}"${hiddenAttr} id="${element.id}">${headingHtml}<div class="sub-composer-inner"></div></div>`;
                }
                return `<div class="content-section${activeClass}"${hiddenAttr} id="${element.id}"><section class="widget-card${editingClass}" data-composer-element="${element.id}"${dragAttrs}>${dragHandle}${element.render()}</section></div>`;
            })
            .join("");
    }

    function renderLibraryPanel(effectiveLayout) {
        const hiddenElements = elements.filter((e) =>
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
        const editingClass = editing ? " composer-content-panel--editing" : "";
        html += `<article class="content-panel${editingClass}">${cardsHtml}</article>`;

        if (editing) {
            html += renderLibraryPanel(effectiveLayout);
        }

        contentGrid.innerHTML = html;
        bindSubPageComposerEvents();
        syncEditToggle();
        for (const id of effectiveLayout.order) {
            if (effectiveLayout.hidden.includes(id)) continue;
            const element = elements.find((entry) => entry.id === id);
            element?.onRender?.();
        }
        onRender?.();
        const activeEl = elements.find((e) => e.id === activeSubPageId);
        if (activeEl?.subComposerOptions) {
            const outerDiv = contentGrid.querySelector(`#${activeSubPageId}`);
            const sectionDiv =
                outerDiv?.querySelector(".sub-composer-inner") ??
                outerDiv ??
                contentGrid;
            mountSubComposer(activeEl, sectionDiv).catch(() => {});
        }
    }

    function bindSubPageComposerEvents() {
        contentGrid
            .querySelectorAll("[data-composer-remove]")
            .forEach((btn) => {
                btn.addEventListener("click", () => {
                    const id = btn.dataset.composerRemove;
                    const effective = getEffectiveLayout();
                    layout = {
                        order: effective.order,
                        hidden: [...effective.hidden, id],
                    };
                    renderSubPageComposer();
                });
            });

        contentGrid.querySelectorAll("[data-composer-add]").forEach((btn) => {
            btn.addEventListener("click", () => {
                const id = btn.dataset.composerAdd;
                const effective = getEffectiveLayout();
                layout = {
                    order: effective.order,
                    hidden: effective.hidden.filter((h) => h !== id),
                };
                renderSubPageComposer();
            });
        });

        contentGrid
            .querySelectorAll("[data-composer-element][draggable]")
            .forEach((card) => {
                card.addEventListener("dragstart", (event) => {
                    dragSourceId = card.dataset.composerElement;
                    card.classList.add("composer-dragging");
                    event.dataTransfer.effectAllowed = "move";
                });

                card.addEventListener("dragend", () => {
                    card.classList.remove("composer-dragging");
                    contentGrid
                        .querySelectorAll(".composer-drag-over")
                        .forEach((el) => {
                            el.classList.remove("composer-drag-over");
                        });
                    dragSourceId = null;
                });

                card.addEventListener("dragover", (event) => {
                    event.preventDefault();
                    event.dataTransfer.dropEffect = "move";
                    if (card.dataset.composerElement !== dragSourceId) {
                        contentGrid
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
                    if (!dragSourceId || dragSourceId === targetId) return;

                    const effective = getEffectiveLayout();
                    const visibleOrder = effective.order.filter(
                        (id) => !effective.hidden.includes(id),
                    );
                    const sourceIdx = visibleOrder.indexOf(dragSourceId);
                    const targetIdx = visibleOrder.indexOf(targetId);
                    if (sourceIdx === -1 || targetIdx === -1) return;

                    visibleOrder.splice(sourceIdx, 1);
                    // Removing source shifts all subsequent indices by -1; adjust targetIdx when source precedes target.
                    const insertIdx =
                        sourceIdx < targetIdx ? targetIdx - 1 : targetIdx;
                    visibleOrder.splice(insertIdx, 0, dragSourceId);

                    const newOrder = [
                        ...visibleOrder,
                        ...effective.order.filter((id) =>
                            effective.hidden.includes(id),
                        ),
                    ];
                    layout = { order: newOrder, hidden: effective.hidden };
                    renderSubPageComposer();
                });
            });
    }

    function render() {
        if (!contentGrid) return;
        if (subPageNavigation) {
            renderSubPageComposer();
        } else {
            renderGridComposer();
        }
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
        configureToastDismissLabel(i18n.t("ui.reuse.dismiss"));
        configureConnectionRecoveryPrompt(
            i18n.t("ui.reuse.connection_lost_refresh_prompt"),
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
        });

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

        contentGrid = root.querySelector(".content-grid");
        if (columns === 2)
            contentGrid?.classList.add("content-grid--two-column");
        let closeMobileDrawerIfNeeded = () => {};

        if (frameless) {
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
                    mobileToggleBtn.innerHTML = open
                        ? TOOLBAR_TOGGLE_OPEN_SVG
                        : TOOLBAR_TOGGLE_CLOSED_SVG;
                    mobileToggleBtn.setAttribute(
                        "aria-label",
                        open
                            ? i18n.t("ui.layout.toolbar.collapse")
                            : i18n.t("ui.layout.toolbar.expand"),
                    );
                }

                mobileToggleBtn.setAttribute("aria-expanded", "false");
                mobileToggleBtn.innerHTML = TOOLBAR_TOGGLE_CLOSED_SVG;
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
    }

    function getFloatingSlot(id) {
        return root.querySelector(`[data-floating-slot="${CSS.escape(id)}"]`);
    }

    function restoreWindowScrollPosition(left, top) {
        window.requestAnimationFrame(() => {
            window.scrollTo({
                left,
                top,
                behavior: "auto",
            });
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

    return { init, refresh, getFloatingSlot, showToast };
}
