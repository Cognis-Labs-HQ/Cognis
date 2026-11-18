import test from "node:test";
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import { serveBrowserFixture } from "../../../ui/tests/integration/fixture-server.js";
import {
    findChromium,
    launchChromium,
} from "../../../ui/tests/integration/chromium.js";
import { captureScreenshot } from "../../../ui/tests/integration/artifacts.js";

const executable =
    process.env.COGNIS_BROWSER_TESTS === "1" ? findChromium() : null;

async function startNavigation(context, suffix = "") {
    const server = await serveBrowserFixture(
        fileURLToPath(new URL("./fixtures/navigation/", import.meta.url)),
        {
            staticRoots: {
                "/static/gateways/study/": fileURLToPath(
                    new URL("../ui/", import.meta.url),
                ),
            },
        },
    );
    context.after(() => server.close());
    const browser = await launchChromium(executable);
    context.after(() => browser.close());
    await browser.resize(390, 844);
    await browser.command("Page.navigate", { url: server.url + suffix });
    await browser.waitFor("Boolean(window.fixture)");
    await browser.evaluate("document.fonts.ready");
    return { browser, server };
}

test(
    "Study language labels fit their available space and only languages retain the green treatment",
    {
        skip: !executable && "Requires COGNIS_BROWSER_TESTS=1 and Chromium",
        timeout: 120000,
    },
    async (context) => {
        const { browser } = await startNavigation(context);
        for (const [width, mode] of [
            [300, "name"],
            [184, "code"],
            [152, "flag"],
            [300, "name"],
        ]) {
            await context.test(`${width}px ${mode}`, async () => {
                await browser.callFunction(
                    `function(width) { document.querySelector('.study-page-subnav').style.width = width + 'px'; }`,
                    [width],
                );
                await browser.waitFor(
                    `document.querySelector('.study-subnav-language-options').dataset.languageDisplay === '${mode}'`,
                );
                const result = await browser.evaluate(`(() => {
                const list = document.querySelector('.study-subnav-language-options');
                const link = list.querySelector('a');
                return { label: link.getAttribute('aria-label'), title: link.title, overflow: list.scrollWidth - list.clientWidth,
                    name: getComputedStyle(link.querySelector('.study-language-name')).display,
                    code: getComputedStyle(link.querySelector('.study-language-code')).display,
                    flag: getComputedStyle(link.querySelector('.study-language-flag')).display,
                    width: link.getBoundingClientRect().width, height: link.getBoundingClientRect().height };
            })()`);
                assert.equal(result.label, "Japanese");
                assert.equal(result.title, "Japanese");
                assert.ok(result.overflow <= 1);
                assert.ok(result.width >= 44 && result.height >= 44);
                assert.equal(result.name === "none", mode !== "name");
                assert.equal(result.code === "none", mode !== "code");
                assert.notEqual(result.flag, "none");
                await captureScreenshot(
                    browser,
                    `study-language-${width}-${mode}`,
                );
            });
        }
        const styles =
            await browser.evaluate(`Array.from(document.querySelectorAll('.study-subnav-modules a'), link => {
        const style = getComputedStyle(link); return { width: style.borderBottomWidth, style: style.borderBottomStyle, color: style.borderBottomColor };
    })`);
        assert.equal(styles.length, 3);
        for (const style of styles) assert.deepEqual(style, styles[0]);
        assert.equal(styles[0].width, "2px");
        await browser.evaluate(
            `document.querySelector('.study-subnav-modules a:last-child').classList.add('active')`,
        );
        const activeColor = await browser.evaluate(
            `getComputedStyle(document.querySelector('.study-subnav-modules a:last-child')).borderBottomColor`,
        );
        assert.notEqual(activeColor, styles[0].color);
        const treatment = await browser.evaluate(`(() => {
            const page = getComputedStyle(document.querySelector('.study-subnav-modules a.active'));
            const language = getComputedStyle(document.querySelector('[data-language-code="ja"].active'));
            return { pageColor: page.color, pageIndicator: page.borderBottomColor, pageBackground: page.backgroundColor,
                languageIndicator: language.borderBottomColor, languageBackground: language.backgroundColor };
        })()`);
        assert.equal(treatment.pageIndicator, treatment.pageColor);
        assert.equal(treatment.pageBackground, "rgba(0, 0, 0, 0)");
        assert.notEqual(treatment.languageIndicator, treatment.pageIndicator);
        assert.notEqual(treatment.languageBackground, treatment.pageBackground);
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
        const focusStyle = await browser.evaluate(`(() => {
            const link = document.querySelector('.study-subnav-modules a');
            link.focus();
            const style = getComputedStyle(link);
            return { width: style.borderBottomWidth, color: style.borderBottomColor, outline: style.outlineStyle, transform: style.transform };
        })()`);
        assert.equal(focusStyle.width, "2px");
        assert.equal(focusStyle.color, activeColor);
        assert.equal(focusStyle.outline, "solid");
        assert.equal(focusStyle.transform, "none");
        await browser.callFunction(
            `function(width) { document.querySelector('.study-page-subnav').style.width = width + 'px'; }`,
            [152],
        );
        await browser.waitFor(
            `document.querySelector('.study-subnav-language-options').dataset.languageDisplay === 'flag'`,
        );
        await browser.evaluate(
            `document.querySelector('[data-language-code="ja"]').click()`,
        );
        const navigations = await browser.evaluate(
            "window.fixture.navigations",
        );
        assert.equal(navigations[0].options.state.studyLanguageCode, "ja");
        await browser.evaluate("window.fixture.lifetime.abort()");
        assert.equal(
            await browser.evaluate(
                `document.querySelector('.study-subnav-language-options').getAttribute('data-language-display')`,
            ),
            null,
        );
    },
);

