export function bindTransformationInteractions(root, { signal }) {
    root.addEventListener(
        "click",
        (event) => {
            const transform = event.target.closest(
                "[data-library-transform-value]",
            );
            if (transform) {
                const card = transform.closest(".library-transform-card");
                card.querySelector("output").value =
                    transform.dataset.libraryTransformValue;
                card.querySelectorAll("[data-library-transform-value]").forEach(
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
                .querySelector("[data-library-transform-tree]");
            tree.hidden = !tree.hidden;
        },
        { capture: true, signal },
    );
}
