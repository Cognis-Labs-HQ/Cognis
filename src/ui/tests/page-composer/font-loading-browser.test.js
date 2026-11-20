import assert from "node:assert/strict";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { launchChromium, findChromium } from "../integration/chromium.js";
import { serveBrowserFixture } from "../integration/fixture-server.js";
import { skip, assertNoDocumentOverflow } from "./reuse/browser.js";

test(
    "Composer reflows late fonts and long text without shrinking preferences",
    { skip, timeout: 60000 },
    async (context) => {
        const server = await serveBrowserFixture(
            fileURLToPath(new URL("./fixtures/", import.meta.url)),
        );
        context.after(() => server.close());
        const browser = await launchChromium(findChromium());
        context.after(() => browser.close());
        await browser.command("Fetch.enable", {
            patterns: [{ urlPattern: "*.ttf", requestStage: "Request" }],
        });
        await browser.resize(360, 740);
        await browser.command("Page.navigate", { url: server.url });
        await browser.waitFor("Boolean(window.fixture)");
        assert.equal(
            await browser.evaluate("window.fixture.error ?? null"),
            null,
        );
        await browser.waitFor('document.fonts.status === "loading"');
        await browser.evaluate(
            `document.querySelector('[data-fixture-paragraph]').textContent = document.querySelector('h2').textContent.repeat(30)`,
        );
        for (const loaded of [false, true]) {
            if (loaded) {
                await browser.command("Fetch.disable");
                await browser.evaluate("document.fonts.ready");
                assert.equal(
                    await browser.evaluate(
                        '[...document.fonts].some(font => font.family === "Orbitron" && font.status === "loaded")',
                    ),
                    true,
                );
            }
            for (const width of [320, 360, 768, 1280]) {
                await browser.resize(width, 740);
                await browser.command("Emulation.setDeviceMetricsOverride", {
                    width,
                    height: 740,
                    deviceScaleFactor: 1,
                    mobile: width <= 640,
                });
                for (const size of ["16px", "24px"]) {
                    await browser.callFunction(
                        'function(size) { document.documentElement.style.setProperty("--app-font-size", size); }',
                        [size],
                    );
                    await assertNoDocumentOverflow(browser, width);
                    assert.equal(
                        await browser.evaluate(
                            "getComputedStyle(document.body).fontSize",
                        ),
                        size,
                    );
                    const contained = await browser.evaluate(`(() => {
                    const paragraph = document.querySelector('[data-fixture-paragraph]');
                    return paragraph.scrollWidth <= paragraph.clientWidth + 1;
                })()`);
                    assert.ok(
                        contained,
                        `Long text wraps with ${loaded ? "Orbitron" : "fallback"} at ${width}px and ${size}`,
                    );
                }
            }
        }
    },
);