test(
    "Study navigation adapts for multiple languages, missing flags, touch and larger text",
    {
        skip: !executable && "Requires COGNIS_BROWSER_TESTS=1 and Chromium",
        timeout: 120000,
    },
    async (context) => {
        const { browser } = await startNavigation(context, "?multiple");
        await browser.command("Emulation.setTouchEmulationEnabled", {
            enabled: true,
            maxTouchPoints: 1,
        });
        for (const [width, height] of [
            [253, 600],
            [320, 568],
            [390, 844],
            [768, 1024],
            [1024, 768],
            [1440, 900],
            [1920, 1080],
        ]) {
            for (const fontSize of [16, 24]) {
                await context.test(
                    `${width}x${height} ${fontSize}px`,
                    async () => {
                        await browser.callFunction(
                            `function(size) { document.documentElement.style.fontSize = size + 'px'; }`,
                            [fontSize],
                        );
                        await browser.resize(width, height);
                        const geometry = await browser.evaluate(`(() => {
                    const list = document.querySelector('.study-subnav-language-options');
                    const active = list.querySelector('.active').getBoundingClientRect();
                    const bounds = list.getBoundingClientRect();
                    const links = [...list.querySelectorAll('a')];
                    return { overflow: document.documentElement.scrollWidth - innerWidth,
                        mode: list.dataset.languageDisplay, activeLeft: active.left, activeRight: active.right,
                        left: bounds.left, right: bounds.right,
                        targets: links.map(link => ({ width: link.getBoundingClientRect().width, height: link.getBoundingClientRect().height, label: link.getAttribute('aria-label'), title: link.title })),
                        code: getComputedStyle(list.querySelector('[data-language-code="en"] .study-language-code')).display };
                })()`);
                        assert.ok(
                            geometry.overflow <= 1,
                            JSON.stringify(geometry),
                        );
                        assert.ok(
                            geometry.activeLeft >= geometry.left - 1 &&
                                geometry.activeRight <= geometry.right + 1,
                            "Active language remains visible",
                        );
                        for (const target of geometry.targets) {
                            assert.ok(
                                target.width >= 44 && target.height >= 44,
                            );
                            assert.equal(target.label, target.title);
                            assert.ok(target.label.length > 2);
                        }
                        if (geometry.mode === "flag")
                            assert.notEqual(
                                geometry.code,
                                "none",
                                "A missing flag retains its language code",
                            );
                        await captureScreenshot(
                            browser,
                            `study-navigation-${width}-${fontSize}`,
                        );
                    },
                );
            }
        }
        await browser.evaluate(
            `document.documentElement.style.fontSize='16px'`,
        );
        await browser.resize(1920, 1080);
        await browser.waitFor(
            `document.querySelector('.study-subnav-language-options').dataset.languageDisplay === 'name'`,
        );
        await browser.evaluate("window.fixture.lifetime.abort()");
        await browser.resize(253, 600);
        assert.equal(
            await browser.evaluate(
                `document.querySelector('.study-subnav-language-options').getAttribute('data-language-display')`,
            ),
            null,
        );
    },
);
