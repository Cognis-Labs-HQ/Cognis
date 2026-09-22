/**
 * Builds grouped, collapsible side menus from structured navigation data.
 *
 * Public exports:
 *   createSideMenu(options) — creates a renderable and mountable side menu.
 *   sideMenu — ctx capability exposing the side-menu factory.
 *
 * Usage:
 *   const { createSideMenu } = uiCtx.capabilities.get('ui:sideMenu');
 *   const menu = createSideMenu({
 *     groups: [{ id: 'legal', label: 'Legal', items: [{ id: 'terms', label: 'Terms', targetId: 'terms-heading' }] }],
 *     storageKeyPrefix: 'legal-menu',
 *   });
 *   container.innerHTML = menu.render();
 *   menu.mount(container);
 *
 * @param {{ groups: Array<{id: string, label: string, items: Array<{id: string, label: string, targetId?: string}>}>, storageKeyPrefix: string, onSelect?: (id: string) => void, activeId?: string, scrollBehavior?: ScrollBehavior }} options
 * @returns {{ render: () => string, mount: (root: HTMLElement, options?: {signal?: AbortSignal}) => void, setActive: (id: string, root?: HTMLElement) => void }}
 */

import { escapeHtml } from "./escape-html.js";
import { uiCtx } from "./ui-ctx.js";

export function createSideMenu({
    groups,
    storageKeyPrefix,
    onSelect,
    activeId = "",
    scrollBehavior = "smooth",
}) {
    if (!Array.isArray(groups) || !String(storageKeyPrefix ?? "").trim()) {
        throw new Error("Side menus require groups and a storage key prefix.");
    }
    let mountedRoot = null;
    let selectedId = String(activeId ?? "");

    function setActive(id, root = mountedRoot) {
        selectedId = String(id ?? "");
        root?.querySelectorAll("[data-side-menu-item]").forEach((button) => {
            const isActive = button.dataset.sideMenuItem === selectedId;
            button.classList.toggle("active", isActive);
            if (isActive) button.setAttribute("aria-current", "page");
            else button.removeAttribute("aria-current");
        });
    }

    function render() {
        return `<nav class="side-menu">${groups
            .map((group) => {
                const groupId = String(group?.id ?? "").trim();
                const storageKey = `${storageKeyPrefix}:${groupId}`;
                const isOpen = localStorage.getItem(storageKey) !== "false";
                const items = Array.isArray(group?.items) ? group.items : [];
                return `<details class="side-menu-group"${isOpen ? " open" : ""} data-side-menu-group="${escapeHtml(groupId)}"><summary>${escapeHtml(String(group?.label ?? ""))}</summary><ul>${items
                    .map((item) => {
                        const itemId = String(item?.id ?? "");
                        const targetId = String(item?.targetId ?? "").trim();
                        const isActive = itemId === selectedId;
                        return `<li><button class="side-menu-link${isActive ? " active" : ""}" data-side-menu-item="${escapeHtml(itemId)}"${targetId ? ` data-side-menu-target="${escapeHtml(targetId)}"` : ""}${isActive ? ' aria-current="page"' : ""}>${escapeHtml(String(item?.label ?? ""))}</button></li>`;
                    })
                    .join("")}</ul></details>`;
            })
            .join("")}</nav>`;
    }

    function mount(root, { signal } = {}) {
        mountedRoot = root;
        root.querySelectorAll("[data-side-menu-item]").forEach((button) => {
            button.addEventListener(
                "click",
                () => {
                    const targetId = button.dataset.sideMenuTarget;
                    if (targetId) {
                        root.ownerDocument
                            ?.getElementById(targetId)
                            ?.scrollIntoView({
                                behavior: scrollBehavior,
                                block: "start",
                            });
                    }
                    setActive(button.dataset.sideMenuItem, root);
                    onSelect?.(button.dataset.sideMenuItem);
                },
                { signal },
            );
        });
        root.querySelectorAll("[data-side-menu-group]").forEach((details) => {
            details.addEventListener(
                "toggle",
                () => {
                    const storageKey = `${storageKeyPrefix}:${details.dataset.sideMenuGroup}`;
                    localStorage.setItem(
                        storageKey,
                        details.open ? "true" : "false",
                    );
                },
                { signal },
            );
        });
        setActive(selectedId, root);
    }

    return { render, mount, setActive };
}

export const sideMenu = Object.freeze({ createSideMenu });
uiCtx.capabilities.contribute("ui:sideMenu", sideMenu);
