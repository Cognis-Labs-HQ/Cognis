import test from "node:test";
import assert from "node:assert/strict";
import { fixture } from "./fixture.js";
import { guides } from "../../ui/guides.js";
import { flowHost } from "../../../../../ui/reuse/tests/fixtures/flow-host.js";
import { registerFloatingMenus } from "../../../../../ui/reuse/floating-menu-queue.js";
import { registerTutorials } from "../../../../../ui/reuse/tutorials/runtime.js";
import { mountPageTutorials } from "../../../../../ui/reuse/tutorials/pages.js";

for (const populated of [true, false])
    test(`Messages history tutorial teaches reader details with populated history ${populated}`, async (context) => {
        const state = await fixture(context);
        if (populated) await state.render();
        const page = state.document.createElement("section");
        state.root.replaceWith(page);
        page.appendChild(state.root);
        const controls = state.document.createElement("div");
        controls.innerHTML =
            '<ul id="messages-rooms-list"></ul><button id="messages-new-btn"></button><textarea id="messages-composer-input"></textarea><button id="messages-composer-preview-toggle"></button>' +
            (populated ? '<header id="messages-thread-header"></header>' : "");
        page.appendChild(controls);
        for (const element of page.querySelectorAll("*")) {
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
            document: state.document,
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
            ...guides[0],
            root: page,
            signal: lifetime.signal,
            i18n: state.i18n,
            authorized: () => true,
        });
        context.after(() => {
            dispose();
            lifetime.abort();
        });
        const [registered] = await api.list({
            page: { pathname: "/messages/synthetic" },
        });
        assert.ok(registered);
        for (let replay = 0; replay < 2; replay++) {
            const session = await api.start(registered.id);
            await session.ready;
            assert.equal(session.state().total, populated ? 6 : 5);
            await session.next();
            assert.equal(session.state().stepId, "room-history");
            assert.equal(rendered.at(-1).target, state.root);
            assert.match(
                state.i18n.t(
                    "module.social.messages.tutorial.messages.room.history.body",
                ),
                /Seen by.*reader list.*read times/,
            );
            await session.back();
            await session.restart();
            for (let index = 0; index < (populated ? 6 : 5); index++)
                await session.next();
            assert.equal((await session.finished).status, "completed");
        }
        dispose();
        assert.deepEqual(await api.list(), []);
        assert.ok(rendered.every((view) => view.disposed));
        assert.ok(
            state.state.requests.every((path) => !path.includes("/read")),
        );
    });
