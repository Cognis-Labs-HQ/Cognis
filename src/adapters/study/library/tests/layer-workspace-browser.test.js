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
    "Explore layers retain Composer reading minimums while fixed charts keep their authored layout",
    { skip: !executable, timeout: 120000 },
    async (context) => {
        const server = await serveBrowserFixture(
            fileURLToPath(
                new URL("./fixtures/layer-workspace", import.meta.url),
            ),
            {
                staticRoots: {
                    "/static/adapters/study/library/": fileURLToPath(
                        new URL("../ui/", import.meta.url),
                    ),
                    "/static/gateways/study/": fileURLToPath(
                        new URL(
                            "../../../../gateways/study/ui/",
                            import.meta.url,
                        ),
                    ),
                },
            },
        );
        context.after(() => server.close());
        const browser = await launchChromium(executable);
        context.after(() => browser.close());
        await browser.command("Page.navigate", { url: server.url });
        try {
            await browser.waitFor("window.fixtureReady===true", {
                timeoutMs: 20000,
            });
        } catch (error) {
            throw new Error(
                error.message +
                    JSON.stringify(
                        browser.events.filter(
                            (event) =>
                                event.method === "Runtime.exceptionThrown",
                        ),
                    ),
            );
        }
        await browser.callFunction(
            `async function(url) {
            const link=document.createElement('link');
            link.rel='stylesheet';link.href=url;
            const ready=new Promise((resolve,reject)=>{link.onload=resolve;link.onerror=reject});
            document.head.append(link);await ready;
        }`,
            ["/static/gateways/study/study.css"],
        );
        const layers = await browser.evaluate(
            "window.fixture.data.layers.filter(layer=>!layer.grid).map(layer=>layer.id)",
        );
        for (const theme of ["dark", "light"]) {
            await browser.callFunction(
                "function(theme){document.body.dataset.theme=theme}",
                [theme],
            );
            for (const layer of layers) {
                await browser.callFunction(
                    "async function(layer){await window.fixture.showLayer(layer)}",
                    [layer],
                );
                for (const [width, height] of [
                    [253, 600],
                    [390, 844],
                    [844, 390],
                    [768, 1024],
                    [1024, 768],
                    [1440, 900],
                    [1819, 463],
                ]) {
                    await browser.resize(width, height);
                    const geometry = await browser.evaluate(`(()=>{
                    const grid=document.querySelector('[data-composer-viewport-body]');
                    const bounds=grid.getBoundingClientRect();
                    const input=document.querySelector('[data-study-query]').getBoundingClientRect();
                    return {height:bounds.height,width:document.documentElement.scrollWidth,viewport:innerWidth,main:document.querySelector('.main-window').getBoundingClientRect().toJSON(),grid:bounds.toJSON(),controls:input.toJSON(),content:grid.scrollHeight,visible:grid.clientHeight};
                })()`);
                    assert.ok(
                        geometry.width <= width + 1,
                        JSON.stringify(geometry),
                    );
                    assert.ok(geometry.height >= 319, JSON.stringify(geometry));
                    assert.ok(
                        geometry.controls.bottom <= geometry.grid.top + 1,
                        JSON.stringify(geometry),
                    );
                    assert.ok(
                        geometry.content > geometry.visible,
                        "Growing collections scroll within the reading area",
                    );
                    if (geometry.height > 321)
                        assert.ok(
                            geometry.main.bottom <= height + 1,
                            JSON.stringify(geometry),
                        );
                    const finalCard = await browser.evaluate(`(()=>{
                    const grid=document.querySelector('[data-composer-viewport-body]');grid.scrollTop=grid.scrollHeight;
                    const last=[...grid.querySelectorAll('[data-library-entry]')].at(-1).getBoundingClientRect();
                    return {top:last.top,bottom:last.bottom,grid:grid.getBoundingClientRect().toJSON()};
                })()`);
                    assert.ok(
                        finalCard.top >= finalCard.grid.top - 1 &&
                            finalCard.bottom <= finalCard.grid.bottom + 1,
                        JSON.stringify(finalCard),
                    );
                    await captureScreenshot(
                        browser,
                        `study-layer-${layer}-${theme}-${width}-${height}`,
                    );
                }
                await browser.evaluate(
                    `(()=>{const input=document.querySelector('[data-study-query]');input.value='Study item 59';input.dispatchEvent(new Event('input',{bubbles:true}));})()`,
                );
                assert.equal(
                    await browser.evaluate(
                        "[...document.querySelectorAll('[data-library-entry]')].filter(card=>card.getClientRects().length).length",
                    ),
                    1,
                );
                await browser.evaluate(
                    "window.fixture.composer.refreshElements(['study-library-layer'])",
                );
                await browser.resize(390, 844);
                assert.ok(
                    await browser.evaluate(
                        "document.querySelector('[data-composer-viewport-body]').getBoundingClientRect().height>=319",
                    ),
                );
            }
        }
        await browser.evaluate("window.fixture.showLayer('chart')");
        assert.equal(
            await browser.evaluate(
                "document.querySelector('.workspace').classList.contains('app-page--viewport')",
            ),
            false,
        );
        assert.equal(
            await browser.evaluate(
                "getComputedStyle(document.querySelector('.library-entry-grid')).gridTemplateColumns.split(' ').length",
            ),
            5,
        );
        assert.equal(
            await browser.evaluate(
                "document.querySelectorAll('[data-library-entry]').length",
            ),
            60,
        );
        await browser.evaluate("window.fixture.showLayer('layer-0',0)");
        await browser.resize(320, 568);
        assert.ok(
            await browser.evaluate(
                "document.querySelector('[data-composer-viewport-body]').getBoundingClientRect().height>=319",
            ),
        );
        await browser.evaluate(
            "document.documentElement.style.fontSize='24px'",
        );
        await browser.evaluate(
            "new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)))",
        );
        assert.ok(
            await browser.evaluate(
                "document.querySelector('[data-composer-viewport-body]').getBoundingClientRect().height>=479",
            ),
        );
        await browser.evaluate("window.fixture.composer.destroy()");
        assert.equal(
            await browser.evaluate(
                "document.querySelector('.workspace').style.getPropertyValue('--page-viewport-height')",
            ),
            "",
        );
    },
);
