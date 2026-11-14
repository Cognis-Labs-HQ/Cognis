import { beginDrawerSession } from "../reuse/drawer-session.js";

const bindings = new WeakMap();

/** @param {HTMLElement} root Shell root. @param {object} options Owner lifetime and shell capabilities. @returns {Function | undefined} Cleanup for this binding. */
export function bindCompactNavigation(
    root,
    { signal, prepareNavigation, log, registerSurface } = {},
) {
    signal?.throwIfAborted();
    const navrow = root.querySelector(".global-navrow");
    const topnav = navrow?.querySelector(".topnav");
    const trigger = navrow?.querySelector("#nav-compact-toggle");
    const panel = root.querySelector("#nav-drawer");
    const closeButton = root.querySelector("#nav-drawer-close");
    const navigation = panel?.querySelector(".nav-drawer-nav");
    const backdrop = root.querySelector("#nav-drawer-backdrop");
    if (!navrow || !topnav || !trigger || !panel || !backdrop) return;
    bindings.get(navrow)?.();

    const controller = new AbortController();
    const scoped = signal
        ? AbortSignal.any([signal, controller.signal])
        : controller.signal;
    const document = panel.ownerDocument;
    const window = document.defaultView;
    let session;
    let opening;

    function close({ restoreFocus = true } = {}) {
        const wasOpen = Boolean(session);
        session?.({ restoreFocus });
        session = undefined;
        opening?.abort();
        panel.classList.remove("nav-drawer--open");
        panel.setAttribute("aria-hidden", "true");
        panel.inert = true;
        trigger.setAttribute("aria-expanded", "false");
        backdrop.hidden = true;
        if (wasOpen)
            log?.("info", "navigation_drawer_closed", {
                component: "ui",
                operation: "closeNavigationDrawer",
            });
    }

    function syncCompactState() {
        const compact = topnav.scrollWidth > topnav.clientWidth + 2;
        navrow.classList.toggle("global-navrow--compact", compact);
        trigger.hidden = !compact;
        if (!compact) close({ restoreFocus: false });
        topnav.inert = compact;
    }

    function redrawNavigation() {
        const focusedHref = navigation?.contains(document.activeElement)
            ? document.activeElement.getAttribute("href")
            : null;
        prepareNavigation?.(topnav);
        if (navigation) navigation.innerHTML = topnav.innerHTML;
        syncCompactState();
        if (session && focusedHref) {
            const matchingLink = [...navigation.querySelectorAll("a")].find(
                (link) => link.getAttribute("href") === focusedHref,
            );
            (matchingLink ?? closeButton)?.focus({ preventScroll: true });
        }
    }

    function open() {
        if (session) return;
        redrawNavigation();
        if (trigger.hidden) return;
        panel.inert = false;
        panel.classList.add("nav-drawer--open");
        panel.setAttribute("aria-hidden", "false");
        trigger.setAttribute("aria-expanded", "true");
        backdrop.hidden = false;
        opening = new AbortController();
        session = beginDrawerSession({
            panel,
            trigger,
            backdrop,
            signal: scoped,
            onDismiss: close,
        });
        registerSurface?.(panel, close, opening.signal);
        log?.("info", "navigation_drawer_opened", {
            component: "ui",
            operation: "openNavigationDrawer",
        });
    }

    trigger.addEventListener("click", () => (session ? close() : open()), {
        signal: scoped,
    });
    closeButton?.addEventListener("click", () => close(), { signal: scoped });
    backdrop.addEventListener("click", () => close(), { signal: scoped });
    navigation?.addEventListener(
        "click",
        (event) => {
            const link = event.target.closest("a[href]");
            if (link && link.getAttribute("aria-disabled") !== "true")
                close({ restoreFocus: false });
        },
        { signal: scoped },
    );

    const resizeObserver = new window.ResizeObserver(syncCompactState);
    resizeObserver.observe(topnav);
    resizeObserver.observe(navrow);
    const navigationObserver = new window.MutationObserver(redrawNavigation);
    navigationObserver.observe(topnav, {
        childList: true,
        subtree: true,
        characterData: true,
        attributes: true,
        attributeFilter: ["hidden", "href", "aria-disabled"],
    });
    const removalObserver = !signal
        ? new window.MutationObserver(() => {
              if (!navrow.isConnected) controller.abort();
          })
        : null;
    removalObserver?.observe(document.body, {
        childList: true,
        subtree: true,
    });
    scoped.addEventListener(
        "abort",
        () => {
            close({ restoreFocus: false });
            resizeObserver.disconnect();
            navigationObserver.disconnect();
            removalObserver?.disconnect();
            topnav.inert = false;
            bindings.delete(navrow);
        },
        { once: true },
    );
    const destroy = () => controller.abort();
    bindings.set(navrow, destroy);
    close({ restoreFocus: false });
    redrawNavigation();
    return destroy;
}
