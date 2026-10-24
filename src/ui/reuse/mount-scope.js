/**
 * Replaces an existing page interaction scope and links its successor to the router signal.
 *
 * Public exports:
 * - `isMountSignal()` — identifies a router scope or its linked page descendants.
 * - `replaceMountScope()` — aborts the prior scope and returns a linked replacement.
 *
 * @example
 * ```js
 * mountController = replaceMountScope(mountController, routerSignal);
 * element.addEventListener('click', handler, { signal: mountController.signal });
 * ```
 */

const parents = (globalThis[Symbol.for("cognis.mountSignalParents")] ??=
    new WeakMap());

export function isMountSignal(signal, parent) {
    while (signal) {
        if (signal === parent) return true;
        signal = parents.get(signal);
    }
    return false;
}

/**
 * @param {AbortController | null} currentController Existing page scope.
 * @param {AbortSignal | undefined} externalSignal Router-owned scope.
 * @returns {AbortController} The new page-owned interaction scope.
 */
export function replaceMountScope(currentController, externalSignal) {
    currentController?.abort();
    const nextController = new AbortController();
    if (externalSignal?.aborted) {
        nextController.abort();
        return nextController;
    }
    if (externalSignal) parents.set(nextController.signal, externalSignal);
    const abortNext = () => nextController.abort();
    externalSignal?.addEventListener("abort", abortNext, { once: true });
    nextController.signal.addEventListener(
        "abort",
        () => externalSignal?.removeEventListener("abort", abortNext),
        { once: true },
    );
    return nextController;
}
