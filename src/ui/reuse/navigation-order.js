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
 * @param {{loadPreferences: () => Promise<object | null>, savePreferences: (patch: object) => Promise<void>, moveLabel?: string, onSaveError?: (error: unknown) => void}} options
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
    container.append(
        ...sortedLinks.flatMap((link) => [ensureDragHandle(link), link]),
    );
}

function ensureDragHandle(link, moveLabel = "") {
    const existing = link.previousElementSibling;
    if (existing?.classList.contains("navigation-drag-handle")) {
        if (moveLabel) existing.setAttribute("aria-label", moveLabel);
        return existing;
    }
    const handle = document.createElement("button");
    handle.type = "button";
    handle.className = "navigation-drag-handle btn-neutral";
    handle.setAttribute("aria-label", moveLabel);
    link.before(handle);
    return handle;
}

function prepareLinks(container, moveLabel) {
    for (const link of navigationLinks(container)) {
        link.draggable = false;
        ensureDragHandle(link, moveLabel);
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
    { loadPreferences, savePreferences, moveLabel = "", onSaveError } = {},
) {
    if (!(container instanceof Element)) return;
    if (container.dataset.navigationOrderingBound === "true") return;
    container.dataset.navigationOrderingBound = "true";

    const preferences = await loadPreferences?.();
    const savedOrder = Array.isArray(preferences?.[NAVIGATION_ORDER_KEY])
        ? preferences[NAVIGATION_ORDER_KEY].map(String)
        : [];
    prepareLinks(container, moveLabel);
    applyOrder(container, savedOrder);

    let draggedLink = null;
    let orderCommitted = false;
    container.addEventListener("click", (event) => {
        const handle =
            event.target instanceof Element
                ? event.target.closest(".navigation-drag-handle")
                : null;
        if (!handle) return;
        const link = handle.nextElementSibling;
        if (!(link instanceof HTMLAnchorElement)) return;
        for (const candidate of navigationLinks(container)) {
            candidate.draggable = candidate === link;
            candidate.classList.toggle(
                "is-reorder-enabled",
                candidate === link,
            );
        }
        link.focus();
    });
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
        draggedLink.classList.remove("is-reorder-enabled");
        draggedLink.draggable = false;
        draggedLink = null;
        if (orderCommitted) return;
        try {
            await commitOrder();
        } catch (error) {
            onSaveError?.(error);
        }
    });

    new MutationObserver(() => {
        prepareLinks(container, moveLabel);
        applyOrder(container, savedOrder);
    }).observe(container, { childList: true });
}
