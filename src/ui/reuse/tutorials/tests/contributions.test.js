import test from "node:test";
import assert from "node:assert/strict";
import { tutorialHost } from "./fixtures/host.js";
import { collectPageTutorials, mountComposerTutorials } from "../pages.js";

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

test("a failed composed page rolls back all earlier tutorial owners and permits a fresh mount", async (context) => {
    const state = tutorialHost();
    context.after(state.dispose);
    state.ctx.capabilities.contribute("session:isAuthenticated", () => true);
    const root = {
        ownerDocument: state.document,
        isConnected: true,
        querySelectorAll: () => [],
    };
    const tutorials = ["first", "second"].map((id) => ({
        owner: `page.${id}`,
        definitions: [
            {
                id: "overview",
                page: "/dashboard",
                titleKey: id,
                steps: [{ id: "one", titleKey: id }],
            },
        ],
    }));
    const lifetime = new AbortController();
    await assert.rejects(
        mountComposerTutorials(state.ctx, {
            root,
            lifetime,
            tutorials,
            i18n: {
                t(key) {
                    if (key === "second")
                        throw new Error("missing_translation");
                    return key;
                },
            },
        }),
        /missing_translation/,
    );
    assert.equal(lifetime.signal.aborted, true);
    assert.deepEqual(await state.api.list(), []);
    const replacement = new AbortController();
    await mountComposerTutorials(state.ctx, {
        root,
        lifetime: replacement,
        tutorials,
        i18n: { t: (key) => key },
    });
    assert.equal((await state.api.list()).length, 2);
    state.window.dispatchEvent(new Event("cognis:route-will-change"));
    assert.equal(replacement.signal.aborted, true);
    assert.deepEqual(await state.api.list(), []);
    assert.ok(state.events.includes("ui:tutorial:mountPage"));
});

test("explicit first-match targets select the first usable control while unique matching stays strict", async (context) => {
    const state = tutorialHost();
    context.after(state.dispose);
    state.ctx.capabilities.contribute("session:isAuthenticated", () => true);
    const hidden = state.element();
    hidden.getClientRects = () => [];
    const disabled = state.element();
    disabled.matches = () => true;
    const first = state.element();
    const second = state.element();
    const root = {
        ownerDocument: state.document,
        isConnected: true,
        contains: () => true,
        querySelectorAll: () => [hidden, disabled, first, second],
    };
    const owner = new AbortController();
    await state.api.mountPage({
        owner: "ui.precise",
        root,
        signal: owner.signal,
        i18n: { t: (key) => key },
        definitions: [
            {
                id: "controls",
                page: "/dashboard",
                titleKey: "controls",
                steps: [
                    {
                        id: "power",
                        selector: ".editable-control",
                        targetMatch: "first",
                        titleKey: "power",
                    },
                    {
                        id: "ambiguous",
                        selector: ".editable-control",
                        titleKey: "ambiguous",
                        missing: { timeoutMs: 0, action: "skip" },
                    },
                    { id: "after", titleKey: "after" },
                ],
            },
        ],
    });
    const session = await state.api.start("ui.precise:controls");
    await session.ready;
    assert.equal(state.rendered.at(-1).target, first);
    await session.next();
    assert.equal(session.state().stepId, "after");
    await session.dispose();
    await assert.rejects(
        state.api.mountPage({
            owner: "ui.invalid",
            root,
            signal: owner.signal,
            i18n: { t: (key) => key },
            definitions: [
                {
                    id: "controls",
                    page: "/dashboard",
                    titleKey: "controls",
                    steps: [
                        {
                            id: "power",
                            selector: ".control",
                            targetMatch: "last",
                            titleKey: "power",
                        },
                    ],
                },
            ],
        }),
        /invalid_tutorial_target_match/,
    );
});

