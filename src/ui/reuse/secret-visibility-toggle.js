/**
 * Shared helpers for toggling concealed/visible secret inputs.
 *
 * Exports:
 * - syncSecretVisibilityToggle: syncs control pressed/visual state from input type.
 * - toggleSecretVisibility: flips input visibility and syncs control state.
 *
 * Example:
 * const input = row.querySelector('input[type="password"], input[type="text"]');
 * const toggle = row.querySelector('[data-secret-toggle]');
 * toggleSecretVisibility({ input, toggleControl: toggle });
 */

/**
 * Sync a toggle control visual/pressed state with the current input visibility.
 *
 * @param {{
 *   input: HTMLInputElement | null | undefined,
 *   toggleControl: HTMLElement | null | undefined,
 *   revealedClassName?: string
 * }} params
 * @returns {boolean}
 */
export function syncSecretVisibilityToggle({
    input,
    toggleControl,
    revealedClassName = "is-revealed",
}) {
    if (!(input instanceof HTMLInputElement)) return false;
    if (!(toggleControl instanceof HTMLElement)) return false;
    const isRevealed = input.type !== "password";
    toggleControl.classList.toggle(revealedClassName, isRevealed);
    toggleControl.setAttribute("aria-pressed", isRevealed ? "true" : "false");
    return isRevealed;
}

/**
 * Toggle a secret input between hidden and visible states.
 *
 * @param {{
 *   input: HTMLInputElement | null | undefined,
 *   toggleControl: HTMLElement | null | undefined,
 *   revealedClassName?: string
 * }} params
 * @returns {boolean}
 */
export function toggleSecretVisibility({
    input,
    toggleControl,
    revealedClassName = "is-revealed",
}) {
    if (!(input instanceof HTMLInputElement)) return false;
    if (!(toggleControl instanceof HTMLElement)) return false;
    input.type = input.type === "password" ? "text" : "password";
    return syncSecretVisibilityToggle({
        input,
        toggleControl,
        revealedClassName,
    });
}
