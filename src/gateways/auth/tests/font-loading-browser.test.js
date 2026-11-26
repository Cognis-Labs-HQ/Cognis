import assert from "node:assert/strict";
import test from "node:test";
import { fileURLToPath } from "node:url";
import {
    findChromium,
    launchChromium,
} from "../../../ui/tests/integration/chromium.js";
import { serveBrowserFixture } from "../../../ui/tests/integration/fixture-server.js";
import { captureScreenshot } from "../../../ui/tests/integration/artifacts.js";

const executable = process.env.COGNIS_BROWSER_TESTS === "1" && findChromium();
const skip = executable
    ? false
    : "Enable COGNIS_BROWSER_TESTS=1 with Chromium installed.";

for (const language of ["en", "de", "id", "ja"]) {
    test(
        `authentication contains late-loading fonts in ${language}`,
        { skip },
        async (context) => {
            const server = await serveBrowserFixture(
                fileURLToPath(
                    new URL("./fixtures/font-loading/", import.meta.url),
                ),
                {
                    staticRoots: {
                        "/static/gateways/auth/": fileURLToPath(
                            new URL("../ui/", import.meta.url),
                        ),
                    },
                },
            );
            context.after(() => server.close());
            const browser = await launchChromium(executable);
            context.after(() => browser.close());
            await browser.resize(360, 740);
            await browser.command("Page.navigate", {
                url: `${server.url}/?lang=${language}`,
            });
            await browser.waitFor("Boolean(window.fixture)");
            assert.equal(
                await browser.evaluate("window.fixture.error ?? null"),
                null,
            );
            assert.equal(
                await browser.evaluate(
                    'document.fonts.check("16px Orbitron") && [...document.fonts].some(font => font.family === "Orbitron")',
                ),
                false,
            );
            for (const loaded of [false, true]) {
                if (loaded) {
                    await browser.evaluate("window.fixture.loadFont()");
                    assert.equal(
                        await browser.evaluate(
                            '[...document.fonts].some(font => font.family === "Orbitron" && font.status === "loaded")',
                        ),
                        true,
                    );
                }
                for (const width of [320, 360, 640, 768, 1280]) {
                    await browser.resize(width, 740);
                    await browser.command(
                        "Emulation.setDeviceMetricsOverride",
                        {
                            width,
                            height: 740,
                            deviceScaleFactor: 1,
                            mobile: width <= 640,
                        },
                    );
                    for (const fontSize of ["12pt", "18pt"]) {
                        await browser.callFunction(
                            'function(size) { document.documentElement.style.setProperty("--app-font-size", size); }',
                            [fontSize],
                        );
                        const metrics = await browser.evaluate(`(() => ({
                        width: document.documentElement.scrollWidth,
                        fontSize: getComputedStyle(document.body).fontSize,
                        links: [...document.querySelectorAll('.auth-footer a')].map(link => {
                            const bounds = link.getBoundingClientRect();
                            return { left: bounds.left, right: bounds.right, width: bounds.width, visible: link.clientWidth >= link.scrollWidth - 1 };
                        }),
                        labels: [...document.querySelectorAll('.sso-login-btn__label')].map(label => label.clientWidth >= label.scrollWidth - 1),
                    }))()`);
                        assert.ok(
                            metrics.width <= width + 1,
                            `${loaded ? "Orbitron" : "fallback"} ${language} ${fontSize}: document ${metrics.width}px exceeds ${width}px`,
                        );
                        assert.equal(
                            metrics.fontSize,
                            fontSize === "12pt" ? "16px" : "24px",
                        );
                        assert.equal(metrics.links.length, 3);
                        for (const link of metrics.links)
                            assert.ok(
                                link.left >= 0 &&
                                    link.right <= width + 1 &&
                                    link.width > 0 &&
                                    link.visible,
                                JSON.stringify(link),
                            );
                        assert.ok(
                            metrics.labels.every(Boolean),
                            "Full provider labels remain readable",
                        );
                    }
                }
                await browser.resize(360, 740);
                await browser.evaluate(
                    'document.documentElement.style.setProperty("--app-font-size", "12pt")',
                );
                await captureScreenshot(
                    browser,
                    `auth-font-${language}-${loaded ? "loaded" : "fallback"}`,
                );
            }
        },
    );
}
