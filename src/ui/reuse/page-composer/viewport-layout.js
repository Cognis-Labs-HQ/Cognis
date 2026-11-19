/**
 * Fits a single composer surface to the visible viewport, including keyboard resizes.
 * Exports mountViewportLayout to bind sizing to a surface lifetime.
 * @example const dispose = mountViewportLayout(root, { signal });
 * @param {HTMLElement} root Page root.
 * @param {{signal?: AbortSignal}} options Page lifetime.
 * @returns {() => void} Idempotent cleanup.
 */
export function mountViewportLayout(root, { signal } = {}) {
    const workspace = root.querySelector(".workspace");
    if (!workspace || signal?.aborted) return () => {};
    const document = workspace.ownerDocument;
    const window = document.defaultView;
    workspace.classList.add("app-page--viewport");
    let frame;
    let disposed = false;
    const update = () => {
        frame = undefined;
        if (disposed) return;
        const viewport = window.visualViewport;
        const bottom =
            (viewport?.offsetTop ?? 0) +
            (viewport?.height ?? window.innerHeight);
        const footer = root.querySelector(".global-footer");
        const footerHeight = footer?.getBoundingClientRect().height ?? 0;
        const dock = root.querySelector(".page-action-dock");
        const dockBounds = dock?.getBoundingClientRect();
        const contentBottom =
            dockBounds?.height > 0
                ? Math.min(bottom - footerHeight - 24, dockBounds.top - 12)
                : bottom - footerHeight - 24;
        const main = workspace.querySelector(".main-window");
        const body = main?.querySelector("[data-composer-viewport-body]");
        const bodyMinimum =
            20 *
            Number.parseFloat(
                window.getComputedStyle(document.documentElement).fontSize,
            );
        const chrome = body
            ? Math.max(
                  0,
                  main.getBoundingClientRect().height -
                      body.getBoundingClientRect().height,
              )
            : 0;
        const available = Math.max(
            bodyMinimum + chrome,
            contentBottom -
                workspace.getBoundingClientRect().top -
                window.scrollY,
        );
        for (const element of observedBodies) {
            if (element !== body) {
                observer.unobserve(element);
                observedBodies.delete(element);
            }
        }
        if (body && !observedBodies.has(body)) {
            observer.observe(body);
            observedBodies.add(body);
        }
        workspace.style.setProperty("--page-viewport-height", `${available}px`);
    };
    const schedule = () => {
        if (!disposed && frame === undefined)
            frame = window.requestAnimationFrame(update);
    };
    const observedBodies = new Set();
    const observer = new window.ResizeObserver(schedule);
    const mutations = new window.MutationObserver(schedule);
    mutations.observe(workspace, { childList: true, subtree: true });
    for (const element of [
        root.querySelector(".site-header"),
        root.querySelector(".global-footer"),
        root.querySelector(".page-action-dock"),
        document.documentElement,
    ]) {
        if (element) observer.observe(element);
    }
    window.addEventListener("resize", schedule);
    window.visualViewport?.addEventListener("resize", schedule);
    window.visualViewport?.addEventListener("scroll", schedule);
    update();
    const dispose = () => {
        if (disposed) return;
        disposed = true;
        signal?.removeEventListener("abort", dispose);
        observer.disconnect();
        mutations.disconnect();
        observedBodies.clear();
        window.cancelAnimationFrame(frame);
        window.removeEventListener("resize", schedule);
        window.visualViewport?.removeEventListener("resize", schedule);
        window.visualViewport?.removeEventListener("scroll", schedule);
        workspace.classList.remove("app-page--viewport");
        workspace.style.removeProperty("--page-viewport-height");
    };
    signal?.addEventListener("abort", dispose, { once: true });
    return dispose;
}
