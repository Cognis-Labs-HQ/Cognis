import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { findChromium, launchChromium } from "../integration/chromium.js";
import { serveBrowserFixture } from "../integration/fixture-server.js";
import { captureScreenshot } from "../integration/artifacts.js";

const executable = process.env.COGNIS_BROWSER_TESTS === "1" && findChromium();
const skip = executable
    ? false
    : "Enable COGNIS_BROWSER_TESTS=1 with Chromium installed.";

for (const language of ["en", "de", "id", "ja"]) {
    test(
        `documentation views preserve one versioned bundle in ${language}`,
        { skip, timeout: 60000 },
        async (context) => {
            const directory = fileURLToPath(
                new URL("./fixtures/", import.meta.url),
            );
            const responses = JSON.parse(
                await readFile(
                    new URL("./fixtures/responses.json", import.meta.url),
                    "utf8",
                ),
            );
            const locales = JSON.parse(
                await readFile(
                    new URL("./fixtures/locales.json", import.meta.url),
                    "utf8",
                ),
            );
            const labels = locales[language];
            const heading = (view, version, slug = "example") =>
                JSON.stringify(`${labels[slug]} ${labels[view]} ${version}`);
            const server = await serveBrowserFixture(directory, {
                async apiHandler(_request, response, url) {
                    if (!Object.hasOwn(responses, url.pathname)) return false;
                    const selected =
                        (url.searchParams.get("langs") ?? "en")
                            .split(",")
                            .find((locale) => locales[locale]) ?? "en";
                    const localized = locales[selected];
                    const payload = structuredClone(responses[url.pathname]);
                    if (Array.isArray(payload.data)) {
                        for (const item of payload.data)
                            item.title = localized[item.slug];
                    } else {
                        payload.data.markdown = payload.data.markdown
                            .replaceAll("Example", localized.example)
                            .replaceAll("Other", localized.other)
                            .replaceAll("README", localized.info)
                            .replaceAll("Usage", localized.usage)
                            .replaceAll("Technical", localized.technical)
                            .replaceAll(
                                "Documentation fixture content.",
                                localized.body,
                            );
                    }
                    response.end(JSON.stringify(payload));
                    return true;
                },
            });
            context.after(() => server.close());
            const browser = await launchChromium(executable);
            context.after(() => browser.close());
            await browser.resize(390, 844);
            await browser.command("Page.navigate", {
                url: `${server.url}/?lang=${language}`,
            });
            await browser.waitFor("Boolean(window.fixture)");
            assert.equal(
                await browser.evaluate("window.fixture.error ?? null"),
                null,
            );
            await browser.waitFor(
                `document.querySelector("#doc h1")?.textContent === ${heading("info", "2.0.0", "example")}`,
            );
            assert.equal(
                await browser.evaluate(
                    'document.querySelector("[data-side-menu-item=example]").textContent',
                ),
                labels.example,
            );
            assert.equal(
                await browser.evaluate(
                    'document.querySelector("#doc p").textContent',
                ),
                labels.body,
            );
            assert.ok(
                server.requests.some(
                    (request) =>
                        request.pathname === "/api/v1/docs" &&
                        new URLSearchParams(request.search)
                            .get("langs")
                            .split(",")[0] === language,
                ),
            );
            for (const view of ["usage", "technical"]) {
                await browser.callFunction(
                    'function(view) { document.querySelector(`[data-doc-view="${view}"]`).click(); }',
                    [view],
                );
                await browser.waitFor(
                    `document.querySelector('#doc h1')?.textContent === ${JSON.stringify(`${labels.example} ${labels[view]} 2.0.0`)}`,
                );
                assert.equal(
                    await browser.evaluate(
                        `document.querySelector('[data-doc-view="${view}"]').getAttribute('aria-pressed')`,
                    ),
                    "true",
                );
            }
            await browser.evaluate(
                `document.querySelector('[data-doc-version="1.0.0"]').click()`,
            );
            await browser.waitFor(
                `document.querySelector("#doc h1")?.textContent === ${heading("technical", "1.0.0", "example")}`,
            );
            for (const view of ["usage", "info"]) {
                await browser.callFunction(
                    'function(view) { document.querySelector(`[data-doc-view="${view}"]`).click(); }',
                    [view],
                );
                await browser.waitFor(
                    `document.querySelector('#doc h1')?.textContent === ${heading(view, "1.0.0")}`,
                );
            }
            await browser.evaluate(
                `document.querySelector('#doc a[href="/docs/example/usage"]').click()`,
            );
            await browser.waitFor(
                `document.querySelector("#doc h1")?.textContent === ${heading("usage", "1.0.0", "example")}`,
            );
            await browser.evaluate(
                'document.querySelector("[data-doc-view=info]").click()',
            );
            await browser.waitFor(
                `document.querySelector("#doc h1")?.textContent === ${heading("info", "1.0.0", "example")}`,
            );
            for (const width of [253, 390, 768, 1440]) {
                await browser.resize(width, 844);
                const geometry = await browser.evaluate(
                    `({width:document.documentElement.scrollWidth, buttons:[...document.querySelectorAll('[data-doc-view]')].map(button=>{const bounds=button.getBoundingClientRect();return {left:bounds.left,right:bounds.right,height:bounds.height,label:button.textContent,visible:button.scrollWidth<=button.clientWidth+1}})})`,
                );
                assert.ok(
                    geometry.width <= width + 1,
                    JSON.stringify(geometry),
                );
                assert.equal(geometry.buttons.length, 3);
                for (const button of geometry.buttons)
                    assert.ok(
                        button.left >= 0 &&
                            button.right <= width + 1 &&
                            button.height >= 44 &&
                            button.label.trim() &&
                            button.visible,
                        JSON.stringify(button),
                    );
                await captureScreenshot(browser, `docs-${language}-${width}`);
            }
            for (const suffix of ["", "/usage", "/technical"])
                assert.ok(
                    server.requests.some(
                        (request) =>
                            request.pathname ===
                            `/api/v1/docs/2.0.0/example${suffix}`,
                    ),
                    "Latest navigation pins the index's component version",
                );
            await browser.resize(1440, 900);
            await browser.evaluate(
                'document.querySelector("[data-side-menu-item=other]").click()',
            );
            await browser.waitFor(
                `document.querySelector("#doc h1")?.textContent === ${heading("info", "2.0.0", "other")}`,
            );
            await browser.evaluate("history.back()");
            await browser.waitFor(
                `document.querySelector("#doc h1")?.textContent === ${heading("info", "1.0.0", "example")}`,
            );
            await browser.evaluate("window.fixture.dispose()");
        },
    );
}
