/**
 * Adds reusable, viewport-constrained moving and resizing to floating UI.
 *
 * Public exports:
 * - `makeFloatingWindow` — makes an element movable by a handle and resizable.
 *
 * Also contributes `ui:makeFloatingWindow` so external components can use the
 * host-owned behavior through `uiCtx` without importing Cognis internals.
 *
 * @example
 * const release = makeFloatingWindow(panel, {
 *     handle: panel.querySelector("[data-window-handle]"),
 *     signal,
 * });
 * release.updateMinimumSize({ width: 320, height: 180 });
 *
 * @param {HTMLElement} element - Floating window to control.
 * @param {{handle?: HTMLElement | null, signal?: AbortSignal, minWidth?: number, minHeight?: number, width?: string, height?: string, right?: string, bottom?: string, zIndex?: number, portal?: boolean, topLayer?: boolean}} options
 * @returns {(() => void) & {updateMinimumSize: (size: {width: number, height: number}) => boolean}} Idempotent cleanup with a minimum-size updater.
 */
import { uiCtx } from "./ui-ctx.js";

const FLOATING_WINDOW_STYLESHEET = "/static/styles/reuse/floating-window.css";
const MANAGED_STYLE_PROPERTIES = [
    "position",
    "left",
    "top",
    "right",
    "bottom",
    "width",
    "height",
    "minWidth",
    "minHeight",
    "zIndex",
];

function ensureFloatingWindowStyles() {
    if (typeof document === "undefined" || !document.head) return;
    if (document.querySelector(`link[href="${FLOATING_WINDOW_STYLESHEET}"]`))
        return;
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = FLOATING_WINDOW_STYLESHEET;
    document.head.append(link);
}

function createFloatingWindowChrome(element) {
    if (typeof document === "undefined" || !document.createElement) {
        return { toolbar: null, resizeHandles: [], remove: () => {} };
    }
    const toolbar = document.createElement("div");
    toolbar.className = "floating-window-toolbar";
    toolbar.setAttribute("aria-hidden", "true");
    const createResizeHandle = (edge) => {
        const resizeHandle = document.createElement("div");
        resizeHandle.className = `floating-window-resize-handle floating-window-resize-handle--${edge}`;
        resizeHandle.dataset.resizeEdge = edge;
        resizeHandle.setAttribute("aria-hidden", "true");
        if (typeof document.createElementNS === "function") {
            const svg = document.createElementNS(
                "http://www.w3.org/2000/svg",
                "svg",
            );
            svg.setAttribute("viewBox", "0 0 18 18");
            svg.setAttribute("focusable", "false");
            const path = document.createElementNS(
                "http://www.w3.org/2000/svg",
                "path",
            );
            path.setAttribute("d", "M4 16 16 4M9 16l7-7M14 16l2-2");
            svg.append(path);
            resizeHandle.append(svg);
        }
        return resizeHandle;
    };
    const resizeHandles = [
        createResizeHandle("top-left"),
        createResizeHandle("bottom-right"),
    ];
    element.append(toolbar, ...resizeHandles);
    return {
        toolbar,
        resizeHandles,
        remove: () => {
            toolbar.remove();
            for (const resizeHandle of resizeHandles) resizeHandle.remove();
        },
    };
}

