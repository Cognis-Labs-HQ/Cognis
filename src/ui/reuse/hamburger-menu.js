/**
 * Reusable hamburger action menu.
 *
 * Public exports:
 *   openHamburgerMenu(button, options) — opens an anchored action menu and resolves with selected action id (or null when dismissed).
 *
 * Usage:
 *   const action = await openHamburgerMenu(button, {
 *     items: [
 *       { id: 'edit', label: 'Edit' },
 *       { id: 'delete', label: 'Delete', variant: 'danger' },
 *     ],
 *   });
 *
 * @param {HTMLButtonElement} button
 * @param {{ items: Array<{ id: string, label: string, variant?: 'default'|'danger', disabled?: boolean, title?: string }>, signal?: AbortSignal }} options
 * @returns {Promise<string|null>}
 */
import { uiCtx } from "./ui-ctx.js";
import { ensurePageStylesheet } from "./page-styles.js";
import { transientSurfaces } from "./transient-surfaces.js";

const ownershipKey = "ui:actionMenuOwnership";
if (!uiCtx.capabilities.get(ownershipKey))
    uiCtx.capabilities.contribute(ownershipKey, { current: null });
const ownership = uiCtx.capabilities.get(ownershipKey);

export function openHamburgerMenu(button, { items, signal } = {}) {
    const document = button?.ownerDocument;
    const window = document?.defaultView;
    if (
        !window ||
        !(button instanceof window.HTMLButtonElement) ||
        !button.isConnected ||
        button.disabled ||
        signal?.aborted
    )
        return Promise.resolve(null);
    ownership.current?.close();
    const menuItems = Array.isArray(items) ? items : [];
    if (!menuItems.some((item) => !item.disabled)) return Promise.resolve(null);
    const popup = button.closest(".popup-overlay[data-popup-active]");
    const controller = new AbortController();
    const menu = document.createElement("div");
    menu.className = "hamburger-menu";
    menu.setAttribute("role", "menu");
    menu.hidden = true;
    let settled = false;
    let presented = false;
    let lease;
    let resolve;
    let reject;
    const result = new Promise((resolveResult, rejectResult) => {
        resolve = resolveResult;
        reject = rejectResult;
    });
    const entry = { close: () => close(null) };
    ownership.current = entry;
    const previousExpanded = button.getAttribute("aria-expanded");
    const previousHasPopup = button.getAttribute("aria-haspopup");
    button.setAttribute("aria-haspopup", "menu");
    button.setAttribute("aria-expanded", "false");

    function ownsPopupFocus() {
        return (
            popup &&
            [
                ...document.querySelectorAll(
                    ".popup-overlay[data-popup-active]",
                ),
            ].at(-1) === popup
        );
    }

    function current() {
        return (
            !settled &&
            ownership.current === entry &&
            button.isConnected &&
            !button.disabled &&
            !signal?.aborted &&
            (!popup || ownsPopupFocus())
        );
    }

    function log(level, message, error) {
        uiCtx.capabilities.get("ui:log")?.(level, message, {
            component: "ui",
            operation: "hamburgerMenu",
            errorName: error?.name,
        });
    }

    function close(action = null, restore = false) {
        if (settled) return;
        const focused = document.activeElement;
        const mayRestore =
            restore &&
            current() &&
            !menu.hidden &&
            (menu.contains(document.activeElement) ||
                document.activeElement === button);
        settled = true;
        observer.disconnect();
        signal?.removeEventListener("abort", entry.close);
        document.removeEventListener("click", onOutsideClick, true);
        document.removeEventListener("focusin", onFocus, true);
        window.removeEventListener("keydown", onKeyDown, true);
        if (ownership.current === entry) ownership.current = null;
        for (const [name, value] of [
            ["aria-expanded", previousExpanded],
            ["aria-haspopup", previousHasPopup],
        ]) {
            if (value === null) button.removeAttribute(name);
            else button.setAttribute(name, value);
        }
        controller.abort();
        menu.remove();
        if (lease)
            void lease
                .dispose()
                .catch((error) =>
                    log("error", "Action menu cleanup failed.", error),
                );
        if (ownership.current === null) {
            if (mayRestore) button.focus({ preventScroll: true });
            else if (
                popup?.contains(focused) &&
                focused.isConnected &&
                ownsPopupFocus()
            )
                focused.focus({ preventScroll: true });
        }
        resolve(action);
    }

    function onOutsideClick(event) {
        if (!menu.contains(event.target) && !button.contains(event.target))
            close();
    }

    function onFocus(event) {
        if (!menu.contains(event.target) && !button.contains(event.target))
            close();
    }

    function enabledItems() {
        return [...menu.querySelectorAll("button:not(:disabled)")];
    }

    function onKeyDown(event) {
        if (!current() || menu.hidden || !presented) return;
        if (event.key === "Escape") {
            event.preventDefault();
            event.stopImmediatePropagation();
            close(null, true);
            return;
        }
        if (!menu.contains(event.target) && event.target !== button) return;
        if (event.key === "Tab") {
            // Return to the invoker before the browser performs normal Tab traversal.
            close(null, true);
            return;
        }
        const buttons = enabledItems();
        const index = buttons.indexOf(document.activeElement);
        const next = {
            ArrowDown: (index + 1) % buttons.length,
            ArrowUp: (index - 1 + buttons.length) % buttons.length,
            Home: 0,
            End: buttons.length - 1,
        }[event.key];
        if (next !== undefined) {
            event.preventDefault();
            event.stopImmediatePropagation();
            buttons[next]?.focus();
        }
    }

    const observer = new window.MutationObserver(() => {
        if (!current() || (presented && (!menu.isConnected || menu.hidden)))
            close();
    });
    observer.observe(document.documentElement, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ["hidden", "disabled", "data-popup-active"],
    });
    signal?.addEventListener("abort", entry.close, { once: true });
    transientSurfaces.register(menu, entry.close, controller.signal);
    document.addEventListener("click", onOutsideClick, true);
    document.addEventListener("focusin", onFocus, true);
    window.addEventListener("keydown", onKeyDown, true);

    async function prepare() {
        const queue = uiCtx.capabilities.get("ui:floatingMenus");
        if (!queue) throw new Error("floating_menu_queue_unavailable");
        const stylesReady = ensurePageStylesheet(
            "/static/styles/reuse/hamburger-menu.css",
            { signal: controller.signal },
        );
        lease = await queue.request({
            signal: controller.signal,
            priority: 50,
        });
        if (!current()) {
            await lease.dispose();
            return;
        }
        await stylesReady;
        if (!current()) return;
        await lease.ready;
        if (!current()) return;
        const rect = button.getBoundingClientRect();
        const parentRect =
            button.parentElement?.getBoundingClientRect() ?? null;
        const viewportPadding = 14;
        const isMobile = window.matchMedia("(max-width: 640px)").matches;
        const maxMobileWidth = parentRect
            ? Math.max(
                  0,
                  Math.floor(
                      Math.min(
                          parentRect.width,
                          window.innerWidth - viewportPadding * 2,
                      ),
                  ),
              )
            : 0;
        if (isMobile && maxMobileWidth > 0) {
            menu.style.minWidth = "0";
            menu.style.width = `${maxMobileWidth}px`;
            menu.style.maxWidth = `${maxMobileWidth}px`;
        }
        menu.style.top = `${rect.bottom + window.scrollY + 4}px`;
        const parentLeft = parentRect
            ? parentRect.left + window.scrollX
            : viewportPadding + window.scrollX;
        const parentRight = parentRect
            ? parentRect.right + window.scrollX
            : rect.right + window.scrollX;
        const rightEdge = Math.min(
            rect.right + window.scrollX,
            parentRight,
            window.scrollX + window.innerWidth - viewportPadding,
        );
        if (isMobile && maxMobileWidth > 0) {
            menu.style.left = `${Math.max(parentLeft, rightEdge - maxMobileWidth)}px`;
            menu.style.transform = "none";
        } else {
            menu.style.left = `${rightEdge}px`;
            menu.style.transform = "translateX(-100%)";
        }
        menu.innerHTML = menuItems
            .map(
                (item) =>
                    `<button type="button" tabindex="-1" class="hamburger-menu-item ${item.variant === "danger" ? "hamburger-menu-item--danger" : ""}" data-action-id="${String(item.id)}" role="menuitem"${item.disabled ? " disabled" : ""}${item.title ? ` title="${String(item.title)}"` : ""}>${String(item.label)}</button>`,
            )
            .join("");
        menu.querySelectorAll(".hamburger-menu-item").forEach((itemButton) => {
            itemButton.addEventListener("click", () => {
                if (!current() || menu.hidden || !menu.isConnected) {
                    close();
                    return;
                }
                if (itemButton.disabled) return;
                close(itemButton.getAttribute("data-action-id"), true);
            });
        });
        document.body.append(menu);
        if (!(await lease.present(menu)) || !current() || menu.hidden) {
            close();
            return;
        }
        if (popup) {
            const focusOwner = uiCtx.capabilities.get("ui:popupFocus");
            if (!focusOwner) throw new Error("popup_focus_owner_unavailable");
            focusOwner.delegate(popup, {
                signal: controller.signal,
                surfaces: [menu],
                contains: (element) =>
                    popup.contains(element) || menu.contains(element),
                focus: () => enabledItems()[0]?.focus({ preventScroll: true }),
                onRevoke: entry.close,
            });
        }
        presented = true;
        button.setAttribute("aria-expanded", "true");
        enabledItems()[0]?.focus({ preventScroll: true });
        log("info", "Action menu opened.");
    }
    void prepare().catch((error) => {
        if (settled) return;
        log("error", "Action menu opening failed.", error);
        reject(error);
        close();
    });
    return result;
}
