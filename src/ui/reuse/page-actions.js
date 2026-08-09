/**
 * CTX-backed registry for action buttons owned by the active page.
 *
 * Public exports:
 *   pageActions — adds, updates, removes, and mounts page action buttons.
 *
 * Usage:
 *   const removeAction = pageActions.add({
 *     id: "example:refresh",
 *     element: refreshButton,
 *     order: 20,
 *   });
 *   pageActions.update("example:refresh", { order: 10 });
 *   removeAction();
 *
 * @param {{ id: string, element: HTMLElement, order?: number }} action - Action descriptor.
 * @returns {() => boolean} Function that removes the registered action.
 */

import { uiCtx } from "./ui-ctx.js";

const actions = new Map();
let activeDock = null;

function renderActions() {
    if (!(activeDock instanceof HTMLElement)) return;
    const orderedActions = [...actions.values()].sort(
        (left, right) =>
            left.order - right.order || left.id.localeCompare(right.id),
    );
    activeDock
        .querySelectorAll("[data-page-action-id]")
        .forEach((element) => element.remove());
    activeDock.append(...orderedActions.map(({ element }) => element));
}

function normalizeAction(action) {
    const id = String(action?.id ?? "").trim();
    if (!id) throw new TypeError("Page actions require a non-empty id.");
    if (!(action?.element instanceof HTMLElement)) {
        throw new TypeError("Page actions require an HTMLElement.");
    }
    action.element.classList.add("page-action-button");
    action.element.dataset.pageActionId = id;
    return {
        id,
        element: action.element,
        order: Number.isFinite(Number(action.order))
            ? Number(action.order)
            : 100,
    };
}

export const pageActions = Object.freeze({
    add(action) {
        const normalizedAction = normalizeAction(action);
        actions.set(normalizedAction.id, normalizedAction);
        renderActions();
        return () => pageActions.remove(normalizedAction.id);
    },

    update(id, changes = {}) {
        const normalizedId = String(id ?? "").trim();
        const currentAction = actions.get(normalizedId);
        if (!currentAction) return false;
        actions.set(
            normalizedId,
            normalizeAction({
                ...currentAction,
                ...changes,
                id: normalizedId,
            }),
        );
        renderActions();
        return true;
    },

    remove(id) {
        const removed = actions.delete(String(id ?? "").trim());
        if (removed) renderActions();
        return removed;
    },

    mount(root, { signal } = {}) {
        activeDock = root?.querySelector?.("[data-page-action-dock]") ?? null;
        renderActions();
        signal?.addEventListener(
            "abort",
            () => {
                actions.clear();
                renderActions();
                activeDock = null;
            },
            { once: true },
        );
    },
});

uiCtx.capabilities.contribute("page:actions", pageActions);
