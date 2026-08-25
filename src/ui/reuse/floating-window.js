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
 * @param {{handle?: HTMLElement | null, signal?: AbortSignal, minWidth?: number, minHeight?: number, width?: string, height?: string, right?: string, bottom?: string, zIndex?: number}} options
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
    } = {},
) {
    if (!element || !handle) return () => {};
    const controller = new AbortController();
    let drag = null;
    let released = false;
    const previousStyles = Object.fromEntries(
        MANAGED_STYLE_PROPERTIES.map((property) => [
            property,
            element.style[property] ?? "",
        ]),
    );

    ensureFloatingWindowStyles();
    element.classList.add("floating-window");
    handle.classList.add("floating-window-handle");
    element.style.position = "fixed";
    element.style.right = right;
    element.style.bottom = bottom;
    element.style.width = width;
    element.style.height = height;
    element.style.minWidth = `${minWidth}px`;
    element.style.minHeight = `${minHeight}px`;
    element.style.zIndex = String(zIndex);

    const getBoundary = () => {
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

    handle.addEventListener(
        "pointerdown",
        (event) => {
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
            handle.setPointerCapture?.(event.pointerId);
            event.preventDefault?.();
        },
        { signal: controller.signal },
    );
    handle.addEventListener(
        "pointermove",
        (event) => {
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
        },
        { signal: controller.signal },
    );
    handle.addEventListener("pointerup", stopDragging, {
        signal: controller.signal,
    });
    handle.addEventListener("pointercancel", stopDragging, {
        signal: controller.signal,
    });
    window.addEventListener("resize", constrain, { signal: controller.signal });
    const resizeObserver =
        typeof ResizeObserver === "function"
            ? new ResizeObserver(constrain)
            : null;
    resizeObserver?.observe(element);
    if (element.parentElement) resizeObserver?.observe(element.parentElement);
    const parentObserver =
        element.parentElement && typeof MutationObserver === "function"
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
        for (const [property, value] of Object.entries(previousStyles)) {
            element.style[property] = value;
        }
    };
    signal?.addEventListener("abort", release, { once: true });
    if (signal?.aborted) release();
    return release;
}

ensureFloatingWindowStyles();
uiCtx.capabilities.contribute("ui:makeFloatingWindow", makeFloatingWindow);
