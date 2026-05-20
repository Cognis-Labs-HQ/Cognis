/**
 * Criteria check module for form field validation.
 *
 * Provides live inline validation that runs a list of named criteria against a
 * field's current value and renders a failure message beneath the field when
 * any check fails.  Each criterion can supply its own message; when no
 * criterion message is given the generic fallback message is shown instead.
 *
 * Public exports:
 *   attachCriteriaCheck(field, criteria, options) — attaches live validation
 *     to a form input and returns a controller object with isValid() and
 *     detach() methods.
 *
 * Usage:
 *   const check = attachCriteriaCheck(passwordInput, [
 *     { test: value => value.length >= 8, message: 'Must be at least 8 characters.' },
 *     { test: value => /[A-Z]/.test(value) },
 *   ], { genericMessage: 'Password does not meet the requirements.' });
 *
 *   form.addEventListener('submit', event => {
 *     if (!check.isValid()) { event.preventDefault(); return; }
 *   });
 *
 *   check.detach(); // remove event listeners and indicator element when done
 *
 * @param {HTMLInputElement} field — the input element to validate.
 * @param {Array<{ test: (value: string) => boolean, message?: string }>} criteria
 *   — list of criteria to run; the first failing criterion's message is shown.
 * @param {{ genericMessage?: string, signal?: AbortSignal }} [options]
 * @returns {{ isValid: () => boolean, detach: () => void }}
 */
export function attachCriteriaCheck(field, criteria, options = {}) {
    const genericMessage =
        options.genericMessage ?? "This field does not meet the requirements.";

    const indicatorId = `criteria-check-${field.name || field.id || Math.random().toString(36).slice(2)}`;
    const indicator = document.createElement("p");
    indicator.className = "criteria-check-message";
    indicator.id = indicatorId;
    indicator.setAttribute("aria-live", "polite");
    indicator.style.display = "none";

    const existingDescribedBy = field.getAttribute("aria-describedby");
    field.setAttribute(
        "aria-describedby",
        existingDescribedBy
            ? `${existingDescribedBy} ${indicatorId}`
            : indicatorId,
    );

    field.insertAdjacentElement("afterend", indicator);

    function findFailingCriterion(value) {
        for (const criterion of criteria) {
            if (!criterion.test(value)) return criterion;
        }
        return null;
    }

    function runAndUpdate() {
        const failing = findFailingCriterion(field.value);
        if (failing) {
            indicator.textContent = failing.message ?? genericMessage;
            indicator.style.display = "";
        } else {
            indicator.textContent = "";
            indicator.style.display = "none";
        }
    }

    const listenerOptions = options.signal
        ? { signal: options.signal }
        : undefined;
    field.addEventListener("input", runAndUpdate, listenerOptions);
    field.addEventListener("blur", runAndUpdate, listenerOptions);

    function isValid() {
        return findFailingCriterion(field.value) === null;
    }

    function detach() {
        field.removeEventListener("input", runAndUpdate);
        field.removeEventListener("blur", runAndUpdate);
        const described = field.getAttribute("aria-describedby") ?? "";
        const remaining = described
            .split(/\s+/)
            .filter((part) => part !== indicatorId)
            .join(" ");
        if (remaining) {
            field.setAttribute("aria-describedby", remaining);
        } else {
            field.removeAttribute("aria-describedby");
        }
        indicator.remove();
    }

    return { isValid, detach };
}
