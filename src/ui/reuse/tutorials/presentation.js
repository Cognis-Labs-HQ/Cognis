import { usableTarget } from "./targets.js";

const focusable =
    "button, a[href], input, select, textarea, [tabindex], [contenteditable='true']";

function viewportBounds(window) {
    return (
        window.visualViewport ?? {
            width: window.innerWidth,
            height: window.innerHeight,
            offsetLeft: 0,
            offsetTop: 0,
        }
    );
}

/** Place a bounded callout beside the target, clamping it to the visual viewport. */
export function placeCallout(
    rect,
    box,
    viewport,
    placement = "auto",
    padding = 10,
) {
    const gap = padding + 14;
    const offsetLeft = viewport.offsetLeft ?? 0;
    const offsetTop = viewport.offsetTop ?? 0;
    let side = placement;
    if (side === "auto")
        side =
            offsetTop + viewport.height - rect.bottom > box.height + gap
                ? "bottom"
                : "top";
    let left = rect.left + rect.width / 2 - box.width / 2;
    let top = side === "top" ? rect.top - box.height - gap : rect.bottom + gap;
    if (side === "left" || side === "right") {
        left = side === "left" ? rect.left - box.width - gap : rect.right + gap;
        top = rect.top + rect.height / 2 - box.height / 2;
    }
    return {
        side,
        left: Math.max(
            offsetLeft + 8,
            Math.min(left, offsetLeft + viewport.width - box.width - 8),
        ),
        top: Math.max(
            offsetTop + 8,
            Math.min(top, offsetTop + viewport.height - box.height - 8),
        ),
    };
}

