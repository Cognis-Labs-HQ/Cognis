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

function moveWithDisplacementAnimation(
    container,
    draggedLink,
    target,
    placeAfter,
) {
    const links = navigationLinks(container).filter(
        (link) => link !== draggedLink,
    );
    const previousPositions = new Map(
        links.map((link) => [link, link.getBoundingClientRect()]),
    );
    target[placeAfter ? "after" : "before"](draggedLink);
    for (const link of links) {
        const previous = previousPositions.get(link);
        const current = link.getBoundingClientRect();
        const offsetX = previous.left - current.left;
        const offsetY = previous.top - current.top;
        if (offsetX || offsetY) {
            link.animate(
                [
                    { transform: `translate(${offsetX}px, ${offsetY}px)` },
                    { transform: "translate(0, 0)" },
                ],
                { duration: 160, easing: "ease-out" },
            );
        }
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
    let orderCommitted = false;
    async function commitOrder() {
        const order = navigationLinks(container).map(linkId);
        savedOrder.splice(0, savedOrder.length, ...order);
        await savePreferences?.({ [NAVIGATION_ORDER_KEY]: order });
    }
    container.addEventListener("dragstart", (event) => {
        const link =
            event.target instanceof Element
                ? event.target.closest(":scope > a[href]")
                : null;
        if (!link) return;
        draggedLink = link;
        orderCommitted = false;
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
        moveWithDisplacementAnimation(
            container,
            draggedLink,
            target,
            placeAfter,
        );
    });
    container.addEventListener("drop", async (event) => {
        if (!draggedLink) return;
        event.preventDefault();
        orderCommitted = true;
        try {
            await commitOrder();
        } catch (error) {
            onSaveError?.(error);
        }
    });
    container.addEventListener("dragend", async () => {
        if (!draggedLink) return;
        draggedLink.classList.remove("is-dragging");
        draggedLink = null;
        if (orderCommitted) return;
        try {
            await commitOrder();
        } catch (error) {
            onSaveError?.(error);
        }
    });

    new MutationObserver(() => {
        applyOrder(container, savedOrder);
        markLinksDraggable(container);
    }).observe(container, { childList: true });
}
