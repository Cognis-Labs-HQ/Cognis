import { mergeElementConfig } from "../../reuse/element-registry.js";

const sleep = (milliseconds) =>
    new Promise((resolve) => setTimeout(resolve, milliseconds));

export async function runDemoPuppeteer({
    state,
    render,
    isRunningRef: isRunningReference,
    i18n,
}) {
    const [sandboxPage] = state.pages;
    if (!sandboxPage) return;

    const scenarios = [
        async () => {
            state.activePageId = sandboxPage.id;
            render(i18n.t("ui.app.demo.switched"));
            await sleep(900);
        },
        async () => {
            sandboxPage.elements.push({
                id: "learning-progress",
                config: mergeElementConfig("learning-progress", {
                    timeframe: "90d",
                    showStreak: false,
                }),
            });
            render(i18n.t("ui.app.demo.added"));
            await sleep(900);
        },
        async () => {
            const first = sandboxPage.elements[0];
            first.config = { ...first.config, timeframe: "14d" };
            render(i18n.t("ui.app.demo.tweaked"));
            await sleep(900);
        },
        async () => {
            sandboxPage.elements.pop();
            render(i18n.t("ui.app.demo.removed"));
            await sleep(900);
        },
    ];

    for (const step of scenarios) {
        if (!isRunningReference.value) break;
        await step();
    }

    isRunningReference.value = false;
    render(i18n.t("ui.app.demo.complete"));
}
