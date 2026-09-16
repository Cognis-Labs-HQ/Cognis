/**
 * Loads module-owned authentication footer integrations and renders their
 * neutral link strip on login and registration pages.
 *
 * Public exports:
 *   loadAuthFooterPlugins() — imports enabled auth footer contributors.
 *   reconcileAuthFooterLinks(providerId, descriptors) — replaces one
 *     provider's current links with its latest eligible descriptors.
 *   renderAuthFooter() — returns the shared footer-link mount points.
 *   mountAuthFooter(root, options) — binds contributed links to the strip.
 *
 * Usage:
 *   await loadAuthFooterPlugins();
 *   container.innerHTML = renderAuthFooter();
 *   mountAuthFooter(container, { i18n, signal });
 *
 * @returns {Promise<void>} Resolves after every enabled contributor loads.
 */

import { apiFetch } from "./api-client.js";
import { footerLinks, mountFooterLinks } from "./footer-links.js";

const providerLinkDisposers = new Map();

export function reconcileAuthFooterLinks(providerId, descriptors) {
    const normalizedProviderId = String(providerId ?? "").trim();
    if (!normalizedProviderId) throw new Error("auth_footer_provider_required");
    const normalizedDescriptors = (
        Array.isArray(descriptors) ? descriptors : []
    ).map((descriptor) => {
        const id = String(descriptor.id ?? "").trim();
        const href = String(descriptor.href ?? "").trim();
        const label = String(descriptor.label ?? "").trim();
        const labelKey = String(descriptor.labelKey ?? "").trim();
        const side = descriptor.side ?? "left";
        if (!id || !href || (!label && !labelKey)) {
            throw new Error("invalid_auth_footer_link");
        }
        if (side !== "left" && side !== "right") {
            throw new Error("invalid_auth_footer_link_side");
        }
        return {
            id,
            href,
            label,
            labelKey,
            side,
            contexts: ["authentication"],
        };
    });
    if (
        new Set(normalizedDescriptors.map(({ id }) => id)).size !==
        normalizedDescriptors.length
    ) {
        throw new Error("duplicate_auth_footer_link_id");
    }
    providerLinkDisposers
        .get(normalizedProviderId)
        ?.forEach((dispose) => dispose());
    const disposers = normalizedDescriptors.map((descriptor) =>
        footerLinks.add({
            ...descriptor,
            id: `${normalizedProviderId}:${descriptor.id}`,
        }),
    );
    providerLinkDisposers.set(normalizedProviderId, disposers);
}

export async function loadAuthFooterPlugins() {
    const response = await apiFetch("/api/v1/ui/auth-footer-plugins");
    if (!response.ok) throw new Error("auth_footer_plugins_unavailable");
    const payload = await response.json();
    for (const plugin of Array.isArray(payload?.data) ? payload.data : []) {
        const scriptUrl = String(plugin.scriptUrl);
        const pluginModule = await footerLinks.withContexts(
            ["authentication"],
            () => import(scriptUrl),
        );
        if (typeof pluginModule.listAuthFooterLinks === "function") {
            await footerLinks.withContexts(["authentication"], async () => {
                reconcileAuthFooterLinks(
                    scriptUrl,
                    await pluginModule.listAuthFooterLinks(),
                );
            });
        }
    }
}

export function renderAuthFooter() {
    return `<nav class="auth-footer" aria-label="Footer"><span data-footer-links="left"></span><span data-footer-links="right"></span></nav>`;
}

/**
 * @param {HTMLElement} root Authentication page root.
 * @param {{ i18n?: object, signal?: AbortSignal }} options Render context.
 * @returns {() => void} Removes registry and navigation listeners.
 */
export function mountAuthFooter(root, { i18n, signal } = {}) {
    const unmount = mountFooterLinks(root, {
        i18n,
        context: "authentication",
    });
    signal?.addEventListener("abort", unmount, { once: true });
    return unmount;
}
