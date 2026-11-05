import { uiCtx } from "../../../../reuse/ui-ctx.js";
import { createI18n } from "../../../../reuse/i18n.js";
const { registerReleaseChangelogReadiness } =
    await import("../../../../layouts/release-changelog/readiness.js");

localStorage.setItem("cognis_account", "readiness-fixture");
localStorage.setItem("cognis_access_token", "fixture-token");
uiCtx.capabilities.contribute("session:isAuthenticated", () => true);
const controller = new AbortController();
registerReleaseChangelogReadiness(uiCtx, {
    i18n: await createI18n(),
    signal: controller.signal,
});
const tutorials = uiCtx.capabilities.get("ui:tutorials");
const owner = tutorials.owner("readiness", {
    signal: controller.signal,
    i18n: { t: (key) => key },
});
const target = await owner.target("target", {
    resolve: () => document.querySelector("#target"),
});
await owner.register({
    version: 1,
    id: "first-visit",
    titleKey: "Tutorial",
    page: () => true,
    steps: [
        {
            id: "target",
            titleKey: "Tutorial target",
            bodyKey: "Wait for changelogs before showing this guide.",
            target: target.id,
        },
        { id: "finish", titleKey: "Finished" },
    ],
});
window.readinessFixture = {
    state: () => ({
        ready: uiCtx.capabilities.get("ui:pageReadiness").isReady(),
        tutorial: tutorials.current(),
    }),
    async navigate() {
        window.dispatchEvent(new Event("cognis:route-will-change"));
        history.pushState({}, "", location.pathname + "/next");
        await uiCtx.runFlow("page:mounted", { pathname: location.pathname });
    },
    dispose: () => controller.abort(),
};
await uiCtx.runFlow("page:mounted", { pathname: location.pathname });
document.body.dataset.mounted = "true";
