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
    const resolve = (
        selector,
        match = "unique",
        boundary,
        queryRoot = root,
    ) => {
        const matches = [
            ...(queryRoot?.querySelectorAll(selector) ?? []),
        ].filter(
            (element) =>
                (!boundary || boundary.contains(element)) &&
                usableTarget(element, document),
        );
        return match === "first"
            ? (matches[0] ?? null)
            : matches.length === 1
              ? matches[0]
              : null;
    };
    try {
        for (const definition of definitions) {
            const { scope, visibleWhen, steps, available, ...play } =
                definition;
            if (visibleWhen !== undefined) {
                if (typeof visibleWhen !== "string" || !visibleWhen.trim())
                    throw new TypeError("invalid_tutorial_visibility_selector");
                root.querySelectorAll(visibleWhen);
            }
            const matchesPage = (page) =>
                (typeof play.page === "function"
                    ? play.page(page) === true
                    : page.pathname === play.page) &&
                (!scope || Boolean(resolve(scope))) &&
                (!visibleWhen || Boolean(resolve(visibleWhen)));
            const registeredSteps = [];
            const selections = new Map();
            for (const {
                selector,
                targetMatch = "unique",
                targetScope,
                portal,
                ...step
            } of steps) {
                let selected;
                if (targetScope !== undefined) {
                    if (
                        typeof targetScope !== "string" ||
                        !targetScope.trim() ||
                        portal !== undefined
                    )
                        throw new TypeError("invalid_tutorial_target_scope");
                    root.querySelectorAll(targetScope);
                }
                if (portal !== undefined) {
                    if (typeof portal !== "string" || !portal.trim())
                        throw new TypeError("invalid_tutorial_portal");
                    document.querySelectorAll(portal);
                }
                const targetRoot = () =>
                    portal
                        ? resolve(
                              step.popup
                                  ? `:is(${portal}).popup-overlay--visible`
                                  : portal,
                              "unique",
                              undefined,
                              document,
                          )
                        : root;
                if (!["unique", "first"].includes(targetMatch))
                    throw new TypeError("invalid_tutorial_target_match");
                const target = selector
                    ? await owner.target(`${play.id}.${step.id}`, {
                          root: targetRoot,
                          resolve: () => {
                              if (portal)
                                  return resolve(
                                      selector,
                                      targetMatch,
                                      undefined,
                                      targetRoot(),
                                  );
                              const boundary = scope
                                  ? resolve(scope)
                                  : undefined;
                              if (scope && !boundary) return null;
                              let queryRoot = root;
                              if (targetScope) {
                                  let anchor = selections.get(targetScope);
                                  if (!anchor?.isConnected) {
                                      anchor = resolve(
                                          targetScope,
                                          "first",
                                          boundary,
                                      );
                                      selections.set(targetScope, anchor);
                                  }
                                  if (
                                      !usableTarget(anchor, document) ||
                                      (boundary && !boundary.contains(anchor))
                                  )
                                      return null;
                                  queryRoot = anchor;
                              }
                              if (targetMatch === "unique")
                                  return resolve(
                                      selector,
                                      targetMatch,
                                      boundary,
                                      queryRoot,
                                  );
                              if (!selected?.isConnected)
                                  selected = resolve(
                                      selector,
                                      "first",
                                      boundary,
                                      queryRoot,
                                  );
                              return usableTarget(selected, document) &&
                                  (!boundary || boundary.contains(selected)) &&
                                  (queryRoot === root ||
                                      queryRoot.contains(selected))
                                  ? selected
                                  : null;
                          },
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
    // A page may have cached this catalog before its tutorial keys were published.
    const revision = JSON.stringify(
        [
            ...new Set(
                guides.flatMap((guide) =>
                    guide.definitions.flatMap((play) => [
                        play.titleKey,
                        ...play.steps.flatMap((step) =>
                            [step.titleKey, step.bodyKey].filter(Boolean),
                        ),
                    ]),
                ),
            ),
        ].sort(),
    );
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
                        const { createI18n, extendI18n } =
                            await ctx.capabilities
                                .get("ui:reuse")
                                .importModule("i18n.js");
                        const base = await createI18n({
                            persistLocale: false,
                            preferredLanguages: [document.documentElement.lang],
                        });
                        return extendI18n(base, stringsBaseUrls, { revision });
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
