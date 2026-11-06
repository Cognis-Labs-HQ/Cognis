/**
 * Presents tutorial effects and localized controls in independently owned floating menus.
 * Public exports: placeCallout — clamps a callout to the visual viewport;
 * createTutorialView — creates a renderer with session-scoped cleanup.
 * @example const view = createTutorialView({ document, hostI18n, loadStyles });
 */
import { createFloatingMenu } from "../floating-menu.js";
import { usableTarget } from "./targets.js";
import {
    clipRect,
    shadeRegions,
    tutorialViewport,
    visibleTargetRect,
} from "./geometry.js";

const focusable =
    "button, a[href], input, select, textarea, [tabindex], [contenteditable='true']";

/** Place a bounded callout beside the target, clamping it to the visual viewport. */
/**
 * @param {DOMRect} rect Target bounds.
 * @param {object} box Callout dimensions.
 * @param {object} viewport Visual viewport dimensions and offsets.
 * @param {string} placement Preferred side.
 * @param {number} padding Target spacing.
 * @returns {{side: string, left: number, top: number}} Clamped placement.
 */
export function placeCallout(
    rect,
    box,
    viewport,
    placement = "auto",
    padding = 10,
) {
    const gap = padding + 14;
    const leftEdge = (viewport.offsetLeft ?? 0) + 8;
    const topEdge = (viewport.offsetTop ?? 0) + 8;
    const rightEdge = (viewport.offsetLeft ?? 0) + viewport.width - 8;
    const bottomEdge = (viewport.offsetTop ?? 0) + viewport.height - 8;
    const horizontal = rect.left + rect.width / 2 - box.width / 2;
    const vertical = rect.top + rect.height / 2 - box.height / 2;
    const candidates = {
        bottom: { left: horizontal, top: rect.bottom + gap },
        top: { left: horizontal, top: rect.top - box.height - gap },
        right: { left: rect.right + gap, top: vertical },
        left: { left: rect.left - box.width - gap, top: vertical },
    };
    const sides = [
        ...new Set([
            ...(placement === "auto" ? [] : [placement]),
            "bottom",
            "top",
            "right",
            "left",
        ]),
    ];
    for (const side of sides) {
        const candidate = candidates[side];
        const left = Math.max(
            leftEdge,
            Math.min(candidate.left, rightEdge - box.width),
        );
        const top = Math.max(
            topEdge,
            Math.min(candidate.top, bottomEdge - box.height),
        );
        const overlaps =
            left < rect.right &&
            left + box.width > rect.left &&
            top < rect.bottom &&
            top + box.height > rect.top;
        if (
            !overlaps &&
            left + box.width <= rightEdge &&
            top + box.height <= bottomEdge
        )
            return { side, left, top };
    }
    // Oversized targets can fill every side. Keep copy readable inside the visible area without a misleading arrow.
    return {
        side: "inside",
        left: Math.max(leftEdge, Math.min(horizontal, rightEdge - box.width)),
        top: topEdge,
    };
}

/** Render session-owned effects without moving or modifying the target element. */
/**
 * @param {object} dependencies Document, host localization and stylesheet loader.
 * @returns {Function} An asynchronous renderer returning session-owned cleanup.
 */
