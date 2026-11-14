import test from "node:test";
import assert from "node:assert/strict";
import { createEntryFixture, deferred } from "./reuse/entry-fixture.js";

const tick = () => new Promise(setImmediate);

test("Study entry executes registered stages and mounts selected Explore content without composing a directory", async (context) => {
    const fixture = await createEntryFixture(context);
    await fixture.mount();
    assert.deepEqual(fixture.state.stages, ["resolve", "navigate"]);
    assert.equal(fixture.state.composers.length, 0);
    assert.equal(fixture.state.mounts[0].language, "cy");
    assert.equal(fixture.state.mounts[0].path, "/study/explore/cy/symbols");
    assert.match(
        fixture.state.mounts[0].html,
        /dropdown-item active" href="\/study\/explore"/,
    );
    assert.match(
        fixture.state.mounts[0].html,
        /btn-no-animation active[^>]+data-language-code="cy"/,
    );
    assert.equal(fixture.state.navigation.options.replace, true);
    assert.equal(fixture.history.state.studyLanguageCode, "cy");
});

test("refresh, repeated SPA returns and history selections resolve the same language and active content", async (context) => {
    const fixture = await createEntryFixture(context);
    for (const selected of ["cy", "fi", "cy", "fi", "fi"]) {
        fixture.window.location.pathname = "/study";
        fixture.history.state = {
            studyLanguageCode: selected,
            previousRouterPage: "/study/leaderboard",
        };
        await fixture.mount();
        assert.equal(fixture.state.mounts.at(-1).language, selected);
        assert.equal(fixture.history.state.studyLanguageCode, selected);
    }
    fixture.window.location.pathname = "/study";
    fixture.history.state = {};
    fixture.state.selected = "fi";
    await fixture.mount();
    assert.equal(
        fixture.state.mounts.at(-1).language,
        "fi",
        "the visible selection survives an ordinary link without history state",
    );
});

test("valid intentional unenrolled selection is preserved and new preferences govern an unselected entry", async (context) => {
    const fixture = await createEntryFixture(context);
    fixture.state.enrolled = ["fi"];
    await fixture.mount();
    assert.equal(fixture.state.mounts.at(-1).language, "cy");
    fixture.window.location.pathname = "/study";
    fixture.history.state = {};
    fixture.state.selected = undefined;
    fixture.invalidate("cognis:study-enrollment-changed");
    await fixture.mount();
    assert.equal(fixture.state.mounts.at(-1).language, "fi");
});

test("delayed provider data waits, then follows a newer selected language", async (context) => {
    const fixture = await createEntryFixture(context);
    const gate = deferred();
    fixture.state.schemaGate = gate.promise;
    const pending = fixture.mount();
    await tick();
    assert.equal(fixture.state.mounts.length, 0);
    assert.equal(fixture.state.composers.length, 0);
    fixture.history.state.studyLanguageCode = "fi";
    gate.resolve();
    await pending;
    assert.equal(fixture.state.mounts.length, 1);
    assert.equal(fixture.state.mounts[0].language, "fi");
});

test("removing a provider during resolution revalidates before mounting another valid provider", async (context) => {
    const fixture = await createEntryFixture(context);
    const gate = deferred();
    fixture.state.schemaGate = gate.promise;
    const pending = fixture.mount();
    await tick();
    fixture.state.languages = [{ code: "fi" }];
    fixture.state.schemas = fixture.state.schemas.filter(
        ({ language }) => language === "fi",
    );
    fixture.invalidate();
    gate.resolve();
    await pending;
    assert.equal(fixture.state.mounts.length, 1);
    assert.equal(fixture.state.mounts[0].language, "fi");
});

for (const cancel of ["signal", "navigation", "replacement", "provider"]) {
    test(`late provider completion cannot overwrite a newer ${cancel}`, async (context) => {
        const fixture = await createEntryFixture(context);
        const gate = deferred();
        fixture.state.schemaGate = gate.promise;
        const controller = new AbortController();
        const pending = fixture.mount(controller.signal);
        await tick();
        if (cancel === "signal") controller.abort();
        if (cancel === "navigation") {
            fixture.window.location.pathname = "/study/leaderboard";
            fixture.window.dispatchEvent(new Event("cognis:route-will-change"));
        }
        if (cancel === "provider") fixture.controller.abort();
        if (cancel === "replacement") {
            fixture.state.schemaGate = null;
            fixture.history.state.studyLanguageCode = "fi";
            await fixture.mount();
        }
        gate.resolve();
        await pending;
        assert.equal(
            fixture.state.mounts.length,
            cancel === "replacement" ? 1 : 0,
        );
        if (cancel === "replacement")
            assert.equal(fixture.state.mounts[0].language, "fi");
        assert.equal(fixture.state.toasts.length, 0);
    });
}

