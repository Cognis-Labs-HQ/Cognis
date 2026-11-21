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
    "Profile keeps a readable timeline and drafts across phone, tablet and desktop layouts",
    { skip: !executable, timeout: 120000 },
    async (context) => {
        const server = await serveBrowserFixture(
            fileURLToPath(new URL("./fixtures/responsive", import.meta.url)),
            {
                staticRoots: {
                    "/static/adapters/social/profile/": fileURLToPath(
                        new URL("../ui/", import.meta.url),
                    ),
                },
            },
        );
        context.after(() => server.close());
        const browser = await launchChromium(executable);
        context.after(() => browser.close());
        await browser.command("Page.navigate", { url: server.url });
        try {
            await browser.waitFor(
                'Boolean(window.fixture) && document.body.dataset.pageReady === "true"',
            );
        } catch (error) {
            const failures = browser.events
                .filter((event) => event.method === "Runtime.exceptionThrown")
                .map(
                    (event) =>
                        event.params.exceptionDetails.exception?.description,
                );
            throw new Error(`${error.message}: ${JSON.stringify(failures)}`);
        }
        await browser.evaluate(
            `window.profileDraft=document.querySelector('textarea');window.profileDraft.value='A draft that survives rotation';`,
        );
        for (const [width, height] of [
            [253, 600],
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
            await context.test(`${width}x${height}`, async () => {
                const state = await browser.evaluate(
                    `(()=>{const card=document.querySelector('[data-composer-element="hero"]');const hero=document.querySelector('.profile-hero');const content=document.querySelector('.profile-hero-content');return{overflow:document.documentElement.scrollWidth-innerWidth,order:[...document.querySelectorAll('[data-composer-element]')].map(e=>e.dataset.composerElement),hero:hero.getBoundingClientRect().toJSON(),content:content.getBoundingClientRect().toJSON(),stacked:document.querySelector('.composer-view-grid').classList.contains('composer-view-grid--compact'),draft:document.querySelector('textarea')===window.profileDraft,value:window.profileDraft.value}})()`,
                );
                assert.ok(state.overflow <= 1, JSON.stringify(state));
                assert.ok(state.draft);
                assert.equal(state.value, "A draft that survives rotation");
                if (width <= 900) {
                    assert.ok(state.stacked);
                    assert.deepEqual(state.order, [
                        "hero",
                        "posts-new",
                        "posts",
                        "followers",
                        "following",
                    ]);
                    assert.ok(
                        state.content.bottom <= state.hero.bottom + 1,
                        "Identity and biography fit inside the hero",
                    );
                }
                const posts = await browser.evaluate(
                    `[...document.querySelectorAll('.profile-post-body')].map(e=>({width:e.clientWidth,scroll:e.scrollWidth}))`,
                );
                for (const post of posts)
                    assert.ok(post.scroll <= post.width + 1);
                await captureScreenshot(
                    browser,
                    `profile-timeline-${width}-${height}`,
                );
            });
        }
        await browser.command("Page.navigate", {
            url: server.url + "/?own=false",
        });
        await browser.waitFor(
            'Boolean(window.fixture) && document.body.dataset.pageReady === "true"',
        );
        assert.equal(
            await browser.evaluate(
                'document.querySelectorAll(".profile-post-card").length',
            ),
            2,
        );
        assert.equal(
            await browser.evaluate(
                'document.querySelectorAll("textarea").length',
            ),
            0,
            "Visitor presentation offers no post editor",
        );
    },
);
