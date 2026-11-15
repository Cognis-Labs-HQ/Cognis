import { captureScreenshot } from "./artifacts.js";
import test from "node:test";
import assert from "node:assert/strict";
import {
    liveBrowserSkip as skip,
    startLiveApp,
    settleLivePage as settle,
} from "./live-app.js";

const pages = [
    "/dashboard",
    "/calendar",
    "/messages",
    "/profile/admin",
    "/settings",
    "/users",
    "/administration",
    "/administration/modules",
    "/docs",
    "/changelogs",
    "/license",
    "/error",
    "/shares",
    "/my-classes",
];

test(
    "built-in pages fit phones, tablets and desktop through direct and SPA navigation",
    { skip, timeout: 600000 },
    async (context) => {
        const { browser, origin } = await startLiveApp(context);
        for (const [width, height] of [
            [320, 568],
            [390, 844],
            [568, 320],
            [844, 390],
            [768, 1024],
            [1024, 768],
            [1440, 900],
            [1920, 1080],
        ]) {
            await browser.resize(width, height);
            for (const path of pages)
                await context.test(`${path} at ${width}px`, async () => {
                    await browser.command("Page.navigate", {
                        url: new URL(path, origin).href,
                    });
                    await settle(browser);
                    const result = await browser.evaluate(
                        `({path:location.pathname,width:document.documentElement.scrollWidth,cards:document.querySelectorAll('[data-composer-element]').length,toasts:[...document.querySelectorAll('.toast')].map(element=>element.textContent)})`,
                    );
                    assert.ok(
                        path === "/docs"
                            ? result.path.startsWith("/docs")
                            : result.path === path,
                        `Requested ${path}, mounted ${result.path}`,
                    );
                    assert.ok(
                        result.width <= width + 1,
                        `${path} fits ${width}px`,
                    );
                    assert.ok(result.cards > 0, "Page has mounted content");
                    assert.deepEqual(
                        result.toasts,
                        [],
                        "Page mount does not raise an error toast",
                    );
                    if (path === "/administration" && width <= 640) {
                        const rows = await browser.evaluate(
                            `[...document.querySelectorAll('.module-row > summary')].map(summary=>{const title=summary.querySelector('.collapsible-section-title').getBoundingClientRect();const controls=summary.querySelector('.module-row-controls').getBoundingClientRect();return {bottom:title.bottom,top:controls.top}})`,
                        );
                        assert.ok(
                            rows.length > 0,
                            "Real gateway controls are present",
                        );
                        for (const row of rows)
                            assert.ok(
                                row.top >= row.bottom,
                                "Gateway controls sit below the title",
                            );
                    }
                    if (path === "/error") {
                        const code = await browser.evaluate(
                            `(()=>{const element=document.querySelector('.error-code');return{width:element.getBoundingClientRect().width,parent:element.parentElement.clientWidth,height:element.getBoundingClientRect().height,font:parseFloat(getComputedStyle(element).fontSize)}})()`,
                        );
                        assert.ok(
                            code.width <= code.parent + 1 &&
                                code.height <= code.font * 1.1,
                            "Error code fits one line",
                        );
                    }
                    if (path === "/calendar" && width <= 640) {
                        const buttons = await browser.evaluate(
                            `Array.from(document.querySelectorAll('.calendar-month-day .calendar-day-jump,.calendar-month-day .calendar-all-day-create'),element=>({width:element.getBoundingClientRect().width,height:element.getBoundingClientRect().height}))`,
                        );
                        assert.ok(
                            buttons.length > 0,
                            "Month controls are rendered",
                        );
                        for (const button of buttons)
                            assert.ok(
                                button.width >= 44 && button.height >= 44,
                                "Calendar day controls have usable touch targets",
                            );
                    }
                    await captureScreenshot(
                        browser,
                        `core-${width}-${height}-${path.replaceAll("/", "_")}`,
                    );
                });
            for (const path of ["/settings", "/calendar", "/dashboard"]) {
                await browser.callFunction(
                    `async function(path){const{navigateTo}=await import('/static/reuse/app-router.js');await navigateTo(path);}`,
                    [path],
                );
                await settle(browser);
                assert.equal(
                    await browser.evaluate("location.pathname"),
                    path,
                    "SPA navigation reaches the requested built-in page",
                );
                assert.equal(
                    await browser.evaluate(
                        'document.querySelectorAll(".site-header").length',
                    ),
                    1,
                    "SPA navigation retains one shared header",
                );
            }
        }
    },
);
