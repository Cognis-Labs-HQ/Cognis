/**
 * Registers component-owned page tutorials with scoped, visible semantic targets.
 * Public exports: mountPageTutorials — binds a component's definitions to its page lifetime;
 * collectPageTutorials — collects tutorial contributions from composed sections.
 * mountTutorialProvider — registers guides from a lifecycle-scoped component provider.
 * mountComposerTutorials — mounts a page’s contributions and binds navigation cleanup.
 * @example await tutorials.mountPage({ owner: 'ui.settings', root, signal, i18n, definitions });
 * @param {object} api The public tutorial registration capability.
 * @param {object} options Owner, page lifetime, localization and authored definitions.
 * @returns {Promise<Function>} The owner's idempotent cleanup.
 */
import { usableTarget } from "./targets.js";

export async function mountPageTutorials(
    api,
    { owner: ownerId, root, signal, i18n, definitions, authorized },
) {
    const document = root.ownerDocument;
    const owner = api.owner(ownerId, { signal, i18n });
    const resolve = (selector) => {
        const matches = [...root.querySelectorAll(selector)].filter((element) =>
            usableTarget(element, document),
        );
        return matches.length === 1 ? matches[0] : null;
    };
    try {
        for (const definition of definitions) {
            const { scope, steps, available, ...play } = definition;
            const matchesPage = (page) =>
                (typeof play.page === "function"
                    ? play.page(page) === true
                    : page.pathname === play.page) &&
                (!scope || Boolean(resolve(scope)));
            const registeredSteps = [];
            for (const { selector, ...step } of steps) {
                const target = selector
                    ? await owner.target(`${play.id}.${step.id}`, {
                          root: () => root,
                          resolve: () => resolve(selector),
                      })
                    : null;
                registeredSteps.push({
                    ...step,
                    ...(target ? { target: target.id } : {}),
                    effects: {
                        callout: true,
                        arrow: Boolean(target),
                        spotlight: Boolean(target),
                        ...step.effects,
                    },
                    missing: {
                        timeoutMs: 1500,
                        action: "skip",
                        ...step.missing,
                    },
                });
            }
            await owner.register({
                version: 1,
                ...play,
                page: matchesPage,
                available: () =>
                    authorized() &&
                    root.isConnected &&
                    matchesPage({
                        pathname: document.defaultView.location.pathname,
                    }) &&
                    (!available || available() === true),
                steps: registeredSteps,
            });
        }
        return owner.dispose;
    } catch (error) {
        owner.dispose();
        throw error;
    }
}

/**
 * @param {object} options Page and nested-section contribution metadata.
 * @returns {object[]} Collected tutorial contributions.
 */
export function collectPageTutorials(options) {
    return [
        ...(options.tutorials ?? []),
        ...(options.elements ?? []).flatMap((element) =>
            collectPageTutorials(element.subComposerOptions ?? element),
        ),
    ];
}

/**
 * Mount page guides published by an optional component's scoped browser provider.
 * @param {object} ctx The provider's public browser context.
 * @param {object} options Component-owned guides, locale bundles and published capability.
 * @returns {Promise<Function>} Cleanup for every contributed guide.
 */
export async function mountTutorialProvider(
    ctx,
    { guides, stringsBaseUrls, capability },
) {
    const api = ctx.capabilities.get("ui:tutorials");
    if (typeof api?.mountPage !== "function")
        throw new Error("tutorial_host_unavailable");
    const release = [];
    const dispose = () => {
        for (const cleanup of release.splice(0).reverse()) cleanup();
    };
    try {
        for (const contribution of guides) {
            release.push(
                await api.mountPage({
                    ...contribution,
                    root: document.body,
                    signal: ctx.signal,
                    i18n: async () => {
                        const { createI18n } = await ctx.capabilities
                            .get("ui:reuse")
                            .importModule("i18n.js");
                        return createI18n({
                            persistLocale: false,
                            preferredLanguages: [document.documentElement.lang],
                            componentStringBaseUrls: stringsBaseUrls,
                        });
                    },
                }),
            );
        }
        if (capability)
            ctx.capabilities.contribute(capability, {
                list: async () =>
                    (await api.list()).filter((play) =>
                        guides.some((guide) =>
                            play.id.startsWith(`${guide.owner}:`),
                        ),
                    ),
            });
        return dispose;
    } catch (error) {
        dispose();
        throw error;
    }
}

/**
 * @param {object} ctx Public browser context.
 * @param {object} options Page root, localization, lifetime and authored contributions.
 * @returns {Promise<void>} Resolves after every registration succeeds.
 */
export async function mountComposerTutorials(
    ctx,
    { root, i18n, lifetime, tutorials, elements },
) {
    const api = ctx.capabilities.get("ui:tutorials");
    if (!api) return;
    root.ownerDocument.defaultView.addEventListener(
        "cognis:route-will-change",
        () => lifetime.abort(),
        {
            once: true,
            signal: lifetime.signal,
        },
    );
    try {
        for (const contribution of collectPageTutorials({
            tutorials,
            elements,
        })) {
            await api.mountPage({
                ...contribution,
                root,
                signal: lifetime.signal,
                i18n: contribution.i18n ?? i18n,
            });
        }
    } catch (error) {
        lifetime.abort();
        throw error;
    }
}
