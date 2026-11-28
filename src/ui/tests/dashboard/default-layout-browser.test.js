import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { findChromium, launchChromium } from "../integration/chromium.js";
import { serveBrowserFixture } from "../integration/fixture-server.js";

const enabled = process.env.COGNIS_BROWSER_TESTS === "1";
const executable = enabled ? findChromium() : null;
const skip = !enabled
    ? "Enable COGNIS_BROWSER_TESTS=1 for layout rendering checks."
    : !executable
      ? "Chromium is unavailable."
      : false;
const accountLabels = {
    en: "Account",
    de: "Konto",
    id: "Akun",
    ja: "アカウント",
};
const savedLayout = JSON.parse(
    await readFile(
        new URL("./fixtures/saved-layout.json", import.meta.url),
        "utf8",
    ),
);
for (const saved of [false, true]) {
    for (const language of ["en", "de", "id", "ja"]) {
        test(
            `${saved ? "saved" : "default"} dashboard cards fit viewport and font changes in ${language}`,
            { skip },
            async (context) => {
                const server = await serveBrowserFixture(
                    fileURLToPath(new URL("./fixtures/", import.meta.url)),
                    {
                        apiResponses: {
                            "/api/v1/ui/page-extensions/dashboard": {
                                data: [],
                            },
                            "/api/v1/social/users/fixture/preferences/dashboard-layout":
                                {
                                    data: {
                                        layoutJson: saved
                                            ? JSON.stringify(savedLayout)
                                            : null,
                                    },
                                },
                        },
                    },
                );
                context.after(() => server.close());
                const browser = await launchChromium(executable);
                context.after(() => browser.close());
                await browser.command("Page.navigate", {
                    url: `${server.url}?lang=${language}`,
                });
                await browser.waitFor("Boolean(window.fixture)");
                assert.equal(
                    await browser.evaluate("window.fixture.error ?? null"),
                    null,
                );
                await browser.waitFor(
                    "document.querySelectorAll('[data-composer-element]').length === 7",
                );
                assert.equal(
                    await browser.evaluate(
                        `document.querySelector('[data-composer-element="account-info"] h3').textContent`,
                    ),
                    accountLabels[language],
                    "Selected locale is rendered",
                );
                for (const fontSize of [16, 20]) {
                    for (const [width, height] of [
                        [320, 568],
                        [390, 844],
                        [768, 1024],
                        [844, 390],
                        [1024, 768],
                        [1440, 900],
                        [1860, 540],
                    ]) {
                        await browser.resize(width, height);
                        await browser.evaluate(
                            `document.documentElement.style.fontSize = '${fontSize}px'; new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))`,
                        );
                        const result = await browser.evaluate(`(() => {
                    const brand = document.querySelector('.dashboard-app-icon-name');
                    const range = document.createRange(); range.selectNodeContents(brand);
                    const brandLines = new Set([...range.getClientRects()].map(rect => rect.top)).size;
                    const cards = [...document.querySelectorAll('.widget-card[data-composer-element]')].map(card => {
                        const bounds = card.getBoundingClientRect();
                        return { id:card.dataset.composerElement, left:bounds.left, right:bounds.right, width:card.clientWidth, scrollWidth:card.scrollWidth };
                    });
                    return { brandLines, cards, documentWidth: document.documentElement.scrollWidth };
                })()`);
                        const label = `${language} ${width}px font ${fontSize}px`;
                        assert.equal(
                            result.brandLines,
                            1,
                            `${label}: brand stays whole`,
                        );
                        assert.ok(
                            result.documentWidth <= width + 1,
                            `${label}: document fits`,
                        );
                        for (const card of result.cards) {
                            assert.ok(
                                card.left >= -1 && card.right <= width + 1,
                                `${label}: ${card.id} is contained`,
                            );
                            assert.ok(
                                card.scrollWidth <= card.width + 1,
                                `${label}: ${card.id} has no horizontal overflow (${card.scrollWidth}/${card.width})`,
                            );
                        }
                    }
                }
                await browser.evaluate("window.fixture.lifetime.abort()");
            },
        );
    }
}
