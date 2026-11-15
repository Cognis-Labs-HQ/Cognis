import test from "node:test";
import assert from "node:assert/strict";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { resolve } from "node:path";
import { findChromium, launchChromium } from "./chromium.js";

const origin = process.env.COGNIS_CORE_BROWSER_URL;
const credentialsFile = process.env.COGNIS_BROWSER_CREDENTIALS;
const executable =
    process.env.COGNIS_BROWSER_TESTS === "1" ? findChromium() : null;
const skip =
    !executable || !origin || !credentialsFile
        ? "Requires COGNIS_BROWSER_TESTS=1, Chromium, COGNIS_CORE_BROWSER_URL and COGNIS_BROWSER_CREDENTIALS for an isolated Cognis instance."
        : false;
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

async function settle(browser) {
    await browser.waitFor(
        'document.readyState === "complete" && Boolean(document.body)',
    );
    await browser.waitFor(
        'document.body?.dataset.pageReady === "true" || Boolean(document.querySelector(".tutorial-actions,.popup-close-btn"))',
    );
    for (let attempt = 0; attempt < 60; attempt++) {
        const active = await browser.evaluate(`(() => {
      const close = document.querySelector('.popup-close-btn');
      if(close) { close.click(); return true; }
      const next = document.querySelector('.tutorial-actions [data-action="next"]');
      if(next) { next.click(); return true; }
      return document.body?.dataset.pageReady !== 'true';
    })()`);
        if (!active) break;
        await browser.evaluate(
            "new Promise(resolve => setTimeout(resolve, 100))",
        );
    }
    await browser.waitFor(
        'document.body?.dataset.pageReady === "true" && !document.querySelector(".tutorial-actions,.popup-overlay") && Boolean(document.querySelector("[data-composer-element]"))',
    );
    await browser.evaluate("document.fonts.ready");
    await browser.evaluate(
        "new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))",
    );
}

test(
    "built-in pages fit phones, tablets and desktop through direct and SPA navigation",
    { skip, timeout: 240000 },
    async (context) => {
        const browser = await launchChromium(executable);
        context.after(() => browser.close());
        const credentials = JSON.parse(await readFile(credentialsFile, "utf8"));
        await browser.command("Page.navigate", {
            url: new URL("/login", origin).href,
        });
        await browser.waitFor(
            'Boolean(document.querySelector("#login-username"))',
        );
        await browser.evaluate(`(async()=>{
    const response=await fetch('/api/v1/auth/login',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(${JSON.stringify(credentials)})});
    if(!response.ok) throw new Error('Core browser QA authentication failed');
    const {persistLoginSession}=await import('/static/gateways/auth/login-client.js');
    persistLoginSession((await response.json()).data);
  })()`);
        for (const [width, height] of [
            [320, 568],
            [390, 844],
            [768, 1024],
            [1440, 900],
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
                    const directory = process.env.COGNIS_BROWSER_ARTIFACTS;
                    if (directory) {
                        await mkdir(directory, { recursive: true });
                        const shot = await browser.command(
                            "Page.captureScreenshot",
                            { format: "png" },
                        );
                        await writeFile(
                            resolve(
                                directory,
                                `core-${width}-${path.replaceAll("/", "_")}.png`,
                            ),
                            Buffer.from(shot.data, "base64"),
                        );
                    }
                });
            for (const path of ["/settings", "/calendar", "/dashboard"]) {
                await browser.evaluate(
                    `(async()=>{const{navigateTo}=await import('/static/reuse/app-router.js');await navigateTo(${JSON.stringify(path)});})()`,
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
