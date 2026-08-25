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
 *
 * @param {HTMLElement} element - Floating window to control.
 * @param {{handle?: HTMLElement | null, signal?: AbortSignal, minWidth?: number, minHeight?: number, width?: string, height?: string, right?: string, bottom?: string, zIndex?: number, portal?: boolean, topLayer?: boolean}} options
 * @returns {() => void} Idempotent listener and observer cleanup.
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
        return { toolbar: null, resizeHandle: null, remove: () => {} };
    }
    const toolbar = document.createElement("div");
    toolbar.className = "floating-window-toolbar";
    toolbar.setAttribute("aria-hidden", "true");
    const resizeHandle = document.createElement("div");
    resizeHandle.className = "floating-window-resize-handle";
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
    element.append(toolbar, resizeHandle);
    return {
        toolbar,
        resizeHandle,
        remove: () => {
            toolbar.remove();
            resizeHandle.remove();
        },
    };
}

export function makeFloatingWindow(
    element,
    {
        handle = element,
        signal,
        minWidth = 240,
        minHeight = 160,
        width = "min(32vw, 24rem)",
        height = "min(32vh, 15rem)",
        right = "1rem",
        bottom = "1rem",
        zIndex = 1201,
        portal = true,
        topLayer = portal,
    } = {},
) {
    if (!element || !handle) return () => {};
    const controller = new AbortController();
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
    chrome.resizeHandle?.addEventListener(
        "pointerdown",
        (event) => {
            if (event.button !== undefined && event.button !== 0) return;
            const rect = element.getBoundingClientRect();
            resizeDrag = {
                pointerId: event.pointerId,
                x: event.clientX,
                y: event.clientY,
                left: rect.left,
                top: rect.top,
                width: rect.width,
                height: rect.height,
            };
            chrome.resizeHandle.setPointerCapture?.(event.pointerId);
            event.preventDefault?.();
        },
        { signal: controller.signal },
    );
    chrome.resizeHandle?.addEventListener(
        "pointermove",
        (event) => {
            if (!resizeDrag || event.pointerId !== resizeDrag.pointerId) return;
            const boundary = getBoundary();
            const maximumWidth =
                boundary.left + boundary.width - resizeDrag.left;
            const maximumHeight =
                boundary.top + boundary.height - resizeDrag.top;
            const nextWidth = Math.max(
                Math.min(minWidth, maximumWidth),
                Math.min(
                    resizeDrag.width + event.clientX - resizeDrag.x,
                    maximumWidth,
                ),
            );
            const nextHeight = Math.max(
                Math.min(minHeight, maximumHeight),
                Math.min(
                    resizeDrag.height + event.clientY - resizeDrag.y,
                    maximumHeight,
                ),
            );
            element.style.width = `${nextWidth}px`;
            element.style.height = `${nextHeight}px`;
            event.preventDefault?.();
        },
        { signal: controller.signal },
    );
    chrome.resizeHandle?.addEventListener("pointerup", stopResizing, {
        signal: controller.signal,
    });
    chrome.resizeHandle?.addEventListener("pointercancel", stopResizing, {
        signal: controller.signal,
    });
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
    signal?.addEventListener("abort", release, { once: true });
    if (signal?.aborted) release();
    return release;
}

ensureFloatingWindowStyles();
uiCtx.capabilities.contribute("ui:makeFloatingWindow", makeFloatingWindow);
