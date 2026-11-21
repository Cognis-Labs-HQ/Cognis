/**
 * Keeps page scrolling locked until every overlapping modal releases ownership.
 * Public export: lockPageScroll returns an idempotent release for one modal.
 * @example const unlock = lockPageScroll(document); unlock();
 */

import { uiCtx } from "./ui-ctx.js";

function createScrollLock() {
    const documents = new WeakMap();
    return (document) => {
        let state = documents.get(document);
        if (!state) {
            const window = document.defaultView;
            const elements = [
                document.documentElement,
                document.body,
                ...[...document.querySelectorAll("main")].filter((element) =>
                    /^(auto|scroll)$/.test(
                        window.getComputedStyle(element).overflowY,
                    ),
                ),
            ];
            state = {
                count: 0,
                elements: elements.map((element) => ({
                    element,
                    overflow: element.style.overflow,
                    scrollbarGutter: element.style.scrollbarGutter,
                })),
            };
            documents.set(document, state);
            for (const element of elements) {
                if (
                    element === document.documentElement
                        ? window.innerWidth > element.clientWidth
                        : element.scrollHeight > element.clientHeight
                )
                    element.style.scrollbarGutter = "stable";
                element.style.overflow = "hidden";
            }
        }
        state.count += 1;
        let released = false;
        return () => {
            if (released) return;
            released = true;
            state.count -= 1;
            if (state.count > 0) return;
            for (const {
                element,
                overflow,
                scrollbarGutter,
            } of state.elements) {
                element.style.overflow = overflow;
                element.style.scrollbarGutter = scrollbarGutter;
            }
            documents.delete(document);
        };
    };
}

/** @param {Document} document Page containing the modal. @returns {Function} Release this modal's scroll lock. */
export function lockPageScroll(document = globalThis.document) {
    if (!uiCtx.capabilities.get("ui:lockPageScroll"))
        uiCtx.capabilities.contribute("ui:lockPageScroll", createScrollLock());
    return uiCtx.capabilities.get("ui:lockPageScroll")(document);
}
