/**
 * Revalidates a confirmation-password field whenever either password input
 * changes so mismatch criteria update immediately in-place.
 *
 * Exported API:
 * - bindConfirmPasswordRevalidation(options): Attaches reactive validation
 *   listeners for a password/confirmation pair.
 *
 * Usage:
 *   bindConfirmPasswordRevalidation({
 *     form,
 *     formController,
 *     passwordFieldName: 'password',
 *     confirmFieldName: 'confirmPassword',
 *     signal,
 *   });
 *
 * @param {{
 *   form: HTMLFormElement,
 *   formController: { validateField: (fieldName: string) => boolean } | null,
 *   passwordFieldName: string,
 *   confirmFieldName: string,
 *   signal?: AbortSignal,
 * }} options
 * @returns {void}
 */
export function bindConfirmPasswordRevalidation({
    form,
    formController,
    passwordFieldName,
    confirmFieldName,
    signal,
}) {
    if (!(form instanceof HTMLFormElement) || !formController) {
        return;
    }
    const passwordInput = form.elements.namedItem(passwordFieldName);
    const confirmPasswordInput = form.elements.namedItem(confirmFieldName);
    if (
        !(passwordInput instanceof HTMLInputElement) ||
        !(confirmPasswordInput instanceof HTMLInputElement)
    ) {
        return;
    }
    const listenerOptions = signal ? { signal } : undefined;
    const revalidateConfirmPassword = () => {
        formController.validateField(confirmFieldName);
    };
    passwordInput.addEventListener(
        "input",
        revalidateConfirmPassword,
        listenerOptions,
    );
    passwordInput.addEventListener(
        "change",
        revalidateConfirmPassword,
        listenerOptions,
    );
    confirmPasswordInput.addEventListener(
        "input",
        revalidateConfirmPassword,
        listenerOptions,
    );
    confirmPasswordInput.addEventListener(
        "change",
        revalidateConfirmPassword,
        listenerOptions,
    );
}
