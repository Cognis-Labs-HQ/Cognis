import { mergeWidgetConfig } from '../components/widget-registry.js';

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export async function runDemoPuppeteer({ state, render, isRunningRef }) {
  const [sandboxPage] = state.pages;
  if (!sandboxPage) return;

  const scenarios = [
    async () => {
      state.activePageId = sandboxPage.id;
      render('Demo: switched to sandbox page.');
      await sleep(900);
    },
    async () => {
      sandboxPage.widgets.push({
        id: 'learning-progress',
        config: mergeWidgetConfig('learning-progress', { timeframe: '90d', showStreak: false })
      });
      render('Demo: added a learning progress widget.');
      await sleep(900);
    },
    async () => {
      const first = sandboxPage.widgets[0];
      first.config = { ...first.config, timeframe: '14d' };
      render('Demo: tweaked the first widget configuration.');
      await sleep(900);
    },
    async () => {
      sandboxPage.widgets.pop();
      render('Demo: removed the most recent widget.');
      await sleep(900);
    }
  ];

  for (const step of scenarios) {
    if (!isRunningRef.value) break;
    await step();
  }

  isRunningRef.value = false;
  render('Demo complete.');
}
