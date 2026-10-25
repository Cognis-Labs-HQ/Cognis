import {
    fetchStudyLanguages,
    fetchStudyPreferences,
} from "./navigation-client.js";
import { createI18n } from "/static/reuse/i18n.js";
import { registerSearchIndexing } from "./search/index.js";

export async function mountProvider(ctx) {
    const flowId = "study:navigation:mount";
    ctx.registerFlow(flowId, ["load", "render"]);
    ctx.extendFlow(
        flowId,
        "load",
        { id: "study:navigation:load" },
        async (stage) => {
            const languages = await fetchStudyLanguages({ signal: ctx.signal });
            // Warm the lightweight hub preferences without blocking navigation on optional setup.
            void fetchStudyPreferences({ signal: ctx.signal }).catch(
                (error) => {
                    ctx.capabilities.get("ui:log")?.(
                        "info",
                        "Study preferences not yet available.",
                        {
                            component: "study-gateway",
                            operation: "warmNavigation",
                            errorName: error?.name,
                        },
                    );
                },
            );
            stage.data.languagesAvailable =
                Array.isArray(languages) && languages.length > 0;
            stage.data.i18n = await createI18n({
                componentStringBaseUrls: ["/static/gateways/study/languages"],
            });
        },
    );
    ctx.extendFlow(
        flowId,
        "render",
        { id: "study:navigation:render" },
        (stage) => {
            ctx.signal.throwIfAborted();
            const navbar = ctx.capabilities.get("ui:navbarLinks");
            if (!navbar) throw new Error("navbar_links_unavailable");
            const { i18n, languagesAvailable } = stage.data;
            stage.data.releaseLink = navbar.contribute("study", {
                href: "/study",
                label: i18n.t("ui.reuse.study"),
                disabled: !languagesAvailable,
                title: languagesAvailable
                    ? ""
                    : i18n.t("gateway.study.no_languages"),
            });
        },
    );
    const { data } = await ctx.runFlow(flowId);
    let releaseSearch;
    try {
        releaseSearch = registerSearchIndexing();
    } catch (error) {
        data.releaseLink();
        throw error;
    }
    globalThis.__studyGatewayAvailable = true;
    return () => {
        data.releaseLink();
        releaseSearch?.();
        globalThis.__studyGatewayAvailable = false;
    };
}
