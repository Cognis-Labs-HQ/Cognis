import assert from "node:assert/strict";
import { serveBrowserFixture } from "../fixture-server.js";
import { launchChromium, findChromium } from "../chromium.js";
import { captureScreenshot } from "../artifacts.js";

export const workspaceBrowserSkip =
    process.env.COGNIS_BROWSER_TESTS !== "1"
        ? "Requires COGNIS_BROWSER_TESTS=1"
        : !findChromium() && "Requires Chromium";

export async function pressEnter(browser) {
    const key = { key: "Enter", code: "Enter", windowsVirtualKeyCode: 13 };
    await browser.command("Input.dispatchKeyEvent", {
        type: "keyDown",
        text: "\r",
        ...key,
    });
    await browser.command("Input.dispatchKeyEvent", { type: "keyUp", ...key });
}

export async function checkWorkspace(
    context,
    {
        fixtureDirectory,
        staticRoots,
        screenshotPrefix,
        setup,
        verifyViewport,
        afterMatrix,
    },
) {
    const server = await serveBrowserFixture(fixtureDirectory, { staticRoots });
    context.after(() => server.close());
    const browser = await launchChromium(findChromium());
    context.after(() => browser.close());
    await browser.command("Page.navigate", { url: server.url });
    await browser.waitFor("window.fixtureReady===true", { timeoutMs: 20000 });
    await browser.waitFor(
        `(async()=>{const {uiCtx}=await import('/static/reuse/ui-ctx.js');return uiCtx.capabilities.get('ui:pageReadiness').isReady();})()`,
        { timeoutMs: 20000 },
    );
    await browser.evaluate("document.fonts.ready");
    await browser.evaluate(
        'window.originalSidebarToggle=document.querySelector("[data-composer-sidebar-trigger]")',
    );
    await browser.command("Emulation.setTouchEmulationEnabled", {
        enabled: true,
        maxTouchPoints: 1,
    });
    await setup?.(browser);
    const sizes = [
        [253, 600],
        [320, 568],
        [390, 844],
        [568, 320],
        [844, 390],
        [768, 1024],
        [1024, 768],
        [1440, 900],
        [1920, 1080],
    ];
    for (const theme of ["dark", "light"]) {
        await browser.callFunction(
            "function(theme) { document.body.dataset.theme = theme; }",
            [theme],
        );
        for (const [width, height] of sizes) {
            await context.test(`${theme} ${width}x${height}`, async () => {
                await browser.resize(width, height);
                const state = await browser.evaluate(
                    `({width:document.documentElement.scrollWidth,viewport:innerWidth,main:document.querySelector('.main-window').getBoundingClientRect().toJSON(),footer:document.querySelector('.global-footer').getBoundingClientRect().toJSON(),card:document.querySelector('[data-composer-element]').getBoundingClientRect().toJSON()})`,
                );
                assert.ok(state.width <= width + 1, JSON.stringify(state));
                assert.ok(state.main.height > 0);
                assert.equal(
                    await browser.evaluate(
                        `document.querySelector('[data-composer-sidebar-trigger]')===window.originalSidebarToggle && document.querySelector('[data-composer-header]').contains(window.originalSidebarToggle)`,
                    ),
                    true,
                    "Composer retains one sidebar control inside the content header",
                );
                const body = await browser.evaluate(`(() => {
                    const body=document.querySelector('[data-composer-viewport-body]');
                    return {height:body.getBoundingClientRect().height,minimum:20*parseFloat(getComputedStyle(document.documentElement).fontSize)};
                })()`);
                assert.ok(
                    body.height >= body.minimum - 1,
                    JSON.stringify(body),
                );
                if (body.height > body.minimum + 1)
                    assert.ok(
                        state.main.bottom <= height + 1,
                        JSON.stringify(state),
                    );
                else
                    assert.ok(
                        state.main.height >= body.minimum,
                        "Short screens retain the minimum reading area",
                    );
                assert.ok(
                    state.card.bottom <= state.main.bottom + 1,
                    JSON.stringify(state),
                );
                const insets = await browser.evaluate(
                    `(() => {const style=getComputedStyle(document.querySelector('.content-panel > .content-section'));return [style.paddingTop,style.paddingRight,style.paddingBottom,style.paddingLeft]})()`,
                );
                assert.deepEqual(
                    insets,
                    Array(4).fill(width <= 640 ? "14px" : "28px"),
                );
                await verifyViewport(browser, width, height);
                await captureScreenshot(
                    browser,
                    `${screenshotPrefix}-${theme}-${width}-${height}`,
                );
            });
        }
    }
    await afterMatrix(browser);
    await browser.resize(1819, 463);
    const minimumHeight = await browser.evaluate(
        "document.querySelector('.main-window').getBoundingClientRect().height",
    );
    await browser.evaluate(
        "scrollTo(0,document.scrollingElement.scrollHeight);dispatchEvent(new Event('resize'))",
    );
    await browser.evaluate(
        "new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)))",
    );
    assert.ok(
        Math.abs(
            (await browser.evaluate(
                "document.querySelector('.main-window').getBoundingClientRect().height",
            )) - minimumHeight,
        ) <= 1,
        "Scrolling a short page does not expand its fitted workspace",
    );
    assert.ok(
        await browser.evaluate(
            "document.querySelector('[data-composer-element]').getBoundingClientRect().bottom <= document.querySelector('.global-footer').getBoundingClientRect().top + 1",
        ),
        "The full workspace remains reachable above the footer at its minimum height",
    );
    await browser.evaluate("scrollTo(0,0)");
    await browser.resize(320, 568);
    await browser.evaluate('document.documentElement.style.fontSize="24px"');
    await browser.evaluate(
        "new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)))",
    );
    assert.ok(
        await browser.evaluate(
            "document.documentElement.scrollWidth<=innerWidth+1",
        ),
        "Enlarged text fits the content column",
    );
    assert.ok(
        await browser.evaluate(
            "document.querySelector('[data-composer-viewport-body]').getBoundingClientRect().height >= 479",
        ),
        "Enlarged text retains the reading-area minimum",
    );
    await browser.evaluate("window.fixture.composer.destroy()");
    assert.equal(
        await browser.evaluate(
            'document.querySelector(".workspace").style.getPropertyValue("--page-viewport-height")',
        ),
        "",
    );
}