export function makeFloatingWindow(
    element,
    {
        handle = element,
        signal,
        minWidth: initialMinWidth = 240,
        minHeight: initialMinHeight = 160,
        width = "min(32vw, 24rem)",
        height = "min(32vh, 15rem)",
        right = "1rem",
        bottom = "1rem",
        zIndex = 1201,
        portal = true,
        topLayer = portal,
    } = {},
) {
    if (!element || !handle) {
        const release = () => {};
        release.updateMinimumSize = () => false;
        return release;
    }
    const controller = new AbortController();
    let minWidth = initialMinWidth;
    let minHeight = initialMinHeight;
    let minimumOrientation = "horizontal";
    let drag = null;
    let resizeDrag = null;
    let released = false;
    const hadPopoverAttribute = element.hasAttribute?.("popover") ?? false;
    const previousPopoverValue = element.getAttribute?.("popover");
    let shownInTopLayer = false;
    const previousStyles = Object.fromEntries(
        MANAGED_STYLE_PROPERTIES.map((property) => [
            property,
            element.style[property] ?? "",
        ]),
    );

    ensureFloatingWindowStyles();
    const chrome = createFloatingWindowChrome(element);
    element.classList.add("floating-window");
    handle.classList.add("floating-window-handle");
    chrome.toolbar?.classList.add("floating-window-handle");
    element.style.position = "fixed";
    element.style.right = right;
    element.style.bottom = bottom;
    element.style.width = width;
    element.style.height = height;
    element.style.minWidth = `${minWidth}px`;
    element.style.minHeight = `${minHeight}px`;
    element.style.zIndex = String(zIndex);
    if (topLayer && typeof element.showPopover === "function") {
        element.setAttribute("popover", "manual");
        try {
            element.showPopover();
            shownInTopLayer = true;
        } catch {
            if (hadPopoverAttribute) {
                element.setAttribute("popover", previousPopoverValue ?? "");
            } else {
                element.removeAttribute("popover");
            }
        }
    }

    const getBoundary = () => {
        if (shownInTopLayer) {
            return {
                element: null,
                left: 0,
                top: 0,
                width: window.innerWidth,
                height: window.innerHeight,
            };
        }
        const stage = element.closest?.(".component-page-stage");
        const stageRect = stage?.getBoundingClientRect?.();
        if (stageRect?.width > 0 && stageRect?.height > 0) {
            return {
                element: stage,
                left: stageRect.left,
                top: stageRect.top,
                width: stageRect.width,
                height: stageRect.height,
            };
        }
        return {
            element: null,
            left: 0,
            top: 0,
            width: window.innerWidth,
            height: window.innerHeight,
        };
    };
    const constrain = () => {
        const rect = element.getBoundingClientRect();
        const boundary = getBoundary();
        const convertAnchors =
            element.style.right !== "auto" || element.style.bottom !== "auto";
        const width = Math.min(rect.width, boundary.width);
        const height = Math.min(rect.height, boundary.height);
        const viewportLeft = Math.max(
            boundary.left,
            Math.min(rect.left, boundary.left + boundary.width - width),
        );
        const viewportTop = Math.max(
            boundary.top,
            Math.min(rect.top, boundary.top + boundary.height - height),
        );
        const left = viewportLeft - boundary.left;
        const top = viewportTop - boundary.top;
        if (Math.abs(rect.width - width) > 0.5)
            element.style.width = `${width}px`;
        if (Math.abs(rect.height - height) > 0.5)
            element.style.height = `${height}px`;
        if (convertAnchors || Math.abs(rect.left - left) > 0.5)
            element.style.left = `${left}px`;
        if (convertAnchors || Math.abs(rect.top - top) > 0.5)
            element.style.top = `${top}px`;
        element.style.right = "auto";
        element.style.bottom = "auto";
    };
    const updateMinimumSize = ({ width: nextWidth, height: nextHeight }) => {
        if (
            released ||
            !Number.isFinite(nextWidth) ||
            nextWidth <= 0 ||
            !Number.isFinite(nextHeight) ||
            nextHeight <= 0
        )
            return false;
        const rect = element.getBoundingClientRect();
        minWidth = nextWidth;
        minHeight = nextHeight;
        minimumOrientation = "horizontal";
        element.style.minWidth = `${minWidth}px`;
        element.style.minHeight = `${minHeight}px`;
        if (rect.width >= minWidth && rect.height >= minHeight) return true;
        const boundary = getBoundary();
        const width = Math.min(Math.max(rect.width, minWidth), boundary.width);
        const height = Math.min(
            Math.max(rect.height, minHeight),
            boundary.height,
        );
        const viewportLeft = Math.max(
            boundary.left,
            Math.min(rect.left, boundary.left + boundary.width - width),
        );
        const viewportTop = Math.max(
            boundary.top,
            Math.min(rect.top, boundary.top + boundary.height - height),
        );
        element.style.width = `${width}px`;
        element.style.height = `${height}px`;
        element.style.left = `${viewportLeft - boundary.left}px`;
        element.style.top = `${viewportTop - boundary.top}px`;
        element.style.right = "auto";
        element.style.bottom = "auto";
        return true;
    };
    const applyResizeOrientation = (requestedWidth, requestedHeight) => {
        const shouldUseVerticalMinimum =
            minimumOrientation === "horizontal" &&
            requestedWidth < minWidth &&
            requestedHeight > minHeight;
        const shouldUseHorizontalMinimum =
            minimumOrientation === "vertical" &&
            requestedWidth > minWidth &&
            requestedHeight < minHeight;
        if (!shouldUseVerticalMinimum && !shouldUseHorizontalMinimum) return;
        [minWidth, minHeight] = [minHeight, minWidth];
        minimumOrientation = shouldUseVerticalMinimum
            ? "vertical"
            : "horizontal";
        element.style.minWidth = `${minWidth}px`;
        element.style.minHeight = `${minHeight}px`;
    };
    const stopDragging = (event) => {
        if (
            event?.pointerId !== undefined &&
            event.pointerId !== drag?.pointerId
        )
            return;
        drag = null;
    };
    const startDragging = (event) => {
        if (event.button !== undefined && event.button !== 0) return;
        if (event.target?.closest?.("button, a, input, select, textarea"))
            return;
        const rect = element.getBoundingClientRect();
        drag = {
            pointerId: event.pointerId,
            x: event.clientX,
            y: event.clientY,
            left: rect.left,
            top: rect.top,
            width: rect.width,
            height: rect.height,
        };
        event.currentTarget?.setPointerCapture?.(event.pointerId);
        event.preventDefault?.();
    };
    const moveDragging = (event) => {
        if (!drag || event.pointerId !== drag.pointerId) return;
        const boundary = getBoundary();
        const viewportLeft = Math.max(
            boundary.left,
            Math.min(
                drag.left + event.clientX - drag.x,
                boundary.left + boundary.width - drag.width,
            ),
        );
        const viewportTop = Math.max(
            boundary.top,
            Math.min(
                drag.top + event.clientY - drag.y,
                boundary.top + boundary.height - drag.height,
            ),
        );
        element.style.left = `${viewportLeft - boundary.left}px`;
        element.style.top = `${viewportTop - boundary.top}px`;
        element.style.right = "auto";
        element.style.bottom = "auto";
    };
    const dragHandles = [handle, chrome.toolbar].filter(
        (entry, index, entries) => entry && entries.indexOf(entry) === index,
    );
    for (const dragHandle of dragHandles) {
        dragHandle.addEventListener("pointerdown", startDragging, {
            signal: controller.signal,
        });
        dragHandle.addEventListener("pointermove", moveDragging, {
            signal: controller.signal,
        });
        dragHandle.addEventListener("pointerup", stopDragging, {
            signal: controller.signal,
        });
        dragHandle.addEventListener("pointercancel", stopDragging, {
            signal: controller.signal,
        });
    }
    const stopResizing = (event) => {
        if (
            event?.pointerId !== undefined &&
            event.pointerId !== resizeDrag?.pointerId
        )
            return;
        resizeDrag = null;
    };
    for (const resizeHandle of chrome.resizeHandles) {
        resizeHandle.addEventListener(
            "pointerdown",
            (event) => {
                if (event.button !== undefined && event.button !== 0) return;
                const rect = element.getBoundingClientRect();
                resizeDrag = {
                    edge: resizeHandle.dataset.resizeEdge,
                    pointerId: event.pointerId,
                    x: event.clientX,
                    y: event.clientY,
                    left: rect.left,
                    top: rect.top,
                    width: rect.width,
                    height: rect.height,
                };
                resizeHandle.setPointerCapture?.(event.pointerId);
                event.preventDefault?.();
            },
            { signal: controller.signal },
        );
        resizeHandle.addEventListener(
            "pointermove",
            (event) => {
                if (!resizeDrag || event.pointerId !== resizeDrag.pointerId)
                    return;
                const boundary = getBoundary();
                const deltaX = event.clientX - resizeDrag.x;
                const deltaY = event.clientY - resizeDrag.y;
                const requestedWidth =
                    resizeDrag.width +
                    (resizeDrag.edge === "top-left" ? -deltaX : deltaX);
                const requestedHeight =
                    resizeDrag.height +
                    (resizeDrag.edge === "top-left" ? -deltaY : deltaY);
                applyResizeOrientation(requestedWidth, requestedHeight);
                if (resizeDrag.edge === "top-left") {
                    const fixedRight = resizeDrag.left + resizeDrag.width;
                    const fixedBottom = resizeDrag.top + resizeDrag.height;
                    const nextLeft = Math.max(
                        boundary.left,
                        Math.min(
                            resizeDrag.left + deltaX,
                            fixedRight -
                                Math.min(minWidth, fixedRight - boundary.left),
                        ),
                    );
                    const nextTop = Math.max(
                        boundary.top,
                        Math.min(
                            resizeDrag.top + deltaY,
                            fixedBottom -
                                Math.min(minHeight, fixedBottom - boundary.top),
                        ),
                    );
                    element.style.left = `${nextLeft - boundary.left}px`;
                    element.style.top = `${nextTop - boundary.top}px`;
                    element.style.width = `${fixedRight - nextLeft}px`;
                    element.style.height = `${fixedBottom - nextTop}px`;
                } else {
                    const maximumWidth =
                        boundary.left + boundary.width - resizeDrag.left;
                    const maximumHeight =
                        boundary.top + boundary.height - resizeDrag.top;
                    element.style.width = `${Math.max(
                        Math.min(minWidth, maximumWidth),
                        Math.min(resizeDrag.width + deltaX, maximumWidth),
                    )}px`;
                    element.style.height = `${Math.max(
                        Math.min(minHeight, maximumHeight),
                        Math.min(resizeDrag.height + deltaY, maximumHeight),
                    )}px`;
                }
                element.style.right = "auto";
                element.style.bottom = "auto";
                event.preventDefault?.();
            },
            { signal: controller.signal },
        );
        resizeHandle.addEventListener("pointerup", stopResizing, {
            signal: controller.signal,
        });
        resizeHandle.addEventListener("pointercancel", stopResizing, {
            signal: controller.signal,
        });
    }
    window.addEventListener("resize", constrain, { signal: controller.signal });
    const resizeObserver =
        typeof ResizeObserver === "function"
            ? new ResizeObserver(constrain)
            : null;
    resizeObserver?.observe(element);
    if (!shownInTopLayer && element.parentElement) {
        resizeObserver?.observe(element.parentElement);
    }
    const parentObserver =
        !shownInTopLayer &&
        element.parentElement &&
        typeof MutationObserver === "function"
            ? new MutationObserver(constrain)
            : null;
    parentObserver?.observe(element.parentElement, {
        attributes: true,
        attributeFilter: ["class"],
        childList: true,
    });
    constrain();

    const release = () => {
        if (released) return;
        released = true;
        controller.abort();
        resizeObserver?.disconnect();
        parentObserver?.disconnect();
        signal?.removeEventListener("abort", release);
        element.classList.remove("floating-window");
        handle.classList.remove("floating-window-handle");
        chrome.remove();
        for (const [property, value] of Object.entries(previousStyles)) {
            element.style[property] = value;
        }
        if (shownInTopLayer) element.hidePopover?.();
        if (hadPopoverAttribute) {
            element.setAttribute("popover", previousPopoverValue ?? "");
        } else {
            element.removeAttribute?.("popover");
        }
    };
    release.updateMinimumSize = updateMinimumSize;
    signal?.addEventListener("abort", release, { once: true });
    if (signal?.aborted) release();
    return release;
}

ensureFloatingWindowStyles();
uiCtx.capabilities.contribute("ui:makeFloatingWindow", makeFloatingWindow);
