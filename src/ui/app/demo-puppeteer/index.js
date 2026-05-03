import { mergeWidgetConfig } from '../../components/widget-registry.js';

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export async function runDemoPuppeteer({ state, render, isRunningRef, i18n }) {
    const [sandboxPage] = state.pages;
    if (!sandboxPage) return;

    const scenarios = [
        async () => {
            state.activePageId = sandboxPage.id;
            render(i18n.t('ui.app.demo.switched'));
            await sleep(900);
        },
        async () => {
            sandboxPage.widgets.push({
                id: 'learning-progress',
                config: mergeWidgetConfig('learning-progress', { timeframe: '90d', showStreak: false })
            });
            render(i18n.t('ui.app.demo.added'));
            await sleep(900);
        },
        async () => {
            const first = sandboxPage.widgets[0];
            first.config = { ...first.config, timeframe: '14d' };
            render(i18n.t('ui.app.demo.tweaked'));
            await sleep(900);
        },
        async () => {
            sandboxPage.widgets.pop();
            render(i18n.t('ui.app.demo.removed'));
            await sleep(900);
        }
    ];

    for (const step of scenarios) {
        if (!isRunningRef.value) break;
        await step();
    }

    isRunningRef.value = false;
    render(i18n.t('ui.app.demo.complete'));
}
