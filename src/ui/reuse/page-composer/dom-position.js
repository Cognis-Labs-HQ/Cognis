export function getFloatingSlot(root, id) {
    return root.querySelector(`[data-floating-slot="${CSS.escape(id)}"]`);
}

export function restoreWindowScrollPosition(left, top) {
    window.requestAnimationFrame(() => {
        window.scrollTo({
            left,
            top,
            behavior: "auto",
        });
    });
}
