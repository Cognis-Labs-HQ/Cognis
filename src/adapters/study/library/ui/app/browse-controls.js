import { sortItems } from "/static/reuse/collection-view.js";
import { renderEntryCard } from "./cards.js";
import { layerForEntry } from "./presentation.js";
import { showToast } from "/static/reuse/toast.js";
import { loadFavourites } from "/static/gateways/study/reuse/favourites.js";
import { refreshLibraryFilterResults } from "./filters.js";

/** Binds Study's shared controls without changing provider grid ordering by default. */
export async function bindBrowseControls(root, entries, schemas, i18n, signal) {
    try {
        const favourites = await loadFavourites({ signal });
        if (signal?.aborted) return;
        const original = new WeakMap();
        const refresh = () => {
            favourites.refresh(root);
            root.querySelectorAll("[data-library-panel]").forEach((panel) => {
                const only =
                    panel
                        .querySelector("[data-study-favourites-only]")
                        ?.getAttribute("aria-pressed") === "true";
                const order =
                    panel.querySelector("[data-study-sort]")?.value ??
                    "default";
                const grid = panel.querySelector(".library-entry-grid");
                if (!grid) return;
                if (!original.has(grid)) original.set(grid, [...grid.children]);
                const nodes = original.get(grid);
                if (only) {
                    // Favourite children become independent cards; an unfavourited parent must not hide them.
                    const ids = new Set(
                        nodes.flatMap((node) =>
                            [
                                ...node.querySelectorAll(
                                    "[data-library-entry]",
                                ),
                            ].map((card) => card.dataset.libraryEntry),
                        ),
                    );
                    grid.innerHTML = sortItems(
                        entries.filter(
                            (entry) =>
                                ids.has(entry.id) &&
                                favourites.has("library", entry.id),
                        ),
                        order,
                    )
                        .map((entry) =>
                            renderEntryCard(
                                entry,
                                layerForEntry(schemas, entry),
                                entries,
                                schemas.find(({ id }) => id === entry.schemaId),
                                new Map(),
                                i18n,
                            ),
                        )
                        .join("");
                    favourites.refresh(grid);
                    refreshLibraryFilterResults(panel);
                    if (!grid.children.length)
                        panel.querySelector(".library-filter-empty").hidden =
                            false;
                    return;
                }
                if (
                    grid.firstElementChild !== nodes[0] ||
                    nodes.some((node) => node.parentElement !== grid)
                )
                    grid.replaceChildren(...nodes);
                if (order === "default")
                    nodes.forEach((node) => {
                        grid.append(node);
                        if (node.matches("[data-library-grid-blank]"))
                            node.hidden = false;
                    });
                else {
                    const ordered = sortItems(entries, order);
                    const positions = new Map(
                        ordered.map((entry, index) => [entry.id, index]),
                    );
                    const cards = nodes.filter((node) =>
                        node.querySelector("[data-library-entry]"),
                    );
                    cards
                        .sort(
                            (a, b) =>
                                (positions.get(
                                    a.querySelector("[data-library-entry]")
                                        .dataset.libraryEntry,
                                ) ?? 0) -
                                (positions.get(
                                    b.querySelector("[data-library-entry]")
                                        .dataset.libraryEntry,
                                ) ?? 0),
                        )
                        .forEach((node) => grid.append(node));
                    nodes
                        .filter((node) =>
                            node.matches("[data-library-grid-blank]"),
                        )
                        .forEach((node) => (node.hidden = true));
                }
                refreshLibraryFilterResults(panel);
            });
        };
        favourites.bind(root, { signal, i18n, onChange: refresh });
        root.addEventListener(
            "input",
            (event) => {
                if (event.target.matches("[data-study-query]"))
                    refreshLibraryFilterResults(
                        event.target.closest("[data-library-panel]"),
                    );
            },
            { signal },
        );
        root.addEventListener(
            "change",
            (event) => {
                if (event.target.matches("[data-study-sort]")) refresh();
            },
            { signal },
        );
        root.addEventListener(
            "click",
            (event) => {
                const button = event.target.closest(
                    "[data-study-favourites-only]",
                );
                if (!button) return;
                const enabled = button.getAttribute("aria-pressed") !== "true";
                button.setAttribute("aria-pressed", String(enabled));
                button.classList.toggle("is-favourite", enabled);
                button.textContent = enabled ? "★" : "☆";
                refresh();
            },
            { signal },
        );
        const observer = new MutationObserver((records) => {
            if (
                records.some((record) =>
                    [...record.addedNodes].some(
                        (node) =>
                            node.nodeType === 1 &&
                            (node.matches("[data-library-panel]") ||
                                node.querySelector("[data-library-panel]")),
                    ),
                )
            )
                refresh();
        });
        observer.observe(root, { childList: true, subtree: true });
        signal?.addEventListener("abort", () => observer.disconnect(), {
            once: true,
        });
        refresh();
    } catch {
        if (signal?.aborted) return;
        showToast(i18n.t("gateway.study.favourite_failed"), {
            variant: "error",
        });
    }
}
