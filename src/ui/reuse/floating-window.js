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
 * @param {{handle?: HTMLElement | null, signal?: AbortSignal, minWidth?: number, minHeight?: number}} options
 * @returns {() => void} Idempotent listener and observer cleanup.
 */
import { uiCtx } from "./ui-ctx.js";

export function makeFloatingWindow(
    element,
    { handle = element, signal, minWidth = 240, minHeight = 160 } = {},
) {
    if (!element || !handle) return () => {};
    const controller = new AbortController();
    let drag = null;
    let released = false;

    element.classList.add("floating-window");
    handle.classList.add("floating-window-handle");
    element.style.minWidth = `${minWidth}px`;
    element.style.minHeight = `${minHeight}px`;

    const constrain = () => {
        const rect = element.getBoundingClientRect();
        const convertAnchors =
            element.style.right !== "auto" || element.style.bottom !== "auto";
        const width = Math.min(rect.width, window.innerWidth);
        const height = Math.min(rect.height, window.innerHeight);
        const left = Math.max(
            0,
            Math.min(rect.left, window.innerWidth - width),
        );
        const top = Math.max(
            0,
            Math.min(rect.top, window.innerHeight - height),
        );
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
            element.style.left = `${Math.max(0, Math.min(drag.left + event.clientX - drag.x, window.innerWidth - drag.width))}px`;
            element.style.top = `${Math.max(0, Math.min(drag.top + event.clientY - drag.y, window.innerHeight - drag.height))}px`;
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
    constrain();

    const release = () => {
        if (released) return;
        released = true;
        controller.abort();
        resizeObserver?.disconnect();
        signal?.removeEventListener("abort", release);
        element.classList.remove("floating-window");
        handle.classList.remove("floating-window-handle");
    };
    signal?.addEventListener("abort", release, { once: true });
    if (signal?.aborted) release();
    return release;
}

uiCtx.capabilities.contribute("ui:makeFloatingWindow", makeFloatingWindow);
