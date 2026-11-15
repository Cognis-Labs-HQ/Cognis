import { captureScreenshot as capture } from "../../../ui/tests/integration/artifacts.js";
import test from "node:test";
import assert from "node:assert/strict";
import {
    liveBrowserSkip,
    startLiveApp,
    settleLivePage,
} from "../../../ui/tests/integration/live-app.js";

const enabled = process.env.COGNIS_STUDY_BROWSER_TESTS === "1";
const skip =
    liveBrowserSkip ||
    (!enabled &&
        "Requires COGNIS_STUDY_BROWSER_TESTS=1 and a populated isolated Study instance.");
const viewports = [
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
const pages = [
    "/study",
    "/study/settings",
    "/study/library",
    "/study/explore",
    "/study/library/requests",
    "/study/flashcards",
    "/study/ja/flashcards",
    "/study/leaderboard",
];

test(
    "populated core Study pages keep compact usable navigation through every layout",
    { skip, timeout: 360000 },
    async (context) => {
        const { browser, origin } = await startLiveApp(context);
        for (const [width, height] of viewports) {
            await browser.resize(width, height);
            for (const path of pages)
                await context.test(`${path} ${width}x${height}`, async () => {
                    await browser.command("Page.navigate", {
                        url: new URL(path, origin).href,
                    });
                    await settleLivePage(browser);
                    const geometry = await browser.evaluate(`(()=>{
    const header=document.querySelector('.site-header');const subnav=document.querySelector('.study-page-subnav');const tabs=document.querySelector('.study-subnav-modules');
    return {path:location.pathname,overflow:document.documentElement.scrollWidth-innerWidth,subnavCount:document.querySelectorAll('.study-page-subnav').length,
     height:subnav?.getBoundingClientRect().height,header:header?.getBoundingClientRect().height,
     secondRow:[...subnav.querySelectorAll(".study-subnav-language-options,.study-subnav-settings,.study-dictionary-toggle")].filter(e=>e.getBoundingClientRect().height>0).map(e=>({top:e.getBoundingClientRect().top,bottom:e.getBoundingClientRect().bottom})),
     tabBounds:tabs?[...tabs.querySelectorAll('a')].map(e=>({top:e.getBoundingClientRect().top,bottom:e.getBoundingClientRect().bottom})):[],
     cards:[...document.querySelectorAll('.study-hub-card-standalone')].map(e=>({width:e.clientWidth,scroll:e.scrollWidth})),
     toasts:[...document.querySelectorAll('.toast--error')].map(e=>e.textContent)};
   })()`);
                    assert.ok(
                        geometry.path.startsWith(path),
                        `Mounted ${geometry.path}, expected ${path}`,
                    );
                    assert.equal(
                        geometry.subnavCount,
                        1,
                        "One shared Study subnav is mounted",
                    );
                    assert.ok(
                        geometry.overflow <= 1,
                        "Document fits the viewport",
                    );
                    assert.deepEqual(
                        geometry.toasts,
                        [],
                        "Mount has no error toast",
                    );
                    assert.ok(
                        geometry.tabBounds.length === 0 ||
                            Math.max(
                                ...geometry.tabBounds.map((tab) => tab.top),
                            ) <
                                Math.min(
                                    ...geometry.tabBounds.map(
                                        (tab) => tab.bottom,
                                    ),
                                ),
                        "Study page links remain on one scrollable line",
                    );
                    if (width <= 900)
                        assert.ok(
                            Math.max(
                                ...geometry.secondRow.map((row) => row.top),
                            ) <
                                Math.min(
                                    ...geometry.secondRow.map(
                                        (row) => row.bottom,
                                    ),
                                ),
                            "Language, dictionary and settings share the second navigation row",
                        );
                    if (path === "/study") {
                        assert.ok(
                            geometry.cards.length > 0,
                            "Populated learning-language cards are mounted",
                        );
                        for (const card of geometry.cards)
                            assert.ok(
                                card.scroll <= card.width + 1,
                                "Hub cards fit their own content area",
                            );
                    }
                    await capture(
                        browser,
                        `study-${width}-${height}-${path.replaceAll("/", "_")}`,
                    );
                });
        }
    },
);

test(
    "mobile dictionary dialog retains the original form, query, provider, focus and lifecycle",
    { skip, timeout: 60000 },
    async (context) => {
        const { browser, origin } = await startLiveApp(context);
        await browser.resize(390, 844);
        await browser.command("Page.navigate", {
            url: new URL("/study", origin).href,
        });
        await settleLivePage(browser);
        const originalProvider = await browser.evaluate(
            'document.querySelector("[data-study-dictionary-search]").elements.provider.value',
        );
        await browser.evaluate(
            `(()=>{const form=document.querySelector('[data-study-dictionary-search]');window.studyOriginalForm=form;form.elements.query.value='Retained mobile query';document.querySelector('.study-dictionary-toggle').click();})()`,
        );
        await browser.waitFor(
            'Boolean(document.querySelector(".popup-overlay--visible [data-study-dictionary-search]"))',
        );
        assert.equal(
            await browser.evaluate(
                'document.querySelector(".popup-overlay [data-study-dictionary-search]") === window.studyOriginalForm',
            ),
            true,
        );
        assert.equal(
            await browser.evaluate(
                "document.activeElement === window.studyOriginalForm.elements.query",
            ),
            true,
        );
        await browser.command("Input.dispatchKeyEvent", {
            type: "keyDown",
            key: "Escape",
            code: "Escape",
            windowsVirtualKeyCode: 27,
        });
        await browser.waitFor('!document.querySelector(".popup-overlay")');
        assert.deepEqual(
            await browser.evaluate(
                `({same:document.querySelector('.study-subnav-search-slot form')===window.studyOriginalForm,value:window.studyOriginalForm.elements.query.value,focus:document.activeElement.classList.contains('study-dictionary-toggle')})`,
            ),
            { same: true, value: "Retained mobile query", focus: true },
        );
        assert.equal(
            await browser.evaluate(
                "window.studyOriginalForm.elements.provider.value",
            ),
            originalProvider,
            "Closing preserves the selected dictionary provider",
        );
        await browser.evaluate(
            "document.querySelector('.study-dictionary-toggle').click()",
        );
        await browser.waitFor(
            'Boolean(document.querySelector(".popup-overlay--visible"))',
        );
        await browser.resize(1440, 900);
        await browser.waitFor('!document.querySelector(".popup-overlay")');
        assert.equal(
            await browser.evaluate(
                "window.studyOriginalForm.elements.query.value",
            ),
            "Retained mobile query",
        );
        await browser.resize(390, 844);
        await browser.evaluate(
            "document.querySelector('.study-dictionary-toggle').click()",
        );
        await browser.waitFor(
            'Boolean(document.querySelector(".popup-overlay--visible"))',
        );
        await browser.callFunction(
            `async function(){const{navigateTo}=await import('/static/reuse/app-router.js');await navigateTo('/dashboard');}`,
        );
        await settleLivePage(browser);
        assert.equal(
            await browser.evaluate(
                'document.querySelectorAll(".popup-overlay").length',
            ),
            0,
            "Leaving Study closes its dialog",
        );
    },
);

test(
    "Study scroll keeps primary navigation available and selected tabs reachable",
    { skip, timeout: 60000 },
    async (context) => {
        const { browser, origin } = await startLiveApp(context);
        await browser.resize(320, 568);
        await browser.command("Page.navigate", {
            url: new URL("/study/library/requests", origin).href,
        });
        await settleLivePage(browser);
        const state =
            await browser.evaluate(`(async()=>{document.activeElement?.blur();document.querySelector('.content-panel').style.paddingBottom='120vh';scrollTo({top:180,behavior:'instant'});await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
 const nav=document.querySelector('.global-navrow'),topbar=document.querySelector('.global-topbar'),tabs=document.querySelector('.study-subnav-modules'),active=tabs.querySelector('.active');
 return{nav:getComputedStyle(nav).visibility,topbar:getComputedStyle(topbar).visibility,header:document.querySelector('.site-header').getBoundingClientRect().height,active:active?.getBoundingClientRect().toJSON(),tabs:tabs.getBoundingClientRect().toJSON()};})()`);
        assert.equal(
            state.nav,
            "visible",
            "Primary navigation remains available after scroll",
        );
        assert.equal(
            state.topbar,
            "hidden",
            "Brand row yields space to page content",
        );
        assert.ok(
            state.active &&
                state.active.left >= state.tabs.left - 1 &&
                state.active.right <= state.tabs.right + 1,
            "Selected page tab is scrolled into view",
        );
        await capture(browser, "study-scrolled-phone");
    },
);
