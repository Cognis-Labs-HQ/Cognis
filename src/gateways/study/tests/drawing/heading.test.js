import { loadTestModule } from "../../../../tooling/reuse/test-module.ts";
import assert from "node:assert/strict";
import test from "node:test";
import vm from "node:vm";

function headingSession(pathname, choice = "open", onNavigate) {
    const listeners = new Map();
    const attributes = new Map();
    const navigations = [];
    const prompts = [];
    const actions = [];
    const card = { id: "character", label: "学" };
    const heading = {
        classList: { add() {}, remove() {} },
        addEventListener: (name, handler) => listeners.set(name, handler),
        removeAttribute: (name) => attributes.delete(name),
        setAttribute: (name, value) => attributes.set(name, value),
    };
    const environment = vm.createContext({
        window: { location: { pathname } },
        entryExploreUrl: () => "/study/explore/ja/kanji/character",
        uiCtx: {
            capabilities: {
                get:
                    () =>
                    async (...args) =>
                        navigations.push(args),
            },
        },
        openPopup: async (options) => {
            prompts.push(options);
            return choice;
        },
    });
    Object.assign(
        environment,
        loadTestModule(
            new URL("../../ui/reuse/drawing-heading.js", import.meta.url),
            {
                "/static/reuse/popup.js": environment,
                "/static/reuse/ui-ctx.js": environment,
                "./explore.js": environment,
            },
            environment,
        ),
    );
    let revealed = 0;
    environment.bindDrawingHeading(heading, {
        signal: new AbortController().signal,
        i18n: { t: (key) => key },
        schemas: [],
        getCard: () => card,
        onNavigate,
        onReveal: () => {
            revealed += 1;
        },
        runAction: (action) => {
            const pending = action();
            actions.push(pending);
            return pending;
        },
        reportFailure: (error) => {
            throw error;
        },
    });
    return {
        navigations,
        prompts,
        heading,
        async click(modifiers = {}) {
            let prevented = false;
            listeners.get("click")({
                preventDefault() {
                    prevented = true;
                },
                ...modifiers,
            });
            await actions.at(-1);
            return { prevented, revealed };
        },
    };
}

for (const pathname of [
    "/study/explore",
    "/study/explore/ja/kanji",
    "/study/explore/ja/kanji/other",
]) {
    test(`revealed heading navigates directly from ${pathname}`, async () => {
        const session = headingSession(pathname);
        assert.equal((await session.click()).revealed, 1);
        assert.equal(session.navigations.length, 0);
        assert.equal(session.heading.href, undefined);
        assert.equal((await session.click({ ctrlKey: true })).prevented, true);
        assert.equal(session.prompts.length, 0);
        assert.equal(
            session.navigations[0][0],
            "/study/explore/ja/kanji/character",
        );
        assert.equal(session.navigations[0][1].state.studyEntryId, "character");
    });
}

for (const pathname of [
    "/study/library",
    "/study/ja/flashcards/deck",
    "/study/explore-other",
]) {
    test(`revealed heading confirms navigation from ${pathname}`, async () => {
        const session = headingSession(pathname);
        await session.click();
        await session.click();
        assert.equal(session.prompts.length, 1);
        assert.equal(session.navigations.length, 1);
    });
}

test("cancelled heading actions stay on the current page even with modifier keys", async () => {
    const session = headingSession("/study/library", "cancel");
    await session.click();
    await session.click();
    assert.equal(session.navigations.length, 0);
    assert.equal((await session.click({ ctrlKey: true })).prevented, true);
    assert.equal(session.prompts.length, 2);
    assert.equal(session.navigations.length, 0);
});

test("embedded heading departure runs its consumer callback only after confirmation", async () => {
    const departures = [];
    const session = headingSession(
        "/study/ja/flashcards/deck",
        "open",
        (card) => departures.push(card.id),
    );
    await session.click();
    assert.deepEqual(departures, []);
    await session.click();
    assert.deepEqual(departures, ["character"]);
    assert.equal(session.prompts.length, 1);
    assert.equal(session.navigations.length, 0);
    const cancelled = headingSession(
        "/study/ja/flashcards/deck",
        "cancel",
        (card) => departures.push(card.id),
    );
    await cancelled.click();
    await cancelled.click();
    assert.deepEqual(departures, ["character"]);
});
