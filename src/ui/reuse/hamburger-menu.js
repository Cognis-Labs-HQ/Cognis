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
 * @param {{ items: Array<{ id: string, label: string, variant?: 'default'|'danger' }> }} options
 * @returns {Promise<string|null>}
 */
let stylesheetReady = null;
let activeClose = null;

function ensureStylesheet() {
    if (stylesheetReady) return stylesheetReady;
    const existing = document.querySelector(
        'link[href="/static/styles/reuse/hamburger-menu.css"]',
    );
    if (existing) {
        stylesheetReady = existing.sheet
            ? Promise.resolve()
            : new Promise((resolve) => {
                  existing.addEventListener("load", resolve, { once: true });
                  existing.addEventListener("error", resolve, { once: true });
              });
        return stylesheetReady;
    }
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = "/static/styles/reuse/hamburger-menu.css";
    stylesheetReady = new Promise((resolve) => {
        link.addEventListener("load", resolve, { once: true });
        link.addEventListener("error", resolve, { once: true });
    });
    document.head.appendChild(link);
    return stylesheetReady;
}

function closeActiveMenu() {
    if (typeof activeClose === "function") {
        activeClose();
        activeClose = null;
    }
}

export async function openHamburgerMenu(button, { items }) {
    if (!(button instanceof HTMLButtonElement)) return null;
    await ensureStylesheet();
    closeActiveMenu();
    return new Promise((resolve) => {
        const menu = document.createElement("div");
        menu.className = "hamburger-menu";
        menu.setAttribute("role", "menu");
        const rect = button.getBoundingClientRect();
        menu.style.top = `${rect.bottom + window.scrollY + 4}px`;
        menu.style.left = `${rect.right + window.scrollX}px`;
        menu.style.transform = "translateX(-100%)";
        const menuItems = Array.isArray(items) ? items : [];
        menu.innerHTML = menuItems
            .map(
                (item) =>
                    `<button type="button" class="hamburger-menu-item ${item.variant === "danger" ? "hamburger-menu-item--danger" : ""}" data-action-id="${String(item.id)}" role="menuitem">${String(item.label)}</button>`,
            )
            .join("");
        document.body.appendChild(menu);

        let closed = false;
        function cleanup(actionId) {
            if (closed) return;
            closed = true;
            document.removeEventListener("click", onOutsideClick, true);
            document.removeEventListener("keydown", onKeyDown, true);
            menu.remove();
            if (activeClose === cleanup) activeClose = null;
            resolve(actionId ?? null);
        }

        function onOutsideClick(event) {
            if (event.target === button || button.contains(event.target))
                return;
            if (!menu.contains(event.target)) {
                cleanup(null);
            }
        }

        function onKeyDown(event) {
            if (event.key === "Escape") {
                cleanup(null);
            }
        }

        menu.querySelectorAll(".hamburger-menu-item").forEach((itemButton) => {
            itemButton.addEventListener("click", () => {
                const actionId = itemButton.getAttribute("data-action-id");
                cleanup(actionId);
            });
        });

        document.addEventListener("click", onOutsideClick, true);
        document.addEventListener("keydown", onKeyDown, true);
        activeClose = cleanup;
    });
}
