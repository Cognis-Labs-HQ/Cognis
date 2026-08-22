/**
 * Applies and persists user-controlled ordering for primary navigation links.
 *
 * Public exports:
 * - `bindNavigationOrdering(container, options)` — enables drag ordering and
 *   keeps newly contributed navigation links in the saved order.
 *
 * @example
 * ```js
 * await bindNavigationOrdering(document.querySelector('.topnav'), {
 *   loadPreferences: loadUiPreferences,
 *   savePreferences: saveUiPreferences,
 * });
 * ```
 *
 * @param {Element | null} container
 * @param {{loadPreferences: () => Promise<object | null>, savePreferences: (patch: object) => Promise<void>, onSaveError?: (error: unknown) => void}} options
 * @returns {Promise<void>}
 */

const NAVIGATION_ORDER_KEY = "navigationOrder";

function navigationLinks(container) {
    return [...container.querySelectorAll(":scope > a[href]")];
}

function linkId(link) {
    return new URL(link.href, window.location.origin).pathname;
}

function applyOrder(container, order) {
    const positions = new Map(order.map((id, index) => [id, index]));
    const links = navigationLinks(container);
    const sortedLinks = [...links].sort((left, right) => {
        const leftPosition = positions.get(linkId(left));
        const rightPosition = positions.get(linkId(right));
        if (leftPosition == null && rightPosition == null) return 0;
        if (leftPosition == null) return 1;
        if (rightPosition == null) return -1;
        return leftPosition - rightPosition;
    });
    if (links.every((link, index) => link === sortedLinks[index])) return;
    container.append(...sortedLinks);
}

function markLinksDraggable(container) {
    for (const link of navigationLinks(container)) {
        link.draggable = true;
        link.dataset.navigationDraggable = "true";
    }
}

export async function bindNavigationOrdering(
    container,
    { loadPreferences, savePreferences, onSaveError } = {},
) {
    if (!(container instanceof Element)) return;
    if (container.dataset.navigationOrderingBound === "true") return;
    container.dataset.navigationOrderingBound = "true";

    const preferences = await loadPreferences?.();
    const savedOrder = Array.isArray(preferences?.[NAVIGATION_ORDER_KEY])
        ? preferences[NAVIGATION_ORDER_KEY].map(String)
        : [];
    applyOrder(container, savedOrder);
    markLinksDraggable(container);

    let draggedLink = null;
    container.addEventListener("dragstart", (event) => {
        const link =
            event.target instanceof Element
                ? event.target.closest(":scope > a[href]")
                : null;
        if (!link) return;
        draggedLink = link;
        link.classList.add("is-dragging");
        if (event.dataTransfer) {
            event.dataTransfer.effectAllowed = "move";
            event.dataTransfer.setData("text/plain", linkId(link));
        }
    });
    container.addEventListener("dragover", (event) => {
        if (!draggedLink) return;
        const target =
            event.target instanceof Element
                ? event.target.closest(":scope > a[href]")
                : null;
        if (!target || target === draggedLink) return;
        event.preventDefault();
        const placeAfter =
            event.clientX >
            target.getBoundingClientRect().left + target.offsetWidth / 2;
        target[placeAfter ? "after" : "before"](draggedLink);
    });
    container.addEventListener("dragend", async () => {
        if (!draggedLink) return;
        draggedLink.classList.remove("is-dragging");
        draggedLink = null;
        const order = navigationLinks(container).map(linkId);
        savedOrder.splice(0, savedOrder.length, ...order);
        try {
            await savePreferences?.({ [NAVIGATION_ORDER_KEY]: order });
        } catch (error) {
            onSaveError?.(error);
        }
    });

    new MutationObserver(() => {
        applyOrder(container, savedOrder);
        markLinksDraggable(container);
    }).observe(container, { childList: true });
}