export function createTutorialView({ document, hostI18n, loadStyles }) {
    return async ({
        step,
        text,
        index,
        total,
        firstTime = false,
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
        if (step.layer === "overlay") root.style.zIndex = "2200";
        const shade = document.createElement("div");
        shade.className = "tutorial-shade";
        shade.setAttribute("aria-hidden", "true");
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
        const items = [];
        const button = (
            id,
            key,
            execute,
            disabled = false,
            variant = "neutral",
        ) =>
            items.push({
                id,
                label: hostI18n.t(key),
                execute(event) {
                    // Progression can dispose this menu before the click bubbles.
                    event.stopPropagation();
                    execute();
                },
                disabled,
                variant,
            });
        button(
            "back",
            "ui.reuse.back",
            actions.back,
            (waiting && !missing) || index === 0,
        );
        button("restart", "ui.tutorial.restart", actions.restart);
        if (missing) button("retry", "ui.reuse.retry", actions.retry);
        button(
            "next",
            index === total - 1 ? "ui.reuse.finish" : "ui.reuse.next",
            actions.next,
            !firstTime && waiting && !missing,
            "neutral",
        );
        if (!firstTime) {
            button("skip", "ui.reuse.skip", actions.skip);
            button(
                "cancel",
                "ui.reuse.cancel",
                actions.cancel,
                false,
                "cancel",
            );
        }
        const menu = createFloatingMenu({
            document,
            label: hostI18n.t("ui.reuse.tutorials"),
            signal: scoped,
            items,
        });
        menu.element.classList.add("tutorial-actions");
        menu.element
            .querySelector('[data-action="next"]')
            .classList.toggle(
                "tutorial-next-prompt",
                Boolean(step.highlightNext === true && (!waiting || missing)),
            );
        panel.append(progress, title, body);
        const arrow = document.createElement("div");
        arrow.className = "tutorial-arrow";
        arrow.setAttribute("aria-hidden", "true");
        root.append(shade, spotlight, arrow, panel, menu.element);
        document.body.append(root);
        let interactionPending = false;
        let disposed = false,
            frame,
            resize;
        function dispose() {
            if (disposed) return;
            disposed = true;
            controls.abort();
            window.cancelAnimationFrame(frame);
            resize?.disconnect();
            menu.dispose();
            root.remove();
        }
        const isPopup = () =>
            Boolean(document.querySelector(".popup-overlay--visible"));
        const isBroadcast = (node, event) =>
            Boolean(
                node?.closest?.("#site-top-banners") ||
                event
                    ?.composedPath?.()
                    .some((element) => element.id === "site-top-banners"),
            );
        const containsControls = (node) =>
            panel.contains(node) ||
            menu.element.contains(node) ||
            isBroadcast(node);
        const contains = (node, event) =>
            containsControls(node) ||
            (step.interaction !== "none" &&
                target &&
                (target.contains(node) ||
                    event?.composedPath?.().includes(target)));
        const candidates = () =>
            [
                ...(target && step.interaction !== "none"
                    ? [target, ...target.querySelectorAll(focusable)]
                    : []),
                ...panel.querySelectorAll(focusable),
                ...menu.element.querySelectorAll(focusable),
                ...(document
                    .querySelector("#site-top-banners")
                    ?.querySelectorAll(focusable) ?? []),
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
                actions.modal();
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
                actions.modal();
                return;
            }
            try {
                if (valid && !valid(interactionPending)) {
                    dispose();
                    lost?.();
                    return;
                }
            } catch (error) {
                dispose();
                lost?.(error);
                return;
            }
            const viewport = tutorialViewport(
                window,
                document,
                target,
                step.layer,
            );
            menu.element.style.maxWidth = `${Math.max(48, viewport.width - 16)}px`;
            menu.element.style.maxHeight = `${Math.max(48, viewport.height - 16)}px`;
            const menuBox = menu.element.getBoundingClientRect();
            const menuTop = Math.max(
                viewport.offsetTop + 8,
                viewport.offsetTop + viewport.height - menuBox.height - 12,
            );
            Object.assign(menu.element.style, {
                left: `${viewport.offsetLeft + viewport.width / 2}px`,
                top: `${menuTop}px`,
                bottom: "auto",
            });
            const panelViewport = {
                ...viewport,
                height: Math.max(0, menuTop - viewport.offsetTop - 8),
            };
            panel.hidden = panelViewport.height < 56;
            panel.style.maxHeight = `${Math.max(24, panelViewport.height - 16)}px`;
            panel.style.maxWidth = `${Math.max(48, viewport.width - 16)}px`;
            const visible =
                target &&
                visibleTargetRect(target, viewport, step.padding ?? 8);
            spotlight.hidden = !visible || !step.effects.spotlight;
            shade.hidden = spotlight.hidden;
            if (!shade.hidden) {
                const controlsBox = menu.element.getBoundingClientRect();
                const regions = shadeRegions(
                    {
                        left: 0,
                        top: 0,
                        right: window.innerWidth,
                        bottom: window.innerHeight,
                    },
                    [
                        visible,
                        ...[
                            ...document.querySelectorAll("#site-top-banners"),
                        ].map((banner) => banner.getBoundingClientRect()),
                        {
                            left: controlsBox.left - 4,
                            top: controlsBox.top - 4,
                            right: controlsBox.right + 4,
                            bottom: controlsBox.bottom + 4,
                        },
                    ],
                );
                const path = regions
                    .map(
                        ({ left, top, right, bottom }) =>
                            `M${left},${top}H${right}V${bottom}H${left}Z`,
                    )
                    .join(" ");
                shade.style.clipPath = `path("${path}")`;
            }
            if (visible)
                Object.assign(spotlight.style, {
                    left: `${visible.left}px`,
                    top: `${visible.top}px`,
                    width: `${visible.width}px`,
                    height: `${visible.height}px`,
                });
            const anchor =
                visible &&
                clipRect(visible, {
                    left: panelViewport.offsetLeft,
                    top: panelViewport.offsetTop,
                    right: panelViewport.offsetLeft + panelViewport.width,
                    bottom: panelViewport.offsetTop + panelViewport.height,
                });
            const box = panel.getBoundingClientRect();
            const position = anchor
                ? placeCallout(anchor, box, panelViewport, step.placement, 0)
                : {
                      side: "inside",
                      left:
                          viewport.offsetLeft +
                          Math.max(8, (viewport.width - box.width) / 2),
                      top: viewport.offsetTop + 8,
                  };
            Object.assign(panel.style, {
                left: `${position.left}px`,
                top: `${position.top}px`,
            });
            arrow.hidden =
                panel.hidden ||
                !anchor ||
                !step.effects.arrow ||
                position.side === "inside";
            if (!arrow.hidden) {
                const x =
                    position.side === "left"
                        ? anchor.left - 8
                        : position.side === "right"
                          ? anchor.right + 8
                          : anchor.left + anchor.width / 2;
                const y =
                    position.side === "top"
                        ? anchor.top - 8
                        : position.side === "bottom"
                          ? anchor.bottom + 8
                          : anchor.top + anchor.height / 2;
                arrow.dataset.side = position.side;
                Object.assign(arrow.style, { left: `${x}px`, top: `${y}px` });
            }
            frame = window.requestAnimationFrame(update);
        }
        if (target && !waiting) {
            const rect = target.getBoundingClientRect();
            const viewport = tutorialViewport(
                window,
                document,
                target,
                step.layer,
            );
            const visible = visibleTargetRect(target, viewport);
            const fits =
                rect.width <= viewport.width && rect.height <= viewport.height;
            if (
                !visible ||
                (fits &&
                    (rect.top < viewport.offsetTop ||
                        rect.bottom > viewport.offsetTop + viewport.height ||
                        rect.left < viewport.offsetLeft ||
                        rect.right > viewport.offsetLeft + viewport.width))
            )
                target.scrollIntoView({
                    block:
                        rect.height <= viewport.height ? "center" : "nearest",
                    inline: "nearest",
                    behavior: "instant",
                });
            if (step.advance) {
                let advanceTimer;
                scoped.addEventListener(
                    "abort",
                    () => window.clearTimeout(advanceTimer),
                    { once: true },
                );
                document.addEventListener(
                    step.advance.event,
                    (event) => {
                        if (
                            !contains(event.target, event) ||
                            panel.contains(event.target) ||
                            menu.element.contains(event.target)
                        )
                            return;
                        window.clearTimeout(advanceTimer);
                        interactionPending = true;
                        advanceTimer = window.setTimeout(() => {
                            if (scoped.aborted || event.defaultPrevented) {
                                interactionPending = false;
                                return;
                            }
                            Promise.resolve()
                                .then(() => interacted?.(event))
                                .catch((error) => lost?.(error))
                                .finally(() => {
                                    interactionPending = false;
                                });
                        }, 0);
                    },
                    { capture: true, signal: scoped },
                );
            }
        }
        document.addEventListener(
            "click",
            (event) => {
                const control = event
                    .composedPath()
                    .find((element) =>
                        element.matches?.(
                            "button, a[href], input, select, textarea, [role='button']",
                        ),
                    );
                if (isBroadcast(control)) actions.priority();
            },
            { capture: true, signal: scoped },
        );
        if (step.preventNavigation) {
            for (const type of ["click", "auxclick"])
                document.addEventListener(
                    type,
                    (event) => {
                        const link = event
                            .composedPath()
                            .find((node) =>
                                node.matches?.("a[href], area[href]"),
                            );
                        if (
                            !link ||
                            isBroadcast(link, event) ||
                            panel.contains(link) ||
                            menu.element.contains(link)
                        )
                            return;
                        event.preventDefault();
                        event.stopImmediatePropagation();
                    },
                    { capture: true, signal: scoped },
                );
        }
        const blocking = Boolean(
            !waiting &&
            (step.interaction === "none" ||
                (target && step.interaction === "target")),
        );
        root.dataset.blocking = String(blocking);
        if (step.interaction === "none") spotlight.style.pointerEvents = "auto";
        if (step.interaction === "none" || step.suppressHover) {
            for (const type of [
                "mouseover",
                "mouseenter",
                "pointerover",
                "pointerenter",
                "mousemove",
                "pointermove",
            ])
                document.addEventListener(
                    type,
                    (event) => {
                        if (!containsControls(event.target))
                            event.stopImmediatePropagation();
                    },
                    { capture: true, signal: scoped },
                );
        }
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
                    actions.modal();
                    return;
                }
                if (isBroadcast(event.target, event) && event.key !== "Tab")
                    return;
                if (event.key === "Escape") {
                    event.preventDefault();
                    event.stopImmediatePropagation();
                    if (!firstTime) actions.cancel();
                    return;
                }
                if (!blocking) return;
                if (
                    step.interaction === "none" &&
                    !["Tab", "Enter", " "].includes(event.key)
                ) {
                    event.stopImmediatePropagation();
                    if (event.ctrlKey || event.metaKey || event.altKey)
                        event.preventDefault();
                    return;
                }
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
            resize.observe(menu.element);
            if (target) resize.observe(target);
        }
        scoped.addEventListener("abort", dispose, { once: true });
        update();
        if (!waiting || missing) focusPanel();
        return { dispose };
    };
}
