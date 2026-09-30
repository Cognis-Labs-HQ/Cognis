export function bindTransformationInteractions(root, { signal }) {
    root.addEventListener(
        "click",
        (event) => {
            const transform = event.target.closest(
                "[data-library-transform-index]",
            );
            if (transform) {
                const tree = transform.closest("[data-library-transform-tree]");
                tree.querySelector("output").value =
                    transform.querySelector("strong").textContent;
                tree.querySelectorAll("[data-library-transform-index]").forEach(
                    (candidate) =>
                        candidate.classList.toggle(
                            "active",
                            candidate === transform,
                        ),
                );
                return;
            }
            const control = event.target.closest(
                ".library-transform-card [data-library-entry]",
            );
            if (!control) return;
            const tree = control
                .closest(".library-transform-card")
                .querySelector(".library-transform-pathway");
            tree.hidden = !tree.hidden;
        },
        { capture: true, signal },
    );
}
