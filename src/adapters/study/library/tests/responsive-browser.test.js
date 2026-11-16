import test from "node:test";
import assert from "node:assert/strict";
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
    "Study card reader fits tablet and phone layouts with usable controls and independent body scrolling",
    { skip: !executable, timeout: 60000 },
    async (context) => {
        const server = await serveBrowserFixture(
            fileURLToPath(new URL("./fixtures/responsive", import.meta.url)),
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
            await browser.waitFor("Boolean(window.fixture)");
        } catch (error) {
            throw new Error(
                error.message +
                    JSON.stringify(
                        browser.events
                            .filter(
                                (e) => e.method === "Runtime.exceptionThrown",
                            )
                            .map(
                                (e) =>
                                    e.params.exceptionDetails.exception
                                        ?.description,
                            ),
                    ),
            );
        }
        await browser.command("Emulation.setTouchEmulationEnabled", {
            enabled: true,
            maxTouchPoints: 1,
        });
        await browser.evaluate("window.fixture.open()");
        await browser.waitFor(
            'Boolean(document.querySelector(".popup-overlay--visible"))',
        );
        for (const [width, height] of [
            [253, 600],
            [390, 844],
            [699, 431],
            [768, 1024],
            [1024, 768],
            [1440, 900],
        ]) {
            await browser.resize(width, height);
            const state = await browser.evaluate(
                `(()=>{const dialog=document.querySelector('.popup-dialog');return{dialog:dialog.getBoundingClientRect().toJSON(),overflow:document.documentElement.scrollWidth-innerWidth,bodyOverflow:document.querySelector('.popup-body').scrollWidth-document.querySelector('.popup-body').clientWidth,buttons:[...dialog.querySelectorAll('button')].filter(e=>e.checkVisibility()).map(e=>e.getBoundingClientRect().toJSON()),title:document.querySelector('.popup-title').textContent,body:document.querySelector('.popup-body').textContent}})()`,
            );
            assert.ok(
                state.dialog.left >= 0 &&
                    state.dialog.right <= width &&
                    state.dialog.top >= 0 &&
                    state.dialog.bottom <= height,
            );
            assert.ok(state.overflow <= 1 && state.bodyOverflow <= 1);
            assert.equal(state.title, "北");
            assert.ok(state.body.includes("Similar Items"));
            if (width <= 900)
                for (const button of state.buttons)
                    assert.ok(
                        button.width >= 44 && button.height >= 44,
                        "Tablet controls retain touch targets",
                    );
            await captureScreenshot(
                browser,
                `study-card-reader-${width}-${height}`,
            );
        }
        await browser.resize(699, 431);
        await browser.evaluate(
            `document.querySelector('.popup-body').append(...Array.from({length:30},()=>document.querySelector('.library-detail').cloneNode(true)))`,
        );
        const scroll = await browser.evaluate(
            `(()=>{const body=document.querySelector('.popup-body');body.scrollTop=body.scrollHeight;return{scroll:body.scrollTop,footer:document.querySelector('.popup-footer').getBoundingClientRect().toJSON(),header:document.querySelector('.popup-header').getBoundingClientRect().toJSON()}})()`,
        );
        assert.ok(scroll.scroll > 0);
        assert.ok(
            scroll.footer.bottom <= 431 && scroll.header.top >= 0,
            "Card navigation stays visible while long content scrolls",
        );
        await browser.command("Input.dispatchKeyEvent", {
            type: "keyDown",
            key: "Escape",
            code: "Escape",
            windowsVirtualKeyCode: 27,
        });
        await browser.waitFor(
            '!document.querySelector(".popup-overlay--visible")',
        );
    },
);
