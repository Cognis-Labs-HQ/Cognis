export function highlightTransformationPath(tree, selected) {
    tree.querySelectorAll("[data-library-transform-node]").forEach((node) =>
        node.classList.remove("library-transform-path-active"),
    );
    let node = selected.closest("[data-library-transform-node]");
    while (node) {
        node.classList.add("library-transform-path-active");
        const parentIndex = node.dataset.libraryTransformParent;
        node =
            parentIndex === "0"
                ? null
                : tree.querySelector(
                      `[data-library-transform-node="${CSS.escape(parentIndex)}"]`,
                  );
    }
}

function closeTransformationTree(card) {
    const grid = card.closest(".library-entry-grid--transform-tree");
    card.classList.remove("library-transform-card--open");
    card.querySelector(".library-transform-pathway").hidden = true;
    grid?.classList.remove("library-transform-tree-open");
    grid?.querySelectorAll(".library-transform-card").forEach((candidate) => {
        candidate.hidden = false;
        candidate.classList.remove("library-transform-card--leaving");
    });
}

export function bindTransformationInteractions(root, { signal }) {
    root.addEventListener(
        "click",
        (event) => {
            const transform = event.target.closest(
                "[data-library-transform-index]",
            );
            if (transform) {
                const tree = transform.closest("[data-library-transform-tree]");
                const output = tree.querySelector("output");
                if (output)
                    output.value =
                        transform.querySelector("strong").textContent;
                const pronunciation = tree.querySelector(
                    "[data-library-transform-pronunciation]",
                );
                if (pronunciation)
                    pronunciation.textContent =
                        transform.dataset.libraryTransformPronunciationValue;
                const definition = tree.querySelector(
                    "[data-library-transform-definition]",
                );
                if (definition)
                    definition.textContent =
                        transform.dataset.libraryTransformDefinitionValue;
                tree.querySelectorAll("[data-library-transform-index]").forEach(
                    (candidate) =>
                        candidate.classList.toggle(
                            "active",
                            candidate === transform,
                        ),
                );
                highlightTransformationPath(tree, transform);
                return;
            }
            const close = event.target.closest(
                "[data-library-transform-close]",
            );
            if (close) {
                closeTransformationTree(
                    close.closest(".library-transform-card"),
                );
                return;
            }
            const control = event.target.closest(
                ".library-transform-card--expandable [data-library-entry]",
            );
            if (!control) return;
            const card = control.closest(".library-transform-card");
            if (card.classList.contains("library-transform-card--open")) return;
            const tree = card.querySelector(".library-transform-pathway");
            const grid = card.closest(".library-entry-grid--transform-tree");
            grid.querySelectorAll(".library-transform-card--open").forEach(
                (openCard) => {
                    if (openCard !== card) closeTransformationTree(openCard);
                },
            );
            card.classList.add("library-transform-card--open");
            grid.classList.add("library-transform-tree-open");
            tree.hidden = false;
            grid.querySelectorAll(".library-transform-card").forEach(
                (candidate) => {
                    if (candidate === card) return;
                    candidate.classList.add("library-transform-card--leaving");
                    if (
                        window.matchMedia("(prefers-reduced-motion: reduce)")
                            .matches
                    ) {
                        candidate.hidden = true;
                        candidate.classList.remove(
                            "library-transform-card--leaving",
                        );
                        return;
                    }
                    candidate.addEventListener(
                        "animationend",
                        () => {
                            candidate.hidden = true;
                            candidate.classList.remove(
                                "library-transform-card--leaving",
                            );
                        },
                        { once: true },
                    );
                },
            );
            card.scrollIntoView({ behavior: "smooth", block: "start" });
        },
        { capture: true, signal },
    );
}