test("missing language, no selection, and unavailable Explore have explicit destinations", async (context) => {
    const fixture = await createEntryFixture(context);
    fixture.state.languages = [];
    await fixture.mount();
    assert.equal(fixture.state.mounts.at(-1).path, "/error?code=503");
    fixture.state.languages = [{ code: "fi" }];
    fixture.state.enrolled = [];
    fixture.history.state = {};
    fixture.window.location.pathname = "/study";
    fixture.invalidate();
    await fixture.mount();
    assert.equal(fixture.state.mounts.at(-1).path, "/study/welcome");
    fixture.state.enrolled = ["fi"];
    fixture.state.routes = [];
    fixture.window.location.pathname = "/study";
    fixture.invalidate("cognis:study-enrollment-changed");
    await fixture.mount();
    assert.equal(fixture.state.mounts.at(-1).path, "/error?code=503");
});

test("offline missing metadata uses the existing empty Study page", async (context) => {
    const fixture = await createEntryFixture(context);
    fixture.disconnect();
    fixture.state.languages = [];
    fixture.state.schemas = [];
    await fixture.mount();
    assert.equal(fixture.state.mounts.length, 0);
    assert.equal(fixture.state.composers[0].offline, true);
});

test("denied reads and missing navigation fail visibly; a router veto is not retried", async (context) => {
    const fixture = await createEntryFixture(context);
    fixture.state.navigationAllowed = false;
    const result = await fixture.enter();
    assert.equal(result.data.result, "blocked");
    assert.equal(fixture.state.mounts.length, 0);
    fixture.removeNavigate();
    await assert.rejects(fixture.mount(), /study_navigation_unavailable/);
    assert.equal(fixture.state.toasts.length, 1);
    fixture.state.denial = true;
    fixture.invalidate();
    await assert.rejects(fixture.mount(), /study_navigation_unavailable/);
    assert.equal(fixture.state.toasts.length, 2);
});

test("the default-entry flow leaves explicit Explore and other Study deep links intact", async (context) => {
    const fixture = await createEntryFixture(context);
    for (const path of [
        "/study/explore/cy/symbols/card",
        "/study/fi/flashcards/deck",
        "/study/leaderboard",
        "/study/library",
        "/study/custom",
    ]) {
        fixture.window.location.pathname = path;
        await fixture.enter();
        assert.equal(fixture.window.location.pathname, path);
        assert.equal(fixture.state.mounts.length, 0);
        assert.equal(fixture.state.requests.length, 0);
    }
});

test("a selection change between registered stages resolves again before committing navigation", async (context) => {
    const fixture = await createEntryFixture(context);
    let changed = false;
    fixture.ctx.extendFlow(
        "study:navigation:enter",
        "resolve",
        { id: "test:changeSelection", order: 1 },
        () => {
            if (changed) return;
            changed = true;
            fixture.history.state.studyLanguageCode = "fi";
        },
    );
    await fixture.mount();
    assert.equal(fixture.state.mounts.length, 1);
    assert.equal(fixture.state.mounts[0].language, "fi");
    assert.deepEqual(fixture.state.stages, [
        "resolve",
        "navigate",
        "resolve",
        "navigate",
    ]);
});

test("an account change while provider data is pending cannot navigate under the former account", async (context) => {
    const fixture = await createEntryFixture(context);
    const gate = deferred();
    fixture.state.schemaGate = gate.promise;
    const pending = fixture.mount();
    await tick();
    fixture.changeAccount("another-account");
    gate.resolve();
    await assert.rejects(pending, /offline_account_changed/);
    assert.equal(fixture.state.mounts.length, 0);
    assert.equal(fixture.state.toasts.length, 1);
});

test("provider disposal wins over an overlapping account change without stale feedback", async (context) => {
    const fixture = await createEntryFixture(context);
    const gate = deferred();
    fixture.state.schemaGate = gate.promise;
    const pending = fixture.mount();
    await tick();
    fixture.controller.abort();
    fixture.changeAccount("another-account");
    gate.resolve();
    await pending;
    assert.equal(fixture.state.mounts.length, 0);
    assert.equal(fixture.state.toasts.length, 0);
});
