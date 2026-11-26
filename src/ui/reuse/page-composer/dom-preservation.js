/**
 * Preserves stateful element DOM nodes while the page composer rerenders.
 *
 * Public exports:
 *   createDomPreservation(state) — creates DOM parking and refresh operations.
 *
 * Usage:
 *   const preservation = createDomPreservation(composerState);
 *   preservation.parkPreservedElementNodes();
 *
 * @param {object} state - Mutable page composer rendering state.
 * @returns {{ parkPreservedElementNodes: Function, renderElementContent: Function, refreshElements: Function, syncElementPresentation: Function, consumeElementRender: Function }}
 */
import {
    composerPresentation,
    applyComposerPresentation,
} from "./presentation.js";
export function createDomPreservation(state, { redraw } = {}) {
    const renderedLayouts = new WeakMap();
    const pendingMounts = new WeakSet();
    const tracked = new WeakMap();
    let observer;
    let frame;
    function trackPresentation(host, element) {
        if (state.signal.aborted) return;
        if (!observer) {
            const window = host.ownerDocument.defaultView;
            observer = new window.ResizeObserver((entries) => {
                for (const { target } of entries) {
                    if (!target.isConnected) {
                        observer.unobserve(target);
                        tracked.delete(target);
                        continue;
                    }
                    const current = tracked.get(target);
                    if (!current) continue;
                    const presentation = composerPresentation(target);
                    applyComposerPresentation(state.root, target, presentation);
                    if (
                        current.responsive &&
                        renderedLayouts.get(target) !== presentation.layout
                    ) {
                        if (frame === undefined)
                            frame = window.requestAnimationFrame(() => {
                                frame = undefined;
                                if (!state.signal.aborted) redraw();
                            });
                    } else current.onResize?.(presentation);
                }
            });
            state.signal.addEventListener(
                "abort",
                () => {
                    observer.disconnect();
                    window.cancelAnimationFrame(frame);
                },
                { once: true },
            );
        }
        tracked.set(host, element);
        observer.observe(host);
    }
    const MEDIA_PRESERVE_SELECTOR =
        'iframe,img,video,audio,canvas,object,embed,[data-composer-preserve="true"]';

    function getPreservedElementNodes() {
        if (!state.preservedElementNodes) {
            state.preservedElementNodes = new Map();
        }
        return state.preservedElementNodes;
    }
    function getPreservedElementParking() {
        if (state.preservedElementParking?.isConnected) {
            return state.preservedElementParking;
        }
        const parking = document.createElement("div");
        parking.className = "composer-preserved-element-parking";
        parking.setAttribute("aria-hidden", "true");
        state.root.appendChild(parking);
        state.preservedElementParking = parking;
        return parking;
    }
    function shouldPreserveRenderedHost(host) {
        return (
            state.enableDomParking &&
            Boolean(host?.querySelector?.(MEDIA_PRESERVE_SELECTOR))
        );
    }
    function shouldPreserveRenderedHtml(element, html) {
        if (!state.enableDomParking) return false;
        if (element.preserveDom || element.preserveOnRefresh) return true;
        const template = document.createElement("template");
        template.innerHTML = html;
        return Boolean(template.content.querySelector(MEDIA_PRESERVE_SELECTOR));
    }
    function moveHostChildrenToPreservedNode(host) {
        const preserved = document.createElement("div");
        preserved.className = "composer-preserved-element-content";
        while (host.firstChild) {
            preserved.appendChild(host.firstChild);
        }
        return preserved;
    }
    function parkPreservedElementNodes() {
        if (!state.enableDomParking) return;
        const preservedNodes = getPreservedElementNodes();
        const parking = getPreservedElementParking();
        state.contentGrid
            ?.querySelectorAll("[data-composer-element]")
            .forEach((host) => {
                const elementId = host.dataset.composerElement;
                if (!elementId) return;
                let preserved = preservedNodes.get(elementId);
                if (!preserved && shouldPreserveRenderedHost(host)) {
                    preserved = moveHostChildrenToPreservedNode(host);
                    preservedNodes.set(elementId, preserved);
                }
                if (preserved?.isConnected) {
                    parking.appendChild(preserved);
                }
            });
    }
    function renderElementContent(host, element) {
        const presentation = composerPresentation(host);
        applyComposerPresentation(state.root, host, presentation);
        renderedLayouts.set(host, presentation.layout);
        pendingMounts.add(host);
        trackPresentation(host, element);
        const preservedNodes = getPreservedElementNodes();
        let preserved = preservedNodes.get(element.id);
        if (preserved) {
            host.replaceChildren(preserved);
            return;
        }
        const html = element.render(presentation);
        if (shouldPreserveRenderedHtml(element, html)) {
            preserved = document.createElement("div");
            preserved.className = "composer-preserved-element-content";
            preserved.innerHTML = html;
            preservedNodes.set(element.id, preserved);
            host.replaceChildren(preserved);
            return;
        }
        host.innerHTML = html;
    }
    function refreshElements(elementIds) {
        for (const elementId of elementIds) {
            const element = state.elements.find(
                (candidateElement) => candidateElement.id === elementId,
            );
            const host = state.contentGrid?.querySelector(
                `[data-composer-element="${CSS.escape(elementId)}"]`,
            );
            if (element && host instanceof HTMLElement) {
                renderElementContent(host, element);
            }
        }
    }
    function syncElementPresentation(host, element) {
        const presentation = composerPresentation(host);
        applyComposerPresentation(state.root, host, presentation);
        if (
            element.responsive &&
            renderedLayouts.get(host) !== presentation.layout
        )
            renderElementContent(host, element);
        element.onResize?.(presentation);
    }
    function consumeElementRender(host) {
        const rendered = pendingMounts.has(host);
        pendingMounts.delete(host);
        return rendered;
    }
    return {
        consumeElementRender,
        syncElementPresentation,
        parkPreservedElementNodes,
        renderElementContent,
        refreshElements,
    };
}
