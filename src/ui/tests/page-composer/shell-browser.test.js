import { captureScreenshot } from "../integration/artifacts.js";
import test from "node:test";
import assert from "node:assert/strict";
import {
    skip,
    startFixture,
    rectangles,
    assertHorizontallyContained,
    assertNoDocumentOverflow,
} from "./reuse/browser.js";

test(
    "mobile shell keeps branding and title on one row and scrolled toolbar controls below the header",
    { skip, timeout: 30000 },
    async (context) => {
        const { browser } = await startFixture(context, "", [320, 568]);
        await browser.evaluate(
            `document.querySelector(".content-panel").style.paddingBottom = "110vh"`,
        );
        for (const [width, height] of [
            [320, 568],
            [390, 844],
            [640, 800],
            [768, 1024],
            [568, 320],
        ]) {
            await browser.resize(width, height);
            await browser.evaluate(
                'window.scrollTo({top:0,behavior:"instant"})',
            );
            const [brand] = await rectangles(browser, ".brandline");
            const [title] = await rectangles(browser, ".page-context h1");
            assert.ok(
                brand.top < title.bottom && title.top < brand.bottom,
                "Brand and title share the first header row",
            );
            if (width <= 640) {
                const [header] = await rectangles(browser, ".site-header");
                assert.ok(
                    header.height <= 132,
                    `Two-row header uses ${header.height}px`,
                );
            }
            const scrolled = await browser.evaluate(`(async () => {
      const toggle = document.querySelector('.toolbar-mobile-toggle');
      const header = document.querySelector('.site-header');
      window.scrollTo({top:toggle.getBoundingClientRect().top + window.scrollY - 24,behavior:'instant'});
      await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
      const box = toggle.getBoundingClientRect();
      const headerBox = header.getBoundingClientRect();
      const hit = document.elementFromPoint(box.left + box.width / 2, Math.max(headerBox.top + 1, Math.min(box.top + box.height / 2, headerBox.bottom - 2)));
      return {covered:header.contains(hit),hit:hit?.className,header:headerBox.toJSON(),toggle:box.toJSON(), overlap:box.top < headerBox.bottom && box.bottom > headerBox.top};
    })()`);
            assert.equal(
                scrolled.overlap,
                true,
                "Scroll brings the toolbar toggle through the sticky header",
            );
            assert.equal(
                scrolled.covered,
                true,
                `Sticky header covers the closed toolbar toggle at ${width}px: ${JSON.stringify(scrolled)}`,
            );
            await captureScreenshot(browser, `shell-scroll-${width}-${height}`);
            await assertNoDocumentOverflow(browser, width);
        }
    },
);

for (const language of ["en", "de", "id", "ja"]) {
    test(
        `mobile tutorials stay readable and compact in ${language}`,
        { skip, timeout: 60000 },
        async (context) => {
            const { browser } = await startFixture(
                context,
                `?lang=${language}`,
                [320, 568],
            );
            await browser.command("Emulation.setTouchEmulationEnabled", {
                enabled: true,
                maxTouchPoints: 5,
            });
            await browser.evaluate("window.fixture.openGuide()");
            await browser.waitFor(
                'document.querySelectorAll(".tutorial-actions button").length === 4',
            );
            for (const [width, height] of [
                [320, 568],
                [390, 844],
                [768, 1024],
                [568, 320],
            ]) {
                await browser.resize(width, height);
                await browser.evaluate(
                    `new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)))`,
                );
                const [menu] = await rectangles(browser, ".tutorial-actions");
                const [panel] = await rectangles(browser, ".tutorial-callout");
                assertHorizontallyContained(menu, width, "Tutorial actions");
                assertHorizontallyContained(
                    panel,
                    width,
                    "Tutorial explanation",
                );
                assert.ok(panel.height > 56, "Explanation remains visible");
                assert.ok(
                    panel.top >= 0 && panel.bottom <= menu.top,
                    "Explanation fits above actions",
                );
                assert.ok(
                    menu.top >= 0 && menu.bottom <= height,
                    "Actions fit viewport",
                );
                if (width <= 640)
                    assert.ok(
                        menu.height <= 100,
                        `Four tutorial actions use ${menu.height}px`,
                    );
                for (const button of await rectangles(
                    browser,
                    ".tutorial-actions button",
                )) {
                    assert.ok(
                        button.width >= 44 && button.height >= 44,
                        "Actions retain 44px touch targets",
                    );
                }
                const styles = await browser.evaluate(`({
        bodySize:parseFloat(getComputedStyle(document.querySelector('.tutorial-body')).fontSize),
        ring:getComputedStyle(document.querySelector('.tutorial-spotlight')).boxShadow,
        background:getComputedStyle(document.querySelector('.tutorial-actions')).backgroundColor,
      })`);
                assert.ok(
                    styles.bodySize >= 16,
                    "Explanation retains readable body text",
                );
                assert.notEqual(
                    styles.ring,
                    "none",
                    "Spotlight has a contrasting outline",
                );
                assert.ok(
                    !styles.background.startsWith("rgba") ||
                        styles.background.endsWith(", 1)"),
                    "Action background is opaque",
                );
                await assertNoDocumentOverflow(browser, width);
                await captureScreenshot(
                    browser,
                    `tutorial-${language}-${width}-${height}`,
                );
            }
            await browser.resize(390, 844);
            await browser.evaluate(
                `document.documentElement.style.setProperty('--app-font-size','24pt')`,
            );
            await browser.evaluate(
                `new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)))`,
            );
            const font = await browser.evaluate(
                `parseFloat(getComputedStyle(document.querySelector('.tutorial-body')).fontSize)`,
            );
            assert.equal(
                font,
                32,
                "User-selected text size survives mobile presentation",
            );
            await assertNoDocumentOverflow(browser, 390);
        },
    );
}

