import {
    fitVariantBranchWithinGrid,
    restorePreferredVariantDirections,
} from "./variant-fit.js";

const LONG_PRESS_DURATION_MS = 550;
const LONG_PRESS_MOVE_TOLERANCE_PX = 8;
const BRANCH_HOVER_INTENT_MS = 100;

export function closeUnrelatedVariantViews(root, control) {
    let closed = false;
    root.querySelectorAll(".library-entry-variants-open").forEach((shell) => {
        const parentControl = shell.querySelector(
            ":scope > button[data-library-entry]",
        );
        if (!shell.contains(control) || control === parentControl) {
            shell.classList.remove("library-entry-variants-open");
            restorePreferredVariantDirections(shell);
            closed = true;
        }
    });
    root.querySelectorAll(".library-entry-variants-open").forEach(
        fitVariantBranchWithinGrid,
    );
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
    fitVariantBranchWithinGrid(rootShell);
}

export function bindVariantInteractions(root, { signal, suppressNextClick }) {
    let longPressTimer = null;
    let longPressOrigin = null;
    let branchHoverTimer = null;
    let pendingBranchShell = null;
    const cancelLongPress = () => {
        if (longPressTimer !== null) window.clearTimeout(longPressTimer);
        longPressTimer = null;
        longPressOrigin = null;
    };
    signal?.addEventListener(
        "abort",
        () => {
            cancelLongPress();
            if (branchHoverTimer !== null)
                window.clearTimeout(branchHoverTimer);
        },
        { once: true },
    );
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
                fitVariantBranchWithinGrid(shell);
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
            const shell = card.closest(".library-entry-card-shell");
            if (branchHoverTimer !== null)
                window.clearTimeout(branchHoverTimer);
            pendingBranchShell = shell;
            branchHoverTimer = window.setTimeout(() => {
                activateVariantBranch(root, card);
                branchHoverTimer = null;
                pendingBranchShell = null;
            }, BRANCH_HOVER_INTENT_MS);
        },
        { signal },
    );
    root.addEventListener(
        "pointerout",
        (event) => {
            if (
                branchHoverTimer === null ||
                pendingBranchShell?.contains(event.relatedTarget)
            )
                return;
            window.clearTimeout(branchHoverTimer);
            branchHoverTimer = null;
            pendingBranchShell = null;
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
            restorePreferredVariantDirections(rootShell);
            clearVariantBranch(rootShell);
        },
        { signal },
    );
}
