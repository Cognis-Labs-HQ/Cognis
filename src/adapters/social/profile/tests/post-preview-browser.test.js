import test from "node:test";
import { randomUUID } from "node:crypto";
import assert from "node:assert/strict";
import {
    liveBrowserSkip,
    startLiveApp,
    settleLivePage,
} from "../../../../ui/tests/integration/live-app.js";

test(
    "own Profile previews form-builder fields and retains the draft through device layouts",
    { skip: liveBrowserSkip, timeout: 90000 },
    async (context) => {
        const { browser, origin } = await startLiveApp(context);
        await browser.command("Page.navigate", {
            url: new URL("/profile", origin).href,
        });
        await settleLivePage(browser);
        const draft = {
            title: "A complete title for the post preview",
            content:
                "A complete body that remains in the preview when the screen rotates.",
        };
        await browser.callFunction(
            `function(draft){const form=document.querySelector('#new-post-form');for(const name of ['title','content']){const field=form.elements.namedItem(name);field.value=draft[name];field.dispatchEvent(new Event('input',{bubbles:true}));}window.originalProfilePostInput=form.elements.namedItem('content');document.querySelector('#profile-post-preview-toggle').click();}`,
            [draft],
        );
        for (const [width, height] of [
            [320, 568],
            [768, 1024],
            [1024, 768],
            [1440, 900],
        ]) {
            await browser.resize(width, height);
            const state = await browser.evaluate(
                `({text:document.querySelector('#profile-post-preview').textContent,hidden:document.querySelector('#profile-post-preview').hidden,sameNode:document.querySelector('#new-post-form [name="content"]')===window.originalProfilePostInput})`,
            );
            assert.ok(
                state.text.includes(draft.title) &&
                    state.text.includes(draft.content),
            );
            assert.equal(state.hidden, false);
            assert.equal(state.sameNode, true);
        }
        await browser.evaluate(
            'document.querySelector("#profile-post-compose-toggle").click()',
        );
        assert.equal(
            await browser.evaluate(
                'document.querySelector("#new-post-form [name=content]").value',
            ),
            draft.content,
        );
        await browser.command("Network.enable");
        for (let index = 0; index < 2; index++) {
            const marker = randomUUID();
            await browser.callFunction(
                `function(marker){const form=document.querySelector('#new-post-form');form.elements.namedItem('title').value=marker;form.elements.namedItem('content').value=marker;form.elements.namedItem('visibility').value='only_me';for(const name of ['title','content','visibility'])form.elements.namedItem(name).dispatchEvent(new Event('input',{bubbles:true}));window.expectedProfilePostMarker=marker;form.querySelector('button[type="submit"]').click();}`,
                [marker],
            );
            await browser.waitFor(
                `[...document.querySelectorAll('.profile-post-card')].some(element=>element.textContent.includes(window.expectedProfilePostMarker))`,
            );
            const created = await browser.evaluate(
                `(()=>{const card=[...document.querySelectorAll('.profile-post-card')].find(element=>element.textContent.includes(window.expectedProfilePostMarker));window.expectedProfilePostId=card.dataset.postId;return card.dataset.postId;})()`,
            );
            assert.ok(
                created,
                "Published post appears immediately without reloading",
            );
            assert.equal(
                await browser.evaluate(
                    `document.querySelector('#new-post-form [name="content"]')===window.originalProfilePostInput`,
                ),
                true,
                "Refreshing the timeline retains the post editor",
            );
            await browser.evaluate(
                `document.querySelector('[data-post-id="'+CSS.escape(window.expectedProfilePostId)+'"] .post-delete-btn').click()`,
            );
            await browser.waitFor(
                `Boolean(document.querySelector('.popup-overlay--visible [data-popup-action="confirm"]'))`,
            );
            await browser.evaluate(
                `document.querySelector('.popup-overlay--visible [data-popup-action="confirm"]').click()`,
            );
            await browser.waitFor(
                `![...document.querySelectorAll('.profile-post-card')].some(element=>element.dataset.postId===window.expectedProfilePostId)`,
            );
            await browser.waitFor(`!document.querySelector('.popup-overlay')`);
        }
        const submissions = browser.events.filter(
            (event) =>
                event.method === "Network.requestWillBeSent" &&
                event.params.request.method === "POST" &&
                new URL(event.params.request.url).pathname ===
                    "/api/v1/social/posts",
        );
        assert.equal(
            submissions.length,
            2,
            "Each Publish click submits once after repeated timeline refreshes",
        );
    },
);
