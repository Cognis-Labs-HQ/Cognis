/**
 * Adds an opt-in pending indicator to action buttons while asynchronous work runs.
 *
 * Public exports:
 * - beginButtonLoading: Marks a button busy and returns a function that restores it.
 *
 * @example
 * const finish = beginButtonLoading(saveButton);
 * try {
 *     await save();
 * } finally {
 *     finish();
 * }
 */

/**
 * Mark a button as busy until the returned cleanup function is called.
 *
 * @param {Element | null | undefined} button Button receiving the pending state.
 * @returns {() => void} Cleanup function restoring the original disabled state.
 */
export function beginButtonLoading(button) {
    if (!(button instanceof HTMLButtonElement)) return () => {};
    const wasDisabled = button.disabled;
    button.disabled = true;
    button.classList.add("button-loading");
    button.setAttribute("aria-busy", "true");
    return () => {
        button.classList.remove("button-loading");
        button.removeAttribute("aria-busy");
        button.disabled = wasDisabled;
    };
}
