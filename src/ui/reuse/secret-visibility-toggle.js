/**
 * Shared helpers for toggling concealed/visible secret inputs.
 *
 * Exports:
 * - renderSecretVisibilityField: renders a concealed readonly secret input with a toggle.
 * - syncSecretVisibilityToggle: syncs control pressed/visual state from input type.
 * - toggleSecretVisibility: flips input visibility and syncs control state.
 * - bindSecretVisibilityToggles: wires delegated toggle click handling for a root.
 *
 * Example:
 * const input = row.querySelector('input[type="password"], input[type="text"]');
 * const toggle = row.querySelector('[data-secret-toggle]');
 * toggleSecretVisibility({ input, toggleControl: toggle });
 */

function defaultEscapeHtml(value) {
    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
}

/**
 * Render a readonly secret input with a reveal toggle button.
 *
 * @param {{
 *   id: string,
 *   value: string,
 *   label?: string,
 *   toggleLabel?: string,
 *   className?: string,
 *   inputClassName?: string,
 *   toggleClassName?: string,
 *   escapeHtml?: (value: string) => string
 * }} params
 * @returns {string}
 */
export function renderSecretVisibilityField({
    id,
    value,
    label = "",
    toggleLabel = "Toggle secret visibility",
    className = "secret-visibility-field",
    inputClassName = "secret-visibility-input",
    toggleClassName = "secret-visibility-toggle",
    escapeHtml = defaultEscapeHtml,
}) {
    const fieldId = String(id ?? "").trim();
    if (!fieldId) return "";
    const escapedId = escapeHtml(fieldId);
    const labelMarkup = label
        ? `<span class="secret-visibility-label">${escapeHtml(label)}</span>`
        : "";
    return `<label class="${escapeHtml(className)}" data-secret-visibility-field>${labelMarkup}<span class="secret-visibility-control"><input id="${escapedId}" class="${escapeHtml(inputClassName)}" type="password" readonly value="${escapeHtml(value)}" data-secret-visibility-input /><button type="button" class="${escapeHtml(toggleClassName)}" data-secret-visibility-toggle="${escapedId}" aria-controls="${escapedId}" aria-pressed="false" aria-label="${escapeHtml(toggleLabel)}"><span aria-hidden="true">👁</span></button></span></label>`;
}

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

/**
 * Bind delegated click handling for secret visibility toggle buttons.
 *
 * @param {{
 *   root: ParentNode | null | undefined,
 *   toggleSelector?: string,
 *   revealedClassName?: string,
 *   signal?: AbortSignal
 * }} params
 * @returns {() => void}
 */
export function bindSecretVisibilityToggles({
    root,
    toggleSelector = "[data-secret-visibility-toggle]",
    revealedClassName = "is-revealed",
    signal,
}) {
    if (!root || typeof root.addEventListener !== "function") return () => {};
    const handleToggleClick = (event) => {
        const target = event.target instanceof Element ? event.target : null;
        const toggleControl = target?.closest(toggleSelector);
        if (!(toggleControl instanceof HTMLElement)) return;
        const inputId = toggleControl.getAttribute(
            "data-secret-visibility-toggle",
        );
        const escapedInputId = inputId
            ?.replace(/\\/g, "\\\\")
            .replace(/"/g, '\\"');
        const input = escapedInputId
            ? root.querySelector(`[id="${escapedInputId}"]`)
            : toggleControl
                  .closest("[data-secret-visibility-field]")
                  ?.querySelector("[data-secret-visibility-input]");
        if (!(input instanceof HTMLInputElement)) return;
        event.preventDefault();
        toggleSecretVisibility({
            input,
            toggleControl,
            revealedClassName,
        });
    };
    root.addEventListener("click", handleToggleClick, { signal });
    return () => root.removeEventListener("click", handleToggleClick);
}