test("first-match selection cannot highlight another section's controls", async (context) => {
    const state = tutorialHost();
    context.after(state.dispose);
    state.ctx.capabilities.contribute("session:isAuthenticated", () => true);
    const inside = state.element();
    const outside = state.element();
    const boundary = state.element();
    boundary.contains = (element) => element === inside;
    const root = {
        ownerDocument: state.document,
        isConnected: true,
        contains: () => true,
        querySelectorAll: (selector) =>
            selector === ".panel" ? [boundary] : [outside, inside],
    };
    await state.api.mountPage({
        owner: "ui.scoped",
        root,
        signal: new AbortController().signal,
        i18n: { t: (key) => key },
        definitions: [
            {
                id: "controls",
                page: "/dashboard",
                scope: ".panel",
                titleKey: "controls",
                steps: [
                    {
                        id: "power",
                        selector: ".control",
                        targetMatch: "first",
                        titleKey: "power",
                    },
                ],
            },
        ],
    });
    const session = await state.api.start("ui.scoped:controls");
    await session.ready;
    assert.equal(state.rendered.at(-1).target, inside);
});

test("a visibility requirement permits sibling controls inside the component root", async (context) => {
    const state = tutorialHost();
    context.after(state.dispose);
    state.ctx.capabilities.contribute("session:isAuthenticated", () => true);
    const section = state.element();
    const sidebarControl = state.element();
    let visible = false;
    const root = {
        ownerDocument: state.document,
        isConnected: true,
        contains: () => true,
        querySelectorAll: (selector) =>
            selector === ".section"
                ? visible
                    ? [section]
                    : []
                : selector === ".sidebar-control"
                  ? [sidebarControl]
                  : [],
    };
    await state.api.mountPage({
        owner: "component.visibility",
        root,
        signal: state.ctx.signal,
        i18n: { t: (key) => key },
        definitions: [
            {
                id: "controls",
                page: "/dashboard",
                visibleWhen: ".section",
                titleKey: "title",
                steps: [
                    {
                        id: "search",
                        selector: ".sidebar-control",
                        titleKey: "search",
                    },
                ],
            },
        ],
    });
    assert.deepEqual(await state.api.list(), []);
    visible = true;
    const [play] = await state.api.list();
    const session = await state.api.start(play.id);
    assert.equal(await session.ready, true);
    assert.equal(state.rendered.at(-1).target, sidebarControl);
    assert.equal(state.rendered.at(-1).valid(), true);
    visible = false;
    assert.equal(state.rendered.at(-1).valid(), false);
    await session.next();
    assert.equal((await session.finished).reason, "permissionLost");
    assert.deepEqual(await state.api.list(), []);
});

test("invalid visibility selectors fail registration and release the owner", async (context) => {
    const state = tutorialHost();
    context.after(state.dispose);
    const root = {
        ownerDocument: state.document,
        isConnected: true,
        querySelectorAll: () => [],
    };
    for (const visibleWhen of [false, [], " "]) {
        await assert.rejects(
            state.api.mountPage({
                owner: "component.invalid-visibility",
                root,
                signal: state.ctx.signal,
                i18n: { t: (key) => key },
                definitions: [
                    {
                        id: "controls",
                        page: "/dashboard",
                        visibleWhen,
                        titleKey: "title",
                        steps: [{ id: "read", titleKey: "read" }],
                    },
                ],
            }),
            /invalid_tutorial_visibility_selector/,
        );
        assert.deepEqual(await state.api.list(), []);
    }
});

test("first-match targets retain their card when hover changes candidate ordering", async (context) => {
    const state = tutorialHost();
    context.after(state.dispose);
    state.ctx.capabilities.contribute("session:isAuthenticated", () => true);
    const first = state.element();
    const second = state.element();
    let candidates = [first, second];
    const root = {
        ownerDocument: state.document,
        isConnected: true,
        contains: () => true,
        querySelectorAll: () => candidates,
    };
    await state.api.mountPage({
        owner: "cards",
        root,
        signal: state.ctx.signal,
        i18n: { t: (key) => key },
        definitions: [
            {
                id: "browse",
                page: "/dashboard",
                titleKey: "cards",
                steps: [
                    {
                        id: "example",
                        titleKey: "example",
                        selector: ".card",
                        targetMatch: "first",
                    },
                ],
            },
        ],
    });
    const session = await state.api.start("cards:browse");
    await session.ready;
    const rendered = state.rendered.at(-1);
    assert.equal(rendered.target, first);
    candidates = [second, first];
    assert.equal(rendered.valid(), true);
    assert.equal(rendered.target, first);
    await session.restart();
    assert.equal(state.rendered.at(-1).target, first);
    await session.next();
    assert.equal((await session.finished).status, "completed");
    first.checkVisibility = () => false;
    const replay = await state.api.start("cards:browse");
    await replay.ready;
    assert.equal(state.rendered.at(-1).target, second);
    await replay.dispose();
});

