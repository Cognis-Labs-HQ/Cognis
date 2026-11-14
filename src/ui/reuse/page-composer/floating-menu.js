/**
 * Mounts composer floating slots behind the shared floating-menu queue.
 * Public export: mountComposerFloatingMenu — binds slots and queue ownership to the page lifetime.
 * @example mountComposerFloatingMenu({ root, items, signal, ctx });
 * @param {object} options Composer root, slot descriptors, lifetime and public context.
 * @returns {void}
 */
export function mountComposerFloatingMenu({ root, items, signal, ctx }) {
    const toolbar = root.querySelector(".floating-toolbar");
    if (!toolbar) return;
    const queue = ctx.capabilities.get("ui:floatingMenus");
    if (!queue) throw new Error("floating_menu_queue_unavailable");
    toolbar.hidden = true;
    toolbar.replaceChildren();
    for (const item of items) {
        const slot = root.ownerDocument.createElement("div");
        slot.dataset.floatingSlot = item.id;
        slot.hidden = true;
        slot.innerHTML = item.render();
        toolbar.appendChild(slot);
    }
    const log = (error) =>
        ctx.capabilities.get("ui:log")?.(
            "error",
            "Composer floating menu failed.",
            {
                component: "ui",
                operation: "composerFloatingMenu",
                errorName: error?.name,
            },
        );
    const ownership = queue.request({ signal });
    const update = () => {
        const visible = [
            ...toolbar.querySelectorAll("[data-floating-slot]"),
        ].some((slot) => !slot.hidden);
        void ownership
            .then((lease) => lease.present(toolbar, { visible }))
            .catch(log);
    };
    const observer = new MutationObserver(update);
    for (const slot of toolbar.querySelectorAll("[data-floating-slot]"))
        observer.observe(slot, {
            attributes: true,
            attributeFilter: ["hidden"],
        });
    signal.addEventListener(
        "abort",
        () => {
            observer.disconnect();
            toolbar.hidden = true;
        },
        { once: true },
    );
    update();
}
