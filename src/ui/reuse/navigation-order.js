/**
 * Applies and persists user-controlled ordering for primary navigation links.
 *
 * Public exports:
 * - `bindNavigationOrdering(container, options)` — adds one reorder toggle and
 *   persists drag-and-drop ordering, including newly contributed links.
 *
 * @example
 * await bindNavigationOrdering(document.querySelector(".topnav"), {
 *     loadPreferences,
 *     savePreferences,
 * });
 *
 * @param {Element | null} container - Navigation containing direct child links.
 * @param {object} options - Preference functions and translated labels.
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
    const sorted = [...links].sort((left, right) => {
        const a = positions.get(linkId(left));
        const b = positions.get(linkId(right));
        if (a == null && b == null) return 0;
        if (a == null) return 1;
        if (b == null) return -1;
        return a - b;
    });
    if (links.every((link, index) => link === sorted[index])) return;
    for (const link of sorted) container.append(link);
}

function createToggle(container, label) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "navigation-order-toggle btn-neutral";
    button.setAttribute("aria-label", label);
    button.setAttribute("aria-pressed", "false");
    button.innerHTML = '<span aria-hidden="true">⠿</span>';
    container.prepend(button);
    return button;
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
    applyOrder(container, savedOrder);
    const toggle = createToggle(container, moveLabel);
    let enabled = false;
    let draggedLink = null;

    function setEnabled(value) {
        enabled = value;
        toggle.setAttribute("aria-pressed", String(enabled));
        container.classList.toggle("is-reordering", enabled);
        for (const link of navigationLinks(container)) link.draggable = enabled;
    }

    async function commitOrder() {
        const order = navigationLinks(container).map(linkId);
        savedOrder.splice(0, savedOrder.length, ...order);
        await savePreferences?.({ [NAVIGATION_ORDER_KEY]: order });
    }

    toggle.addEventListener("click", () => setEnabled(!enabled));
    container.addEventListener("dragstart", (event) => {
        const link = event.target.closest?.(":scope > a[href]");
        if (!enabled || !link) return;
        draggedLink = link;
        link.classList.add("is-dragging");
        event.dataTransfer?.setData("text/plain", linkId(link));
    });
    container.addEventListener("dragover", (event) => {
        const target = event.target.closest?.(":scope > a[href]");
        if (!draggedLink || !target || target === draggedLink) return;
        event.preventDefault();
        const bounds = target.getBoundingClientRect();
        target[
            event.clientX > bounds.left + bounds.width / 2 ? "after" : "before"
        ](draggedLink);
    });
    container.addEventListener("drop", async (event) => {
        if (!draggedLink) return;
        event.preventDefault();
        try {
            await commitOrder();
        } catch (error) {
            onSaveError?.(error);
        }
    });
    container.addEventListener("dragend", () => {
        draggedLink?.classList.remove("is-dragging");
        draggedLink = null;
    });

    new MutationObserver(() => {
        for (const link of navigationLinks(container)) link.draggable = enabled;
        applyOrder(container, savedOrder);
    }).observe(container, { childList: true });
}
