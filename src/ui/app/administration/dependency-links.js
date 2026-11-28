/**
 * Binds component dependency links to their rendered Administration rows.
 * Public export: bindDependencyLinks(root) expands and scrolls to linked component rows.
 * @example bindDependencyLinks(administrationRoot);
 */
import { buildScrollTargetId } from "./render-components.js";

/** @param {HTMLElement} root Mounted Administration surface. @returns {void} Attaches listeners to its dependency links. */
export function bindDependencyLinks(root) {
    root.querySelectorAll("a[data-scroll-to]").forEach((link) => {
        if (!(link instanceof HTMLAnchorElement)) return;
        const targetId = link.dataset.scrollTo;
        if (!targetId) return;
        link.addEventListener("click", (event) => {
            event.preventDefault();
            if (link.closest(".adapter-inline-row")) {
                // Stop propagation so the adapter row's click handler (which opens its config panel) does not fire when clicking a synced-pill link.
                event.stopPropagation();
            }
            let targetElement = null;
            if (targetId.startsWith("gateway-")) {
                targetElement = root.querySelector(
                    `[data-gateway="${CSS.escape(targetId.replace(/^gateway-/, ""))}"]`,
                );
            } else if (targetId.startsWith("module-")) {
                targetElement = root.querySelector(
                    `[data-module="${CSS.escape(targetId.replace(/^module-/, ""))}"]`,
                );
            } else if (targetId.startsWith("adapter-")) {
                const adapterRows = root.querySelectorAll(
                    ".adapter-inline-row[data-gateway-id][data-adapter-id]",
                );
                for (const row of adapterRows) {
                    if (!(row instanceof HTMLElement)) continue;
                    const rowGatewayId = row.dataset.gatewayId;
                    const rowAdapterId = row.dataset.adapterId;
                    if (
                        rowGatewayId &&
                        rowAdapterId &&
                        buildScrollTargetId(rowGatewayId, rowAdapterId) ===
                            targetId
                    ) {
                        targetElement = row;
                        break;
                    }
                }
            }
            if (!(targetElement instanceof HTMLElement)) return;
            const gatewayContainer = targetElement.closest("[data-gateway]");
            if (gatewayContainer instanceof HTMLElement) {
                gatewayContainer.setAttribute("open", "");
            }
            requestAnimationFrame(() => {
                targetElement.scrollIntoView({
                    behavior: "smooth",
                    block: "center",
                    inline: "nearest",
                });
            });
        });
    });
}
