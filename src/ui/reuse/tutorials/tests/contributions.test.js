import test from "node:test";
import assert from "node:assert/strict";
import { tutorialHost } from "./fixtures/host.js";
import { collectPageTutorials } from "../pages.js";

test("composed tutorials enforce role changes, visible page scopes and page lifetime through public flows", async (context) => {
    let role = "user";
    let visible = true;
    const state = tutorialHost({ role: () => role });
    context.after(state.dispose);
    state.ctx.capabilities.contribute("session:isAuthenticated", () => true);
    const lifetime = new AbortController();
    const target = state.element();
    const root = {
        ownerDocument: state.document,
        isConnected: true,
        contains: () => true,
        querySelectorAll: () => (visible ? [target] : []),
    };
    const dispose = await state.api.mountPage({
        owner: "admin.example",
        minRole: "admin",
        root,
        signal: lifetime.signal,
        i18n: { t: (key) => key },
        definitions: [
            {
                id: "controls",
                page: "/dashboard",
                scope: ".example",
                titleKey: "example.title",
                steps: [
                    {
                        id: "review",
                        selector: ".example",
                        titleKey: "example.review",
                        bodyKey: "example.body",
                    },
                ],
            },
        ],
    });
    assert.deepEqual(await state.api.list(), []);
    role = "admin";
    assert.equal((await state.api.list()).length, 1);
    visible = false;
    assert.deepEqual(await state.api.list(), []);
    visible = true;
    const session = await state.api.start("admin.example:controls");
    await session.ready;
    role = "user";
    assert.equal(state.rendered.at(-1).valid(), false);
    await session.next();
    assert.equal((await session.finished).reason, "permissionLost");
    role = "owner";
    assert.equal((await state.api.list()).length, 1);
    lifetime.abort();
    assert.deepEqual(await state.api.list(), []);
    dispose();
    assert.ok(state.events.includes("ui:tutorial:mountPage"));
    assert.ok(state.events.includes("ui:tutorial:publishTarget"));
});

test("section metadata preserves optional owners without importing component implementations", () => {
    const first = { owner: "ui.page" },
        second = { owner: "optional.gateway" };
    assert.deepEqual(
        collectPageTutorials({
            tutorials: [first],
            elements: [
                { subComposerOptions: { tutorials: [second], elements: [] } },
            ],
        }),
        [first, second],
    );
});

test("a failed component guide mount rolls back earlier definitions and targets", async (context) => {
    const state = tutorialHost();
    context.after(state.dispose);
    state.ctx.capabilities.contribute("session:isAuthenticated", () => true);
    const root = {
        ownerDocument: state.document,
        isConnected: true,
        querySelectorAll: () => [],
    };
    await assert.rejects(
        state.api.mountPage({
            owner: "optional.component",
            root,
            signal: state.ctx.signal,
            i18n: {
                t: (key) => {
                    if (key === "missing")
                        throw new Error("missing_translation");
                    return key;
                },
            },
            definitions: [
                {
                    id: "first",
                    page: "/dashboard",
                    titleKey: "first",
                    steps: [
                        {
                            id: "one",
                            titleKey: "one",
                            selector: ".owned-control",
                        },
                    ],
                },
                {
                    id: "second",
                    page: "/dashboard",
                    titleKey: "missing",
                    steps: [{ id: "two", titleKey: "two" }],
                },
            ],
        }),
        /missing_translation/,
    );
    assert.deepEqual(await state.api.list(), []);
    const replacement = state.owner("optional.component");
    assert.ok(await replacement.target("first.one", { resolve: () => null }));
});