test(
    "browser function arguments remain opaque data",
    { skip, timeout: 30000 },
    async (context) => {
        const { browser } = await startFixture(context);
        const payload = {
            query: "'); document.body.replaceChildren(); //\n\"` ${value} \\ \u2028\u2029 <script>",
            provider: { id: 'quoted"provider' },
        };
        const actual = await browser.callFunction(
            `function(value) {
        const field=document.querySelector('[name="notes"]');
        field.value=value.query;
        return {query:field.value,provider:value.provider};
    }`,
            [payload],
        );
        assert.deepEqual(actual, payload);
        assert.equal(
            await browser.evaluate(
                'document.querySelectorAll("[data-composer-element]").length',
            ),
            2,
        );
    },
);

test(
    "page launcher and Composer sidebar have distinct accessible controls in every compact layout",
    { skip, timeout: 60000 },
    async (context) => {
        const { browser } = await startFixture(context);
        for (const [width, height] of [
            [253, 600],
            [320, 568],
            [390, 844],
            [568, 320],
            [768, 1024],
            [844, 390],
        ]) {
            await browser.resize(width, height);
            await browser.evaluate(
                'document.querySelector("#nav-compact-toggle").click()',
            );
            await browser.waitFor(
                'getComputedStyle(document.querySelector("#nav-launcher")).opacity === "1"',
            );
            const [panel] = await rectangles(browser, "#nav-launcher");
            assertHorizontallyContained(panel, width, "Page switcher");
            assert.ok(
                panel.top >= 0 && panel.bottom <= height,
                "Page switcher fits the visible height",
            );
            const links = await rectangles(
                browser,
                ".nav-launcher-nav a:not([hidden])",
            );
            for (const link of links)
                assert.ok(
                    link.height >= 44,
                    "Page destinations have touch targets",
                );
            await captureScreenshot(
                browser,
                `page-launcher-${width}-${height}`,
            );
            await browser.command("Input.dispatchKeyEvent", {
                type: "keyDown",
                key: "Escape",
                code: "Escape",
                windowsVirtualKeyCode: 27,
            });
            await browser.evaluate(
                'document.querySelector(".toolbar-mobile-toggle").click()',
            );
            const [toggle] = await rectangles(
                browser,
                ".toolbar-mobile-toggle",
            );
            assert.ok(
                toggle.left <= 20 && toggle.top <= 20,
                "Sidebar control stays in the top left while open",
            );
            const icons = await browser.evaluate(
                `({primary:getComputedStyle(document.querySelector('.nav-compact-toggle-icon')).maskImage,sidebar:getComputedStyle(document.querySelector('.toolbar-mobile-toggle-icon')).maskImage})`,
            );
            assert.ok(icons.primary.includes("navigation-pages.svg"));
            assert.ok(icons.sidebar.includes("sidebar-collapse.svg"));
            await captureScreenshot(
                browser,
                `composer-sidebar-${width}-${height}`,
            );
            await browser.command("Input.dispatchKeyEvent", {
                type: "keyDown",
                key: "Escape",
                code: "Escape",
                windowsVirtualKeyCode: 27,
            });
            assert.equal(
                await browser.evaluate(
                    'document.activeElement.classList.contains("toolbar-mobile-toggle")',
                ),
                true,
            );
        }
    },
);

test(
    "header and footer share the same outer edges on phones, tablets and desktop",
    { skip, timeout: 30000 },
    async (context) => {
        const { browser } = await startFixture(context);
        await browser.evaluate(
            'document.querySelector(".content-panel").style.paddingBottom="110vh"',
        );
        for (const [width, height] of [
            [253, 600],
            [320, 568],
            [390, 844],
            [768, 1024],
            [1024, 768],
            [1440, 900],
            [1920, 1080],
        ]) {
            await browser.resize(width, height);
            const [header] = await rectangles(browser, ".site-header");
            const [footer] = await rectangles(browser, ".global-footer");
            assert.ok(
                Math.abs(header.left - footer.left) <= 1 &&
                    Math.abs(header.right - footer.right) <= 1,
                `Header and footer edges match at ${width}px`,
            );
        }
    },
);
