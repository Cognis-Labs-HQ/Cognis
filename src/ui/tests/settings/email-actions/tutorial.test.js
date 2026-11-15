import assert from "node:assert/strict";
import test from "node:test";
import { fixture, settle } from "./fixture.js";
import { guides } from "../../../app/settings/guides.js";
import { flowHost } from "../../../reuse/tests/fixtures/flow-host.js";
import { registerFloatingMenus } from "../../../reuse/floating-menu-queue.js";
import { registerTutorials } from "../../../reuse/tutorials/runtime.js";
import { mountPageTutorials } from "../../../reuse/tutorials/pages.js";

for (const empty of [false, true]) {
    test(`email tutorial replay retains the real ${empty ? "empty" : "populated"} list target`, async (context) => {
        const state = await fixture(context);
        if (empty) {
            state.respond(async () => Response.json({ data: [] }));
            await state.prefs.refresh();
        }
        state.root.innerHTML = `<section id="general">${state.root.innerHTML}</section>`;
        state.root
            .querySelector("#general")
            .insertAdjacentHTML(
                "beforeend",
                '<label class="switch"><input id="pref-release-changelog-show"></label><label class="switch"><input id="pref-offline-enabled"></label><section class="settings-danger-zone"></section>',
            );
        for (const element of state.root.querySelectorAll("*")) {
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
        const dispose = await mountPageTutorials(api, {
            owner: guides[0].owner,
            definitions: [
                guides[0].definitions.find((guide) => guide.id === "general"),
            ],
            root: state.root,
            signal: lifetime.signal,
            i18n: state.i18n,
            authorized: () => true,
        });
        context.after(() => {
            dispose();
            lifetime.abort();
        });
        const [registered] = await api.list({
            page: { pathname: "/settings" },
        });
        assert.ok(registered);
        for (let iteration = 0; iteration < 2; iteration += 1) {
            const session = await api.start(registered.id);
            await session.ready;
            assert.equal(session.state().total, 4);
            assert.equal(
                rendered.at(-1).target,
                state.root.querySelector("#email-list"),
            );
            await session.next();
            await session.back();
            assert.equal(session.state().stepId, "email-addresses");
            await session.restart();
            for (let step = 0; step < 4; step += 1) await session.next();
            assert.equal((await session.finished).status, "completed");
        }
        dispose();
        assert.deepEqual(await api.list(), []);
        assert.ok(rendered.every((view) => view.disposed));
        assert.equal(state.mutations().length, 0);
        await settle();
    });
}
