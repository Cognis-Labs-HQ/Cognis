/** Register language-owned content guides through Library's scoped public actions. */
import { exploreWalkthrough } from "./walkthrough.js";
import { guides } from "../app/guides.js";
import { fetchLibrarySchemas } from "/static/gateways/study/library-client.js";
import { exploreLayers } from "/static/gateways/study/reuse/explore.js";
import { canCreateLayerEntries } from "../app/editability.js";

export async function mountProvider(ctx) {
    const api = ctx.capabilities.get("ui:tutorials");
    const study = ctx.capabilities.get("study:tutorialTargets");
    const registerActions = ctx.capabilities.get("ui:scopedActions");
    if (!api || !study || !registerActions)
        throw new Error("library_tutorial_contract_unavailable");
    const records = new Map();
    const { mountTutorialProvider } = await ctx.capabilities
        .get("ui:reuse")
        .importModule("tutorials/pages.js");
    const enrolled = (language) => study.isEnrolled(language);
    const activeLanguage = () =>
        /^\/study\/explore\/([a-z-]+)(?:\/|$)/.exec(
            window.location.pathname,
        )?.[1];
    const actions = registerActions(ctx, "study.library:tutorials", {
        register: async ({
            owner,
            id,
            language,
            titleKey,
            text = {},
            stringsBaseUrls,
            signal,
        }) => {
            if (
                typeof language !== "string" ||
                !/^[a-z]{2,3}(?:-[a-z0-9]+)*$/.test(language) ||
                records.has(language)
            )
                throw new TypeError("invalid_library_tutorial_language");
            const lifetime = AbortSignal.any([ctx.signal, signal]);
            const onOverview = () =>
                study.matchesPage({
                    pathname: window.location.pathname,
                    language,
                });
            const scoped = { ...ctx, signal: lifetime };
            const steps = exploreWalkthrough({ text, drawing: study });
            steps[0].route = async ({ signal: stepSignal }) => {
                stepSignal.throwIfAborted();
                if (activeLanguage() === language)
                    return window.location.pathname;
                const route = await study.route({
                    language,
                    area: "explore",
                    signal: stepSignal,
                });
                stepSignal.throwIfAborted();
                return route;
            };
            const creation = steps.find((step) => step.id === "create-card");
            delete creation.when;
            creation.route = async ({ signal: stepSignal }) => {
                if (document.querySelector("[data-library-create-entry]"))
                    return window.location.pathname;
                const schemas = await fetchLibrarySchemas(language);
                stepSignal.throwIfAborted();
                const choice = exploreLayers(schemas, language).find(
                    ({ layer }) => canCreateLayerEntries(layer),
                );
                return choice
                    ? `/study/explore/${language}/${encodeURIComponent(choice.layer.navigationSlug ?? choice.layer.id)}`
                    : window.location.pathname;
            };
            const record = { release: undefined, lifetime };
            const dispose = () => {
                if (records.get(language) === record) records.delete(language);
                record.release?.();
            };
            records.set(language, record);
            lifetime.addEventListener("abort", dispose, { once: true });
            try {
                const release = await mountTutorialProvider(scoped, {
                    guides: [
                        {
                            owner,
                            definitions: [
                                {
                                    id,
                                    titleKey,
                                    page: ({ pathname }) =>
                                        study.matchesPage({
                                            pathname,
                                            language,
                                        }) ||
                                        (pathname.startsWith(
                                            `/study/explore/${language}/`,
                                        ) &&
                                            activeLanguage() === language),
                                    automatic: ({ pathname }) =>
                                        pathname.startsWith(
                                            `/study/explore/${language}/`,
                                        ),
                                    available: () =>
                                        enrolled(language) &&
                                        (onOverview() ||
                                            activeLanguage() === language),
                                    steps,
                                },
                            ],
                        },
                    ],
                    stringsBaseUrls: [
                        "/static/adapters/study/library/languages",
                        ...stringsBaseUrls,
                    ],
                });
                record.release = release;
                if (lifetime.aborted) {
                    dispose();
                    lifetime.throwIfAborted();
                }
                return { id: `${owner}:${id}`, dispose };
            } catch (error) {
                dispose();
                throw error;
            }
        },
    });
    ctx.capabilities.contribute("study:libraryTutorials", {
        version: 1,
        ...actions,
        hasGuide: () => {
            const language = activeLanguage();
            return Boolean(
                language &&
                enrolled(language) &&
                records.get(language)?.release,
            );
        },
    });
    const releaseCatalog = await mountTutorialProvider(ctx, {
        guides: guides.map((guide) => ({
            ...guide,
            definitions: guide.definitions.map((play) =>
                play.id === "explore"
                    ? {
                          ...play,
                          available: () =>
                              !ctx.capabilities
                                  .get("study:libraryTutorials")
                                  .hasGuide(),
                          steps: exploreWalkthrough({ drawing: study }),
                      }
                    : play,
            ),
        })),
        stringsBaseUrls: ["/static/adapters/study/library/languages"],
    });
    return () => {
        releaseCatalog();
        for (const record of records.values()) record.release?.();
        records.clear();
    };
}
