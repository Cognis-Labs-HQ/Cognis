/**
 * Temporarily disables only layout editing controls during a submitted save.
 * Export: freezeLayoutControls locks the supplied editor and returns cleanup.
 * @example const release = freezeLayoutControls({ grid, panel, toggle, label });
 * @param {object} options Owned editor containers and localized saving label.
 * @returns {Function} Restores the captured controls without replacing content.
 */
export function freezeLayoutControls({ grid, panel, toggle, label }) {
    const cleanups = [];
    const actionSelector =
        ".composer-close-btn, .composer-resize-handle, [data-composer-remove], [data-composer-add]";
    const selector = `.composer-cell, ${actionSelector}, [data-composer-element][draggable]`;
    function isLayoutEvent(event) {
        if (event.target.closest(actionSelector)) return true;
        if (event.type === "keydown") {
            return (
                event.target.matches(".composer-cell") &&
                event.key.startsWith("Arrow")
            );
        }
        if (event.type.startsWith("pointer"))
            return event.target.matches(".composer-cell");
        return (
            ["dragstart", "dragover", "drop"].includes(event.type) &&
            event.target.matches("[data-composer-element][draggable]")
        );
    }
    const panelSelector = ".composer-panel-actions, [data-composer-panel-item]";
    for (const container of [grid, panel].filter(Boolean)) {
        for (const target of container.querySelectorAll(
            ".composer-cell, .composer-resize-handle, [data-composer-panel-item]",
        )) {
            target.dispatchEvent(
                new container.ownerDocument.defaultView.Event("pointercancel"),
            );
        }
    }
    function lock(container, controls, match) {
        if (!container) return;
        const busy = container.getAttribute("aria-busy");
        container.setAttribute("aria-busy", "true");
        const block = (event) => {
            if (match && !match(event)) return;
            event.preventDefault();
            event.stopImmediatePropagation();
        };
        const events = [
            "click",
            "keydown",
            "pointerdown",
            "pointermove",
            "pointerup",
            "dragstart",
            "dragover",
            "drop",
        ];
        for (const name of events)
            container.addEventListener(name, block, true);
        cleanups.push(() => {
            for (const name of events)
                container.removeEventListener(name, block, true);
            if (busy === null) container.removeAttribute("aria-busy");
            else container.setAttribute("aria-busy", busy);
        });
        for (const control of controls) {
            const disabled = control.disabled;
            const isSurface = control.matches(
                ".composer-cell, [data-composer-element][draggable]",
            );
            const description = control.getAttribute("aria-description");
            const tabIndex = control.getAttribute("tabindex");
            const ariaDisabled = control.getAttribute("aria-disabled");
            if (isSurface) control.setAttribute("aria-description", label);
            else control.setAttribute("aria-disabled", "true");
            if ("disabled" in control) control.disabled = true;
            control.tabIndex = -1;
            cleanups.push(() => {
                if ("disabled" in control) control.disabled = disabled;
                if (isSurface) {
                    if (description === null)
                        control.removeAttribute("aria-description");
                    else control.setAttribute("aria-description", description);
                }
                if (tabIndex === null) control.removeAttribute("tabindex");
                else control.setAttribute("tabindex", tabIndex);
                if (ariaDisabled === null)
                    control.removeAttribute("aria-disabled");
                else control.setAttribute("aria-disabled", ariaDisabled);
            });
        }
    }
    lock(grid, grid?.querySelectorAll(selector) ?? [], isLayoutEvent);
    lock(
        panel,
        panel?.querySelectorAll(
            ".composer-panel-actions a, .composer-panel-actions button, [data-composer-panel-item], .composer-add-btn",
        ) ?? [],
        (event) => event.target.closest(panelSelector),
    );
    lock(toggle, toggle ? [toggle] : [], null);
    for (const control of [
        toggle,
        panel?.querySelector(".composer-done-btn"),
    ].filter(Boolean)) {
        const title = control.getAttribute("title");
        const text = control.textContent;
        const ariaLabel = control.getAttribute("aria-label");
        if (control !== toggle) control.textContent = label;
        control.setAttribute("title", label);
        control.setAttribute("aria-label", label);
        cleanups.push(() => {
            if (control !== toggle) control.textContent = text;
            if (ariaLabel === null) control.removeAttribute("aria-label");
            else control.setAttribute("aria-label", ariaLabel);
            if (title === null) control.removeAttribute("title");
            else control.setAttribute("title", title);
        });
    }
    return () => {
        for (const cleanup of cleanups.splice(0).reverse()) cleanup();
    };
}
