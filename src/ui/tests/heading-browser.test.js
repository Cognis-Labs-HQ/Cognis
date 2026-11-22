import test from "node:test";
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import { findChromium, launchChromium } from "./integration/chromium.js";
import { serveBrowserFixture } from "./integration/fixture-server.js";

const enabled = process.env.COGNIS_BROWSER_TESTS === "1";
const executable = enabled ? findChromium() : null;
const skip = !enabled
    ? "Set COGNIS_BROWSER_TESTS=1 for actual heading layout and keyboard coverage."
    : !executable
      ? "Chromium is unavailable."
      : false;

test(
    "shared headings in a grid-label host remain inline across widths and text zoom",
    { skip, timeout: 90000 },
    async (context) => {
        const server = await serveBrowserFixture(
            fileURLToPath(new URL("../../../", import.meta.url)),
        );
        context.after(() => server.close());
        const browser = await launchChromium(executable);
        context.after(() => browser.close());
        await browser.command("Page.navigate", {
            url: `${server.url}/src/ui/tests/fixtures/required-headings/index.html`,
        });
        await browser.waitFor("Boolean(window.fixture)");
        assert.equal(
            await browser.evaluate("window.fixture.error ?? null"),
            null,
        );
        assert.equal(
            await browser.evaluate(
                "getComputedStyle(document.querySelector('.form-builder-label-heading')).whiteSpace",
            ),
            "nowrap",
        );
        for (let mount = 0; mount < 3; mount++) {
            if (mount) await browser.evaluate("window.fixture.mount()");
            await browser.evaluate(`(() => {
            const controller = window.fixture.controller;
            for (const name of ['longEnglish', 'longGerman', 'japanese', 'indonesian', 'consent', 'choice', 'radio', 'secret']) {
                controller.setFieldRequired(name, false);
                controller.setFieldRequired(name, true);
                controller.setFieldRequired(name, true);
            }
            document.querySelector('[name="longEnglish"]').value = 'retained value';
            document.querySelector('[name="longEnglish"]').focus();
        })()`);
            for (const theme of ["light", "dark"]) {
                for (const textScale of [1, 2]) {
                    await browser.evaluate(
                        `document.body.dataset.theme = '${theme}'; document.documentElement.style.fontSize = '${textScale * 100}%'`,
                    );
                    for (const width of [320, 390, 768, 1440]) {
                        await browser.resize(width, 900);
                        const state = await browser.evaluate(`(() => {
                        const headings = Array.from(document.querySelectorAll('.form-builder-label-heading'), heading => {
                            const flag = heading.querySelector('[data-form-builder-required]');
                            const walker = document.createTreeWalker(heading, NodeFilter.SHOW_TEXT);
                            let last;
                            while (walker.nextNode()) if (!flag.contains(walker.currentNode) && walker.currentNode.textContent.trim()) last = walker.currentNode;
                            const range = document.createRange();
                            range.setStart(last, last.length - 1);
                            range.setEnd(last, last.length);
                            const text = range.getBoundingClientRect();
                            const marker = flag.getBoundingClientRect();
                            const bounds = heading.getBoundingClientRect();
                            return { count: heading.querySelectorAll('[data-form-builder-required]').length,
                                textTop: text.top, textBottom: text.bottom, markerTop: marker.top, markerBottom: marker.bottom,
                                width: heading.clientWidth, scroll: heading.scrollWidth, right: bounds.right };
                        });
                        return { headings, scroll: document.documentElement.scrollWidth,
                            value: document.querySelector('[name="longEnglish"]').value,
                            active: document.activeElement.name };
                    })()`);
                        const scenario = `${mount}/${theme}/${textScale}/${width}`;
                        assert.equal(state.headings.length, 9, scenario);
                        for (const heading of state.headings) {
                            assert.equal(heading.count, 1, scenario);
                            assert.ok(
                                heading.markerTop < heading.textBottom &&
                                    heading.markerBottom > heading.textTop,
                                `Marker shares final text line: ${scenario}`,
                            );
                            assert.ok(
                                heading.scroll <= heading.width + 1,
                                `Heading does not overflow: ${scenario}`,
                            );
                        }
                        assert.ok(
                            state.scroll <= width + 1,
                            `Document does not overflow: ${scenario}`,
                        );
                        assert.equal(state.value, "retained value");
                        assert.equal(state.active, "longEnglish");
                    }
                }
            }
            await browser.evaluate(
                `document.querySelector('[name="longEnglish"]').focus()`,
            );
            await browser.command("Input.dispatchKeyEvent", {
                type: "keyDown",
                key: "Tab",
                code: "Tab",
                windowsVirtualKeyCode: 9,
            });
            await browser.command("Input.dispatchKeyEvent", {
                type: "keyUp",
                key: "Tab",
                code: "Tab",
                windowsVirtualKeyCode: 9,
            });
            assert.equal(
                await browser.evaluate("document.activeElement.name"),
                "longGerman",
            );
            assert.equal(
                await browser.evaluate(`(() => {
            const input = document.querySelector('[name="password"]');
            return input.labels.length === 1 && input.labels[0].querySelector('.form-builder-label-heading') !== null && !input.checkValidity();
        })()`),
                true,
            );
        }
    },
);