test("detail targets resolve only inside the explicitly owned portal while the page is available", async (context) => {
    const state = tutorialHost();
    context.after(state.dispose);
    state.ctx.capabilities.contribute("session:isAuthenticated", () => true);
    const detail = state.element();
    const portal = state.element();
    portal.contains = (element) => element === detail;
    portal.querySelectorAll = () => [detail];
    let active = true;
    state.document.querySelectorAll = (selector) =>
        selector === ".owned-popup" ||
        (selector === ":is(.owned-popup).popup-overlay--visible" && active)
            ? [portal]
            : [];
    const root = {
        ownerDocument: state.document,
        isConnected: true,
        contains: () => false,
        querySelectorAll: () => [],
    };
    await state.api.mountPage({
        owner: "portal.owner",
        root,
        signal: state.ctx.signal,
        i18n: { t: (key) => key },
        definitions: [
            {
                id: "details",
                page: "/dashboard",
                titleKey: "details",
                steps: [
                    {
                        id: "read",
                        titleKey: "read",
                        selector: ".details",
                        portal: ".owned-popup",
                        popup: ".owned-popup",
                        layer: "overlay",
                    },
                ],
            },
        ],
    });
    const session = await state.api.start("portal.owner:details");
    await session.ready;
    assert.equal(state.rendered.at(-1).target, detail);
    active = false;
    assert.equal(state.rendered.at(-1).valid(), false);
    assert.equal(portal.isConnected, true);
    active = true;
    assert.equal(state.rendered.at(-1).valid(), true);
    root.isConnected = false;
    assert.equal(state.rendered.at(-1).valid(), false);
    state.rendered.at(-1).lost();
    assert.equal((await session.finished).reason, "permissionLost");
});

test("related steps retain one selected container after cards reorder", async (context) => {
    const state = tutorialHost();
    context.after(state.dispose);
    state.ctx.capabilities.contribute("session:isAuthenticated", () => true);
    const favorite = state.element();
    const card = state.element();
    const first = state.element();
    const second = state.element();
    first.contains = (element) => element === card || element === favorite;
    first.querySelectorAll = (selector) =>
        selector === ".favorite" ? [favorite] : [card];
    const replacement = state.element();
    second.querySelectorAll = () => [replacement];
    let containers = [first, second];
    const root = {
        ownerDocument: state.document,
        isConnected: true,
        contains: () => true,
        querySelectorAll: () => containers,
    };
    await state.api.mountPage({
        owner: "related.cards",
        root,
        signal: state.ctx.signal,
        i18n: { t: (key) => key },
        definitions: [
            {
                id: "browse",
                page: "/dashboard",
                titleKey: "browse",
                steps: [
                    {
                        id: "favorite",
                        titleKey: "favorite",
                        selector: ".favorite",
                        targetScope: ".card-shell",
                    },
                    {
                        id: "details",
                        titleKey: "details",
                        selector: ".card",
                        targetScope: ".card-shell",
                    },
                ],
            },
        ],
    });
    const session = await state.api.start("related.cards:browse");
    await session.ready;
    assert.equal(state.rendered.at(-1).target, favorite);
    containers = [second, first];
    await session.next();
    assert.equal(state.rendered.at(-1).target, card);
    await session.back();
    assert.equal(state.rendered.at(-1).target, favorite);
    await session.dispose();
    first.checkVisibility = () => false;
    const replay = await state.api.start("related.cards:browse");
    await replay.ready;
    assert.equal(state.rendered.at(-1).target, replacement);
    await replay.next();
    assert.equal(state.rendered.at(-1).target, replacement);
    await replay.dispose();
});
