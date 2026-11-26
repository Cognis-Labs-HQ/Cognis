/**
 * Creates a queued, lifecycle-owned instance of the shared floating action menu.
 * Public exports: createFloatingMenu — renders localized actions and owns their cleanup.
 * @example const menu = createFloatingMenu({ document, label, signal, items });
 * @param {object} options Document, accessible label, lifetime, actions, optional priority and shared session lease.
 * @returns {{element: HTMLElement, ready: Promise<boolean>, dispose: () => void}} The menu and its cleanup.
 */
import { uiCtx } from "./ui-ctx.js";

export function createFloatingMenu({
    document,
    label,
    signal,
    items,
    lease,
    priority = 0,
    ctx = uiCtx,
}) {
    const ownerSignal = signal ?? ctx.signal;
    ownerSignal?.throwIfAborted();
    const controller = new AbortController();
    const scoped = ownerSignal
        ? AbortSignal.any([ownerSignal, controller.signal])
        : controller.signal;
    const element = document.createElement("div");
    element.className = "floating-toolbar";
    element.hidden = true;
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
    const queue = ctx.capabilities.get("ui:floatingMenus");
    if (!queue) throw new Error("floating_menu_queue_unavailable");
    let disposed = false;
    const ownership = Promise.resolve(
        lease ?? queue.request({ signal: scoped, priority }),
    );
    const ready = ownership.then(async (current) => {
        if (disposed || scoped.aborted) return false;
        if (!(await current.present(element)) || disposed || scoped.aborted)
            return false;
        return current.ready;
    });
    void ready.catch((error) => {
        const cancelled = scoped.aborted;
        dispose();
        if (!cancelled)
            ctx.capabilities.get("ui:log")?.(
                "error",
                "Floating menu presentation failed.",
                {
                    component: "ui",
                    operation: "presentFloatingMenu",
                    errorName: error?.name,
                },
            );
    });
    const release = () => {
        if (disposed) return;
        disposed = true;
        void ownership
            .then((current) =>
                lease ? current.dismiss(element) : current.dispose(),
            )
            .catch((error) => {
                if (scoped.aborted && error?.name === "AbortError") return;
                ctx.capabilities.get("ui:log")?.(
                    "error",
                    "Floating menu cleanup failed.",
                    {
                        component: "ui",
                        operation: "disposeFloatingMenu",
                        errorName: error?.name,
                    },
                );
            });
        element.remove();
    };
    const dispose = () => {
        controller.abort();
        release();
    };
    scoped.addEventListener("abort", release, { once: true });
    document.body.append(element);
    return { element, ready, dispose };
}
