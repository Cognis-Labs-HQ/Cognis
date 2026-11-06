/**
 * Install tutorials through host-owned resources; components consume ui:tutorials only.
 * Public export: installTutorials — installs the host tutorial capability and page coordinator.
 * @example installTutorials(uiCtx);
 * @param {object} ctx Browser capability and flow context.
 * @returns {object} Tutorial registration/session contract.
 */
import { registerTutorials } from "./runtime.js";
import { createTutorialView } from "./presentation.js";
import { createPageTutorials } from "./page.js";

export function installTutorials(ctx) {
    if (ctx.capabilities.get("ui:tutorials"))
        return ctx.capabilities.get("ui:tutorials");
    let page;
    const log = (...args) => ctx.capabilities.get("ui:log")?.(...args);
    const prepareStyles = () =>
        ctx.capabilities
            .get("ui:reuse")
            .loadStylesheets(["tutorials.css", "floating-menu.css"]);
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
            ctx,
            document,
            hostI18n: i18n,
            loadStyles: prepareStyles,
        });
        return view;
    };
    const api = registerTutorials(ctx, {
        localize,
        view: async (options) => (await prepare())(options),
        log,
        identity: () => globalThis.localStorage?.getItem("cognis_account"),
        role: () => globalThis.localStorage?.getItem("cognis_role"),
        feedback: async () => {
            const i18n = await localize();
            ctx.capabilities.get("ui:showToast")?.(
                i18n.t("ui.tutorial.error"),
                { variant: "error" },
            );
        },
        page: () => page?.refresh(),
        openPage: () => page?.open(),
    });
    if (globalThis.document?.defaultView?.MutationObserver) {
        page = createPageTutorials({
            ctx,
            api,
            document,
            localize,
            prepareStyles,
            account: () =>
                ctx.capabilities.get("session:isAuthenticated")?.() === true
                    ? globalThis.localStorage?.getItem("cognis_account")
                    : null,
            storage: () => globalThis.localStorage,
            report(error) {
                log("error", "Page tutorial failed.", {
                    component: "ui",
                    operation: "pageTutorial",
                    errorName: error?.name,
                });
                void localize()
                    .then((i18n) =>
                        ctx.capabilities.get("ui:showToast")?.(
                            i18n.t("ui.tutorial.error"),
                            { variant: "error" },
                        ),
                    )
                    .catch((failure) => {
                        log("error", "Tutorial feedback failed.", {
                            component: "ui",
                            operation: "tutorialFeedback",
                            errorName: failure?.name,
                        });
                    });
            },
        });
        page.connect();
    }
    return api;
}
