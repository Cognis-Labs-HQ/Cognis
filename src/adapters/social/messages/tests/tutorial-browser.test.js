import assert from "node:assert/strict";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { serveBrowserFixture } from "../../../../ui/tests/integration/fixture-server.js";
import {
    launchChromium,
    findChromium,
} from "../../../../ui/tests/integration/chromium.js";
import { captureScreenshot } from "../../../../ui/tests/integration/artifacts.js";

const executable =
    process.env.COGNIS_BROWSER_TESTS === "1" ? findChromium() : null;

test(
    "Messages omits hidden compact actions from the displayed desktop tutorial count",
    { skip: !executable, timeout: 60000 },
    async (context) => {
        const server = await serveBrowserFixture(
            fileURLToPath(new URL("./fixtures/responsive", import.meta.url)),
            {
                staticRoots: {
                    "/static/adapters/social/messages/": fileURLToPath(
                        new URL("../ui/", import.meta.url),
                    ),
                },
            },
        );
        context.after(() => server.close());
        const browser = await launchChromium(executable);
        context.after(() => browser.close());
        await browser.command("Page.navigate", { url: server.url });
        await browser.waitFor("window.fixtureReady===true", {
            timeoutMs: 20000,
        });
        for (const [width, height, step, total] of [
            [1440, 900, "rooms", 6],
            [390, 844, "compact-conversations", 7],
        ]) {
            await browser.resize(width, height);
            const state = await browser.evaluate("window.fixture.openGuide()");
            assert.equal(state.stepId, step);
            assert.equal(state.index, 0);
            assert.equal(state.total, total);
            const progress = await browser.evaluate(
                "document.querySelector('.tutorial-progress').textContent",
            );
            assert.equal(progress, `Step 1 of ${total}`);
            await captureScreenshot(browser, `messages-guide-${width}`);
            await browser.evaluate("window.fixture.guideSession.cancel()");
        }
    },
);
