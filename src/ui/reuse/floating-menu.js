/**
 * Creates an independent instance of the shared floating action menu.
 * Public exports: createFloatingMenu — renders localized actions and owns their cleanup.
 * @example const menu = createFloatingMenu({ document, label, signal, items });
 * @param {object} options Document, accessible label, lifetime and action descriptors.
 * @returns {{element: HTMLElement, dispose: () => void}} The menu and its cleanup.
 */
export function createFloatingMenu({ document, label, signal, items }) {
    signal?.throwIfAborted();
    const controller = new AbortController();
    const scoped = signal
        ? AbortSignal.any([signal, controller.signal])
        : controller.signal;
    const element = document.createElement("div");
    element.className = "floating-toolbar";
    element.setAttribute("role", "group");
    element.setAttribute("aria-label", label);
    for (const item of items) {
        const button = document.createElement("button");
        button.type = "button";
        button.className = `btn-${item.variant ?? "neutral"} btn-animated`;
        button.textContent = item.label;
        button.disabled = Boolean(item.disabled);
        button.dataset.action = item.id;
        button.addEventListener("click", item.execute, { signal: scoped });
        element.append(button);
    }
    const dispose = () => {
        controller.abort();
        element.remove();
    };
    scoped.addEventListener("abort", () => element.remove(), { once: true });
    document.body.append(element);
    return { element, dispose };
}
