/**
 * Keeps provider-contributed entries in the shell-owned user menu canonical.
 *
 * Exports:
 * - `reconcileUserMenuEntries` removes duplicate link destinations.
 * - `bindUserMenuIntegrity` continuously reconciles provider contributions.
 *
 * @example
 * bindUserMenuIntegrity(document.querySelector("#profile-dropdown"));
 */

/**
 * Removes all but the first menu entry for each link destination.
 *
 * @param {HTMLElement} dropdown
 * @returns {number} Number of duplicate entries removed.
 */
export function reconcileUserMenuEntries(dropdown) {
    const seenHrefs = new Set();
    let removed = 0;
    for (const item of Array.from(dropdown.children)) {
        const link = item.querySelector?.("a[href]");
        const href = String(link?.getAttribute("href") ?? "").trim();
        if (!href) continue;
        if (!seenHrefs.has(href)) {
            seenHrefs.add(href);
            continue;
        }
        console.warn("[dashboard-layout]:duplicate-user-menu-entry-removed", {
            href,
        });
        item.remove();
        removed += 1;
    }
    return removed;
}

/**
 * Watches the shell-owned menu for asynchronous provider contributions.
 *
 * @param {HTMLElement} dropdown
 * @returns {void}
 */
export function bindUserMenuIntegrity(dropdown) {
    reconcileUserMenuEntries(dropdown);
    if (dropdown.dataset.integrityBound === "true") return;
    dropdown.dataset.integrityBound = "true";
    const observer = new MutationObserver(() => {
        reconcileUserMenuEntries(dropdown);
    });
    observer.observe(dropdown, { childList: true });
}
