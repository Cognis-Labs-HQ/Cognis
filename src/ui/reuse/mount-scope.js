/**
 * Replaces an existing page interaction scope and links its successor to the router signal.
 *
 * Public exports:
 * - `replaceMountScope()` — aborts the prior scope and returns a linked replacement.
 *
 * @example
 * ```js
 * mountController = replaceMountScope(mountController, routerSignal);
 * element.addEventListener('click', handler, { signal: mountController.signal });
 * ```
 */

/**
 * @param {AbortController | null} currentController Existing page scope.
 * @param {AbortSignal | undefined} externalSignal Router-owned scope.
 * @returns {AbortController} The new page-owned interaction scope.
 */
export function replaceMountScope(currentController, externalSignal) {
    currentController?.abort();
    const nextController = new AbortController();
    const abortNext = () => nextController.abort();
    externalSignal?.addEventListener("abort", abortNext, { once: true });
    nextController.signal.addEventListener(
        "abort",
        () => externalSignal?.removeEventListener("abort", abortNext),
        { once: true },
    );
    return nextController;
}
