/**
 * Resolves published same-document targets within their owner and visibility boundaries.
 * Public exports: usableTarget — checks a target's active visibility;
 * resolveTarget — resolves one authorized semantic target;
 * waitForTarget — observes an owned target until available, cancelled or timed out.
 * @example const element = await waitForTarget(resolve, { signal, timeoutMs: 1000, document });
 */
/**
 * @param {Element} element Candidate target.
 * @param {Document} document Expected owner document.
 * @returns {boolean} Whether the target is currently usable.
 */
export function usableTarget(element, document) {
    if (
        !element ||
        element.ownerDocument !== document ||
        !element.isConnected ||
        typeof element.getBoundingClientRect !== "function"
    )
        return false;
    if (
        element.matches?.(":disabled, [aria-disabled='true']") ||
        element.closest?.(
            "[inert], [hidden], [aria-hidden='true'], [aria-disabled='true']",
        )
    )
        return false;
    if (
        element.checkVisibility &&
        !element.checkVisibility({
            checkOpacity: true,
            checkVisibilityCSS: true,
        })
    )
        return false;
    if (!element.getClientRects().length) return false;
    const rect = element.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return false;
    let host = element.getRootNode?.()?.host;
    if (host && element.getRootNode().mode !== "open") return false;
    while (host) {
        if (host.closest?.("[inert], [hidden], [aria-hidden='true']"))
            return false;
        const root = host.getRootNode?.();
        if (root?.host && root.mode !== "open") return false;
        host = root?.host;
    }
    const style = document.defaultView.getComputedStyle(element);
    return (
        style.display !== "none" &&
        style.visibility !== "hidden" &&
        style.visibility !== "collapse" &&
        style.opacity !== "0"
    );
}

/**
 * @param {Map} targets Published target records.
 * @param {string} id Requested semantic target.
 * @param {string} owner Requesting tutorial owner.
 * @param {Document} document Expected owner document.
 * @returns {Element|null} The authorized visible target.
 */
export function resolveTarget(targets, id, owner, document) {
    if (!id) return null;
    const record = targets.get(id);
    if (
        !record ||
        record.signal.aborted ||
        (record.owner !== owner && !record.public) ||
        (record.available && record.available() !== true)
    )
        return null;
    const element = record.resolve();
    if (!usableTarget(element, document)) return null;
    const root = record.root?.();
    if (record.root && !root) return null;
    // A resolver may return an element in an open shadow root only when its host is inside the published root.
    if (
        root &&
        !root.contains(element) &&
        !root.contains(element.getRootNode?.()?.host)
    )
        return null;
    return element;
}

/**
 * @param {Function} resolve Owner-provided target resolver.
 * @param {object} options Lifetime, timeout and observer document.
 * @returns {Promise<Element|null>} The target or null after the deadline.
 */
export function waitForTarget(resolve, { signal, timeoutMs, document }) {
    signal.throwIfAborted();
    return new Promise((accept, reject) => {
        let timer,
            observer,
            settled = false;
        const finish = (value, error) => {
            if (settled) return;
            settled = true;
            clearInterval(timer);
            observer?.disconnect();
            signal.removeEventListener("abort", abort);
            if (error) reject(error);
            else accept(value);
        };
        const check = () => {
            try {
                signal.throwIfAborted();
                const element = resolve();
                if (element) finish(element);
            } catch (error) {
                finish(null, error);
            }
        };
        const abort = () =>
            finish(
                null,
                signal.reason ?? new DOMException("Aborted", "AbortError"),
            );
        const deadline = Date.now() + timeoutMs;
        timer = setInterval(() => {
            check();
            if (Date.now() >= deadline) finish(null);
        }, 50);
        signal.addEventListener("abort", abort, { once: true });
        if (document?.defaultView?.MutationObserver) {
            observer = new document.defaultView.MutationObserver(check);
            observer.observe(document.documentElement, {
                childList: true,
                subtree: true,
                attributes: true,
                attributeFilter: [
                    "hidden",
                    "disabled",
                    "aria-disabled",
                    "style",
                    "class",
                ],
            });
        }
        check();
        if (timeoutMs === 0) finish(null);
    });
}
