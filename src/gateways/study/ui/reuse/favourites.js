/**
 * Shared Study favourites and browse sorting for Library cards and flashcard decks.
 * Exports: loadFavourites() creates an account-scoped favourite controller;
 * renderFavourite(kind, id, i18n) renders a toggle; renderBrowseControls(i18n) renders sort/filter controls;
 * Example: const favourites = await loadFavourites(); favourites.bind(root, {signal, onChange: render});
 * @param {object[]} items Visible items with id, label/name and optional createdAt.
 * @returns {object[]} Sorted visible items.
 */
import { apiFetch } from "/static/reuse/api-client.js";
import { escapeHtml } from "/static/reuse/escape-html.js";
import { showToast } from "/static/reuse/toast.js";

let active = new Set();
const key = (kind, id) => `${kind}:${id}`;

/** @param {string} kind Resource kind. @param {string} id Resource identity. @param {object} i18n Labels. @returns {string} Toggle markup. */
export function renderFavourite(kind, id, i18n) {
    const selected = active.has(key(kind, id));
    return `<button type="button" class="btn-neutral study-favourite${selected ? " is-favourite" : ""}" data-study-favourite="${escapeHtml(id)}" data-study-favourite-kind="${kind}" aria-pressed="${selected}" aria-label="${escapeHtml(i18n.t("ui.reuse.favourite"))}">${selected ? "★" : "☆"}</button>`;
}
/** @param {object} i18n Labels. @returns {string} Sort and favourite-filter controls. */

export function renderBrowseControls(i18n, { query = "" } = {}) {
    return `<span class="study-browse-controls"><input type="search" class="study-browse-search" data-study-query value="${escapeHtml(query)}" aria-label="${escapeHtml(i18n.t("ui.reuse.search"))}" placeholder="${escapeHtml(i18n.t("ui.reuse.search"))}"><label class="study-sort-control" title="${escapeHtml(i18n.t("ui.reuse.sort"))}"><span aria-hidden="true">⇅</span><select class="theme-select" data-study-sort aria-label="${escapeHtml(i18n.t("ui.reuse.sort"))}">${["default", "az", "za", "newest", "oldest"].map((order) => `<option value="${order}">${escapeHtml(i18n.t("ui.reuse.sort_" + order))}</option>`).join("")}</select></label><button class="btn-neutral study-favourite" type="button" data-study-favourites-only aria-pressed="false" aria-label="${escapeHtml(i18n.t("ui.reuse.favourites_only"))}">☆</button></span>`;
}
/** @returns {Promise<object>} Controller with has, bind and refresh methods. */

export async function loadFavourites({ signal } = {}) {
    const response = await apiFetch("/api/v1/study/favourites", { signal });
    if (!response.ok) throw new Error("favourites_failed");
    active = new Set(
        (await response.json()).data.map((item) => key(item.kind, item.id)),
    );
    const refresh = (root) =>
        root.querySelectorAll("[data-study-favourite]").forEach((button) => {
            const selected = active.has(
                key(
                    button.dataset.studyFavouriteKind,
                    button.dataset.studyFavourite,
                ),
            );
            button.classList.toggle("is-favourite", selected);
            button.setAttribute("aria-pressed", String(selected));
            button.textContent = selected ? "★" : "☆";
        });
    return {
        has: (kind, id) => active.has(key(kind, id)),
        refresh,
        bind(root, { signal, i18n, onChange = () => {} } = {}) {
            refresh(root);
            root.addEventListener(
                "click",
                async (event) => {
                    const button = event.target.closest(
                        "[data-study-favourite]",
                    );
                    if (!button) return;
                    event.stopPropagation();
                    button.disabled = true;
                    try {
                        const kind = button.dataset.studyFavouriteKind;
                        const id = button.dataset.studyFavourite;
                        const selected = !active.has(key(kind, id));
                        const response = await apiFetch(
                            "/api/v1/study/favourites",
                            {
                                method: "PUT",
                                headers: { "content-type": "application/json" },
                                body: JSON.stringify({
                                    kind,
                                    id,
                                    favourite: selected,
                                }),
                            },
                        );
                        if (!response.ok) throw new Error("favourites_failed");
                        active = new Set(
                            (await response.json()).data.map((item) =>
                                key(item.kind, item.id),
                            ),
                        );
                        refresh(root);
                        showToast(
                            i18n.t(
                                selected
                                    ? "gateway.study.favourite_added"
                                    : "gateway.study.favourite_removed",
                            ),
                            { variant: "success" },
                        );
                        onChange();
                    } catch {
                        showToast(i18n.t("gateway.study.favourite_failed"), {
                            variant: "error",
                        });
                    } finally {
                        button.disabled = false;
                    }
                },
                { signal },
            );
        },
    };
}