/** Render session-owned effects without moving or modifying the target element. */
export function createTutorialView({ document, hostI18n, loadStyles }) {
    return async ({
        step,
        text,
        index,
        total,
        waiting,
        missing,
        target,
        signal,
        actions,
        valid,
        lost,
        interacted,
    }) => {
        await loadStyles();
        signal.throwIfAborted();
        const window = document.defaultView;
        const controls = new AbortController();
        const scoped = AbortSignal.any([signal, controls.signal]);
        const root = document.createElement("div");
        root.className = "tutorial-layer";
        const spotlight = document.createElement("div");
        spotlight.className = "tutorial-spotlight";
        spotlight.setAttribute("aria-hidden", "true");
        const panel = document.createElement("section");
        panel.className = "tutorial-callout";
        panel.tabIndex = -1;
        panel.setAttribute("role", "region");
        panel.setAttribute("aria-label", hostI18n.t("ui.reuse.tutorials"));
        const id = `tutorial-${crypto.randomUUID()}`;
        const title = document.createElement("h2");
        title.id = id + "-title";
        title.textContent = text.title;
        const progress = document.createElement("p");
        progress.className = "tutorial-progress";
        progress.setAttribute("role", "status");
        progress.setAttribute("aria-live", "polite");
        progress.setAttribute("aria-atomic", "true");
        progress.textContent = hostI18n
            .t("ui.tutorial.progress")
            .replace("{{current}}", String(index + 1))
            .replace("{{total}}", String(total));
        const body = document.createElement("p");
        body.textContent = waiting
            ? text.body +
              " " +
              hostI18n.t(
                  missing ? "ui.tutorial.missing" : "ui.tutorial.waiting",
              )
            : text.body;
        body.id = id + "-body";
        panel.setAttribute("aria-describedby", body.id);
        panel.setAttribute("aria-labelledby", title.id);
        body.className = "tutorial-body";
        body.classList.toggle(
            "tutorial-offscreen",
            !waiting && !step.effects.callout,
        );
        title.classList.toggle(
            "tutorial-offscreen",
            !waiting && !step.effects.callout,
        );
        const buttons = document.createElement("div");
        buttons.className = "tutorial-actions";
        const button = (key, action, disabled = false, variant = "neutral") => {
            const element = document.createElement("button");
            element.type = "button";
            element.className = `btn-${variant} btn-animated`;
            element.textContent = hostI18n.t(key);
            element.disabled = disabled;
            element.addEventListener("click", action, { signal: scoped });
            buttons.append(element);
            return element;
        };
        button(
            "ui.reuse.back",
            actions.back,
            (waiting && !missing) || index === 0,
        );
        if (missing) button("ui.reuse.retry", actions.retry);
        else
            button(
                index === total - 1 ? "ui.reuse.finish" : "ui.reuse.next",
                actions.next,
                Boolean(waiting || step.waitFor || step.advance),
                "confirm",
            );
        button("ui.reuse.skip", actions.skip);
        button("ui.reuse.cancel", actions.cancel);
        panel.append(progress, title, body, buttons);
        const arrow = document.createElement("div");
        arrow.className = "tutorial-arrow";
        arrow.setAttribute("aria-hidden", "true");
        root.append(spotlight, arrow, panel);
        document.body.append(root);
        let disposed = false,
            frame,
            resize;
        function dispose() {
            if (disposed) return;
            disposed = true;
            controls.abort();
            window.cancelAnimationFrame(frame);
            resize?.disconnect();
            root.remove();
        }
        const isPopup = () =>
            Boolean(document.querySelector(".popup-overlay--visible"));
        const contains = (node, event) =>
            panel.contains(node) ||
            (target &&
                (target.contains(node) ||
                    event?.composedPath?.().includes(target)));
        const candidates = () =>
            [
                ...(target
                    ? [target, ...target.querySelectorAll(focusable)]
                    : []),
                ...panel.querySelectorAll(focusable),
            ].filter(
                (item) =>
                    !item.disabled &&
                    (item.tabIndex >= 0 || item.isContentEditable) &&
                    usableTarget(item, document),
            );
        function focusPanel() {
            panel.focus({ preventScroll: true });
        }
        function block(event) {
            if (isPopup()) {
                actions.cancel();
                return;
            }
            if (!contains(event.target, event)) {
                event.preventDefault();
                event.stopImmediatePropagation();
                focusPanel();
            }
        }
        function update() {
            if (disposed || scoped.aborted) return;
            if (isPopup()) {
                dispose();
                actions.cancel();
                return;
            }
            try {
                if (valid && !valid()) {
                    dispose();
                    lost?.();
                    return;
                }
            } catch (error) {
                dispose();
                lost?.(error);
                return;
            }
            const viewport = viewportBounds(window);
            panel.style.maxHeight = `${Math.max(100, viewport.height - 24)}px`;
            panel.style.maxWidth = `${Math.max(48, viewport.width - 16)}px`;
            if (target) {
                const rect = target.getBoundingClientRect();
                const padding = step.padding ?? 8;
                spotlight.hidden = !step.effects.spotlight;
                Object.assign(spotlight.style, {
                    left: `${rect.left - padding}px`,
                    top: `${rect.top - padding}px`,
                    width: `${rect.width + padding * 2}px`,
                    height: `${rect.height + padding * 2}px`,
                });
                const box = panel.getBoundingClientRect();
                const position = placeCallout(
                    rect,
                    box,
                    viewport,
                    step.placement,
                    padding,
                );
                Object.assign(panel.style, {
                    left: `${position.left}px`,
                    top: `${position.top}px`,
                });
                arrow.hidden = !step.effects.arrow;
                const x =
                    position.side === "left"
                        ? rect.left - padding - 8
                        : position.side === "right"
                          ? rect.right + padding + 8
                          : Math.max(
                                8,
                                Math.min(
                                    window.innerWidth - 8,
                                    rect.left + rect.width / 2,
                                ),
                            );
                arrow.dataset.side = position.side;
                const y =
                    position.side === "top"
                        ? rect.top - padding - 8
                        : position.side === "bottom"
                          ? rect.bottom + padding + 8
                          : rect.top + rect.height / 2;
                Object.assign(arrow.style, {
                    left: `${Math.max(viewport.offsetLeft + 8, Math.min(x, viewport.offsetLeft + viewport.width - 8))}px`,
                    top: `${Math.max(viewport.offsetTop + 8, Math.min(y, viewport.offsetTop + viewport.height - 8))}px`,
                });
            } else {
                spotlight.hidden = true;
                arrow.hidden = true;
                panel.style.left = "50%";
                panel.style.top = "16px";
                panel.style.transform = "translateX(-50%)";
            }
            frame = window.requestAnimationFrame(update);
        }
        if (target && !waiting) {
            const rect = target.getBoundingClientRect();
            const viewport = viewportBounds(window);
            if (
                rect.top < viewport.offsetTop ||
                rect.bottom > viewport.offsetTop + viewport.height ||
                rect.left < viewport.offsetLeft ||
                rect.right > viewport.offsetLeft + viewport.width
            )
                target.scrollIntoView({
                    block: "center",
                    inline: "nearest",
                    behavior: "instant",
                });
            if (step.advance)
                document.addEventListener(
                    step.advance.event,
                    (event) => {
                        if (
                            contains(event.target, event) &&
                            !panel.contains(event.target) &&
                            !event.defaultPrevented
                        )
                            interacted?.(event);
                    },
                    { signal: scoped },
                );
        }
        const blocking = Boolean(
            !waiting && target && step.interaction === "target",
        );
        root.dataset.blocking = String(blocking);
        if (blocking) {
            for (const type of [
                "pointerdown",
                "pointerup",
                "click",
                "dblclick",
                "contextmenu",
                "touchstart",
                "touchend",
            ])
                document.addEventListener(type, block, {
                    capture: true,
                    passive: false,
                    signal: scoped,
                });
            document.addEventListener("focusin", block, {
                capture: true,
                signal: scoped,
            });
        }
        document.addEventListener(
            "keydown",
            (event) => {
                if (isPopup()) {
                    actions.cancel();
                    return;
                }
                if (event.key === "Escape") {
                    event.preventDefault();
                    event.stopImmediatePropagation();
                    actions.cancel();
                    return;
                }
                if (!blocking) return;
                if (event.key === "Tab") {
                    const options = candidates();
                    let focused = document.activeElement;
                    while (focused?.shadowRoot?.activeElement)
                        focused = focused.shadowRoot.activeElement;
                    const current = options.indexOf(focused);
                    const next = event.shiftKey
                        ? current <= 0
                            ? options.length - 1
                            : current - 1
                        : (current + 1) % options.length;
                    event.preventDefault();
                    (options[next] ?? panel).focus({ preventScroll: true });
                } else if (["Enter", " "].includes(event.key)) block(event);
            },
            { capture: true, signal: scoped },
        );
        if (window.ResizeObserver) {
            resize = new window.ResizeObserver(() => {
                window.cancelAnimationFrame(frame);
                update();
            });
            resize.observe(panel);
            if (target) resize.observe(target);
        }
        scoped.addEventListener("abort", dispose, { once: true });
        update();
        if (!waiting || missing) focusPanel();
        return { dispose };
    };
}
