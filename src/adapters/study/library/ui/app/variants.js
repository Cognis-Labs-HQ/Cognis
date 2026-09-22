const LONG_PRESS_DURATION_MS = 550;
const LONG_PRESS_MOVE_TOLERANCE_PX = 8;

function reserveVariantBranchSpace(rootShell) {
    window.requestAnimationFrame(() => {
        const grid = rootShell.closest(".library-entry-grid");
        if (!grid) return;
        grid.style.removeProperty("min-height");
        const gridRect = grid.getBoundingClientRect();
        const branchBottom = Array.from(
            rootShell.querySelectorAll(".library-entry-variant-shell"),
        ).reduce((bottom, shell) => {
            if (getComputedStyle(shell).display === "none") return bottom;
            return Math.max(bottom, shell.getBoundingClientRect().bottom);
        }, gridRect.bottom);
        const overflow = Math.ceil(branchBottom - gridRect.bottom);
        if (overflow > 0) {
            grid.style.minHeight = `${grid.offsetHeight + overflow + 12}px`;
        }
    });
}

export function closeUnrelatedVariantViews(root, control) {
    let closed = false;
    root.querySelectorAll(".library-entry-variants-open").forEach((shell) => {
        const parentControl = shell.querySelector(
            ":scope > button[data-library-entry]",
        );
        if (!shell.contains(control) || control === parentControl) {
            shell.classList.remove("library-entry-variants-open");
            closed = true;
        }
    });
    root.querySelectorAll(".library-entry-grid").forEach((grid) => {
        const openShell = grid.querySelector(".library-entry-variants-open");
        if (openShell) reserveVariantBranchSpace(openShell);
        else grid.style.removeProperty("min-height");
    });
    return closed;
}

export function clearVariantBranch(root) {
    root.querySelectorAll(
        ".library-entry-branch-active, .library-entry-branch-path, .library-entry-branch-tip",
    ).forEach((element) => {
        element.classList.remove(
            "library-entry-branch-active",
            "library-entry-branch-path",
            "library-entry-branch-tip",
        );
    });
}

export function activateVariantBranch(root, card) {
    const shell = card.closest(".library-entry-card-shell");
    if (!shell) return;
    if (shell.dataset.libraryVariantDepth === "0") {
        if (shell.classList.contains("library-entry-variants-open")) {
            clearVariantBranch(root);
        }
        return;
    }
    const rootShell = shell.closest(
        '.library-entry-card-shell[data-library-variant-depth="0"]',
    );
    if (!rootShell?.classList.contains("library-entry-variants-open")) return;
    clearVariantBranch(root);
    rootShell.classList.add("library-entry-branch-active");
    shell.classList.add("library-entry-branch-tip");
    let branchShell = shell;
    while (branchShell !== rootShell) {
        branchShell.classList.add("library-entry-branch-path");
        const variantSlot = branchShell.parentElement;
        if (!variantSlot?.classList.contains("library-entry-variant-shell")) {
            break;
        }
        variantSlot.classList.add("library-entry-branch-path");
        branchShell = variantSlot.parentElement;
    }
    reserveVariantBranchSpace(rootShell);
}

export function bindVariantInteractions(root, { signal, suppressNextClick }) {
    let longPressTimer = null;
    let longPressOrigin = null;
    const cancelLongPress = () => {
        if (longPressTimer !== null) window.clearTimeout(longPressTimer);
        longPressTimer = null;
        longPressOrigin = null;
    };
    root.addEventListener(
        "pointerdown",
        (event) => {
            if (event.button !== 0) return;
            const card = event.target.closest("button[data-library-entry]");
            if (!card) return;
            const shell = card.closest(".library-entry-card-shell");
            if (!shell?.querySelector(":scope > .library-entry-variant-shell"))
                return;
            cancelLongPress();
            longPressOrigin = { x: event.clientX, y: event.clientY };
            longPressTimer = window.setTimeout(() => {
                clearVariantBranch(root);
                root.querySelectorAll(".library-entry-variants-open").forEach(
                    (openShell) => {
                        if (openShell !== shell) {
                            openShell.classList.remove(
                                "library-entry-variants-open",
                            );
                        }
                    },
                );
                shell.classList.add("library-entry-variants-open");
                reserveVariantBranchSpace(shell);
                card.focus();
                suppressNextClick();
                longPressTimer = null;
            }, LONG_PRESS_DURATION_MS);
        },
        { signal },
    );
    root.addEventListener(
        "pointermove",
        (event) => {
            if (!longPressOrigin) return;
            const distance = Math.hypot(
                event.clientX - longPressOrigin.x,
                event.clientY - longPressOrigin.y,
            );
            if (distance > LONG_PRESS_MOVE_TOLERANCE_PX) cancelLongPress();
        },
        { signal },
    );
    root.addEventListener("pointerup", cancelLongPress, { signal });
    root.addEventListener("pointercancel", cancelLongPress, { signal });
    root.addEventListener(
        "pointerover",
        (event) => {
            const card = event.target.closest("button[data-library-entry]");
            if (!card || card.contains(event.relatedTarget)) return;
            activateVariantBranch(root, card);
        },
        { signal },
    );
    root.addEventListener(
        "focusout",
        (event) => {
            const rootShell = event.target.closest(
                ".library-entry-variants-open",
            );
            if (!rootShell || rootShell.contains(event.relatedTarget)) return;
            rootShell.classList.remove("library-entry-variants-open");
            rootShell
                .closest(".library-entry-grid")
                ?.style.removeProperty("min-height");
            clearVariantBranch(rootShell);
        },
        { signal },
    );
}
