import { fetchLibrarySchemas } from "./library-client.js";
import { languageExploreUrl, languageFlashcardsUrl } from "./reuse/explore.js";

/** Publish Study-owned semantic navigation targets for registered learning tutorials. */
export async function mountProvider(ctx) {
    const owner = ctx.capabilities.get("ui:tutorials").owner("study", {
        signal: ctx.signal,
        stringsBaseUrls: ["/static/gateways/study/languages"],
    });
    const ids = {};
    try {
        for (const [name, selector] of Object.entries({
            navigation: ".study-subnav-modules",
            languages: ".study-subnav-language-options",
            modules: ".study-hub-modules",
        })) {
            const target = await owner.target(name, {
                public: true,
                available: () => window.location.pathname.startsWith("/study"),
                resolve: () => {
                    const all = document.querySelectorAll(selector);
                    return all.length === 1 ? all[0] : null;
                },
            });
            ids[name] = target.id;
        }
        const registerActions = ctx.capabilities.get("ui:scopedActions");
        if (!registerActions) throw new Error("scoped_actions_unavailable");
        const actions = registerActions(ctx, "study:tutorialNavigation", {
            route: async ({ language, area }) => {
                ctx.signal.throwIfAborted();
                if (
                    typeof language !== "string" ||
                    !/^[a-z]{2,3}(?:-[a-z0-9]+)*$/.test(language)
                )
                    throw new TypeError("invalid_study_language");
                if (area === "overview") return "/study";
                if (area === "flashcards")
                    return languageFlashcardsUrl(language);
                if (area !== "explore")
                    throw new TypeError("invalid_study_tutorial_area");
                const schemas = await fetchLibrarySchemas(language);
                ctx.signal.throwIfAborted();
                const route = languageExploreUrl(schemas, language);
                if (!route)
                    throw new Error("study_tutorial_content_unavailable");
                return route;
            },
        });
        ctx.capabilities.contribute(
            "study:tutorialTargets",
            Object.freeze({ ...ids, ...actions }),
        );
        await owner.register({
            version: 1,
            id: "getting-started",
            titleKey: "gateway.study.tutorial.title",
            available: () =>
                ctx.capabilities.get("session:isAuthenticated")?.() === true,
            requires: ["ui:navigate", "study:navigation"],
            steps: ["navigation", "languages", "modules"].map((name) => ({
                id: name,
                route: "/study",
                target: ids[name],
                titleKey: `gateway.study.tutorial.${name}.title`,
                bodyKey: `gateway.study.tutorial.${name}.body`,
                effects: { callout: true, arrow: true, spotlight: true },
                missing: { timeoutMs: 3000, action: "skip" },
            })),
        });
        return owner.dispose;
    } catch (error) {
        owner.dispose();
        throw error;
    }
}
