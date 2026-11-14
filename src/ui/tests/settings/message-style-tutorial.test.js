import assert from "node:assert/strict";
import test from "node:test";
import { settingsFixture, settle } from "../fixtures/message-style.js";
import { guides } from "../../app/settings/guides.js";
import { flowHost } from "../../reuse/tests/fixtures/flow-host.js";
import { registerFloatingMenus } from "../../reuse/floating-menu-queue.js";
import { registerTutorials } from "../../reuse/tutorials/runtime.js";
import { mountPageTutorials } from "../../reuse/tutorials/pages.js";

for (const provider of [true, false]) {
    test(`appearance tutorial traverses actual Settings targets with provider ${provider}`, async (context) => {
        const fixture = await settingsFixture(context, { provider });
        await settle();
        const document = fixture.dom.window.document;
        const root = fixture.root;
        root.innerHTML = `<section id="appearance">${root.innerHTML}</section>`;
        for (const element of root.querySelectorAll("*")) {
            element.getClientRects = () => [{}];
            element.getBoundingClientRect = () => ({
                left: 0,
                top: 0,
                width: 320,
                height: 40,
                right: 320,
                bottom: 40,
            });
        }
        const previousController = globalThis.AbortController;
        const previousSignal = globalThis.AbortSignal;
        globalThis.AbortController = fixture.dom.window.AbortController;
        globalThis.AbortSignal = fixture.dom.window.AbortSignal;
        context.after(() => {
            globalThis.AbortController = previousController;
            globalThis.AbortSignal = previousSignal;
        });
        const lifetime = new AbortController();
        const { ctx } = flowHost(lifetime.signal);
        registerFloatingMenus(ctx);
        const rendered = [];
        const api = registerTutorials(ctx, {
            document,
            view: async (options) => {
                const view = {
                    ...options,
                    disposed: false,
                    dispose() {
                        this.disposed = true;
                    },
                };
                rendered.push(view);
                return view;
            },
        });
        const appearance = guides[0].definitions.find(
            (guide) => guide.id === "appearance",
        );
        const dispose = await mountPageTutorials(api, {
            owner: guides[0].owner,
            root,
            signal: lifetime.signal,
            i18n: { t: (key) => key },
            definitions: [appearance],
            authorized: () => true,
        });
        context.after(() => {
            dispose();
            lifetime.abort();
        });
        const registered = (
            await api.list({ page: { pathname: "/settings" } })
        )[0];
        assert.ok(registered);
        for (let iteration = 0; iteration < 2; iteration++) {
            const session = await api.start(registered.id);
            await session.ready;
            assert.equal(session.state().total, provider ? 4 : 3);
            await session.next();
            await session.back();
            assert.equal(session.state().stepId, "font-and-size");
            await session.restart();
            assert.equal(session.state().index, 0);
            await session.next();
            await session.next();
            assert.equal(session.state().stepId, "message-layout");
            await session.next();
            if (provider) {
                assert.equal(session.state().stepId, "message-preview");
                assert.equal(
                    rendered.at(-1).target,
                    root.querySelector("[data-message-style-preview]"),
                );
                await session.next();
            }
            assert.equal((await session.finished).status, "completed");
        }
        dispose();
        assert.deepEqual(await api.list(), []);
        assert.ok(rendered.every((view) => view.disposed));
        assert.equal(fixture.state.writes.length, 0);
    });
}
