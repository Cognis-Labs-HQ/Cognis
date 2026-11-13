/**
 * Owns responsive toolbar visibility, accessibility, sizing, and cleanup.
 * Public export: mountComposerToolbarDrawer creates a page-scoped drawer.
 * @example
 * const drawer = mountComposerToolbarDrawer({ root, i18n, signal });
 * drawer?.closeMobileDrawerIfNeeded();
 * @param {object} options - Composer root, translations, and lifecycle options.
 * @returns {{closeMobileDrawerIfNeeded(): void, destroy(): void}|null} Drawer lifecycle.
 */
import { beginDrawerSession } from "../drawer-session.js";
import { renderToolbarToggleIcon } from "./toolbar-icons.js";

const mountedToolbars = new WeakMap();

export function mountComposerToolbarDrawer({
    root,
    i18n,
    toolbarScrollable = false,
    breakpoint = 900,
    signal,
    log,
}) {
    const toolbar = root.querySelector(".toolbar");
    const mainWindow = root.querySelector(".main-window");
    if (!toolbar || !mainWindow || signal?.aborted) return null;
    mountedToolbars.get(toolbar)?.destroy();

    const document = root.ownerDocument;
    const window = document.defaultView;
    const lifetime = new window.AbortController();
    const mobileMedia = window.matchMedia(`(max-width: ${breakpoint}px)`);
    const originalAttributes = new Map(
        ["id", "aria-hidden", "aria-label", "tabindex"].map((name) => [
            name,
            toolbar.getAttribute(name),
        ]),
    );
    const originalInert = toolbar.inert;
    const originalScrollable = toolbar.classList.contains(
        "toolbar--scrollable",
    );
    const originalStyles = new Map(
        ["--toolbar-sticky-top", "--toolbar-max-height"].map((name) => [
            name,
            [
                toolbar.style.getPropertyValue(name),
                toolbar.style.getPropertyPriority(name),
            ],
        ]),
    );
    const toggle = document.createElement("button");
    toggle.type = "button";
    toggle.className = "toolbar-mobile-toggle btn-neutral";
    const backdrop = document.createElement("div");
    backdrop.className = "toolbar-mobile-backdrop";
    backdrop.setAttribute("aria-hidden", "true");
    if (!toolbar.id)
        toolbar.id = `composer-toolbar-${window.crypto.randomUUID()}`;
    if (
        !toolbar.hasAttribute("aria-label") &&
        !toolbar.hasAttribute("aria-labelledby")
    ) {
        toolbar.setAttribute("aria-label", i18n.t("ui.layout.toolbar.expand"));
    }
    toggle.setAttribute("aria-controls", toolbar.id);
    toolbar.tabIndex = toolbarScrollable ? 0 : -1;
    toolbar.after(toggle);
    mainWindow.append(backdrop);

    let open = false;
    let destroyed = false;
    let session = null;
    let layoutObserver = null;

    function setOpen(nextOpen, { restoreFocus = true } = {}) {
        if (destroyed) return;
        const wasOpen = open;
        open = mobileMedia.matches && Boolean(nextOpen);
        toggle.hidden = !mobileMedia.matches;
        if (!open) {
            session?.({ restoreFocus });
            session = null;
            if (
                mobileMedia.matches &&
                toolbar.contains(document.activeElement)
            ) {
                if (restoreFocus) toggle.focus({ preventScroll: true });
                else document.activeElement.blur();
            }
        }
        toolbar.inert = originalInert || (mobileMedia.matches && !open);
        if (mobileMedia.matches && !open)
            toolbar.setAttribute("aria-hidden", "true");
        else if (originalAttributes.get("aria-hidden") === null)
            toolbar.removeAttribute("aria-hidden");
        else
            toolbar.setAttribute(
                "aria-hidden",
                originalAttributes.get("aria-hidden"),
            );
        toolbar.classList.toggle("toolbar--mobile-open", open);
        backdrop.classList.toggle("toolbar-mobile-backdrop--open", open);
        backdrop.hidden = !open;
        toggle.setAttribute("aria-expanded", String(open));
        toggle.classList.toggle("toolbar-mobile-toggle--drawer-open", open);
        toggle.innerHTML = renderToolbarToggleIcon(open);
        toggle.setAttribute(
            "aria-label",
            i18n.t(
                open
                    ? "ui.layout.toolbar.collapse"
                    : "ui.layout.toolbar.expand",
            ),
        );
        if (open && !wasOpen) {
            session = beginDrawerSession({
                panel: toolbar,
                trigger: toggle,
                backdrop,
                signal: lifetime.signal,
                onDismiss: () => setOpen(false),
            });
        }
        if (wasOpen !== open) {
            log?.("info", "Toolbar drawer visibility changed.", {
                component: "ui",
                operation: "setToolbarDrawerOpen",
                open,
            });
        }
    }

    function closeMobileDrawerIfNeeded() {
        if (mobileMedia.matches && open)
            setOpen(false, { restoreFocus: false });
    }

    function syncToolbarPosition() {
        if (destroyed || !toolbar.isConnected) return;
        if (mobileMedia.matches) {
            toolbar.style.setProperty("--toolbar-sticky-top", "0px");
            toolbar.style.setProperty("--toolbar-max-height", "100dvh");
            return;
        }
        const headerHeight =
            root.querySelector(".site-header")?.getBoundingClientRect()
                .height ?? 0;
        const footerHeight =
            root.querySelector(".global-footer")?.getBoundingClientRect()
                .height ?? 0;
        toolbar.style.setProperty("--toolbar-sticky-top", `${headerHeight}px`);
        toolbar.style.setProperty(
            "--toolbar-max-height",
            `calc(100dvh - ${headerHeight}px - ${footerHeight}px - var(--site-top-banner-height, 0px) - 24px)`,
        );
    }

    function onViewportChange() {
        const focusWasOnToggle = document.activeElement === toggle;
        setOpen(false, { restoreFocus: mobileMedia.matches });
        if (!mobileMedia.matches && focusWasOnToggle)
            toolbar.focus({ preventScroll: true });
        if (toolbarScrollable) syncToolbarPosition();
    }

    function destroy() {
        if (destroyed) return;
        destroyed = true;
        session?.({ restoreFocus: false });
        session = null;
        lifetime.abort();
        signal?.removeEventListener("abort", destroy);
        mobileMedia.removeEventListener("change", onViewportChange);
        layoutObserver?.disconnect();
        toggle.remove();
        backdrop.remove();
        toolbar.inert = originalInert;
        toolbar.classList.remove("toolbar--mobile-open");
        toolbar.classList.toggle("toolbar--scrollable", originalScrollable);
        for (const [name, value] of originalAttributes) {
            if (value === null) toolbar.removeAttribute(name);
            else toolbar.setAttribute(name, value);
        }
        for (const [name, [value, priority]] of originalStyles) {
            if (value) toolbar.style.setProperty(name, value, priority);
            else toolbar.style.removeProperty(name);
        }
        mountedToolbars.delete(toolbar);
    }

    toggle.addEventListener("click", () => setOpen(!open), {
        signal: lifetime.signal,
    });
    backdrop.addEventListener("click", () => setOpen(false), {
        signal: lifetime.signal,
    });
    toolbar.addEventListener(
        "click",
        (event) => {
            if (!event.defaultPrevented && event.target.closest?.("a[href]")) {
                closeMobileDrawerIfNeeded();
            }
        },
        { signal: lifetime.signal },
    );
    mobileMedia.addEventListener("change", onViewportChange);
    signal?.addEventListener("abort", destroy, { once: true });
    if (toolbarScrollable) {
        toolbar.classList.add("toolbar--scrollable");
        layoutObserver = new window.ResizeObserver(syncToolbarPosition);
        for (const element of [
            root.querySelector(".site-header"),
            root.querySelector(".global-footer"),
            document.documentElement,
        ]) {
            if (element) layoutObserver.observe(element);
        }
        syncToolbarPosition();
    }
    setOpen(false, { restoreFocus: false });
    const controller = { closeMobileDrawerIfNeeded, destroy };
    mountedToolbars.set(toolbar, controller);
    return controller;
}
