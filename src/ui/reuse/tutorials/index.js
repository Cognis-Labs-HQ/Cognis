import { registerTutorials } from "./runtime.js";
import { createTutorialView } from "./presentation.js";
import { openTutorialCatalog } from "./catalog.js";

/**
 * Install tutorials through host-owned resources; components consume ui:tutorials only.
 * @example installTutorials(uiCtx);
 * @param {object} ctx Browser capability and flow context.
 * @returns {object} Tutorial registration/session contract.
 */
export function installTutorials(ctx) {
    const localize = async (componentStringBaseUrls = []) => {
        const { createI18n } = await ctx.capabilities
            .get("ui:reuse")
            .importModule("i18n.js");
        return createI18n({
            persistLocale: false,
            preferredLanguages: [document.documentElement.lang],
            componentStringBaseUrls,
        });
    };
    const prepare = async () => {
        const i18n = await localize();
        const view = createTutorialView({
            document,
            hostI18n: i18n,
            loadStyles: () =>
                ctx.capabilities
                    .get("ui:reuse")
                    .loadStylesheet("tutorials.css"),
        });
        return view;
    };
    return registerTutorials(ctx, {
        localize,
        view: async (options) => (await prepare())(options),
        log: (...args) => ctx.capabilities.get("ui:log")?.(...args),
        feedback: async () => {
            const i18n = await localize();
            ctx.capabilities.get("ui:showToast")?.(
                i18n.t("ui.tutorial.error"),
                { variant: "error" },
            );
        },
        catalog: (api) => openTutorialCatalog(api, ctx),
    });
}
