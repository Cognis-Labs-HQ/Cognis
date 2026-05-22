/**
 * Runs page mount on direct URL loads while skipping SPA-router navigations.
 */
export async function mountWhenDirect(mount, { rootSelector = "#app" } = {}) {
    if (globalThis.__spaRouter) return;
    await mount(document.querySelector(rootSelector));
}
