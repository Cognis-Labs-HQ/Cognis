import test from "node:test";
import assert from "node:assert/strict";
import { pageHost } from "./fixtures/page.js";
import { play, tick } from "./fixtures/host.js";

async function complete(state) {
    while (state.api.current()) {
        state.rendered.at(-1).actions.next();
        await tick();
    }
    await tick();
}

test("first visits persist completion per account, survive remounting, and offer cancellable replays", async (context) => {
    const state = pageHost(context);
    await state.owner().register(play());
    await state.api.refreshPage();
    await tick();
    assert.equal(state.api.current().firstTime, true);
    assert.equal(
        state.header.children[0].attributes.get("aria-label"),
        "ui.tutorial.replay",
    );
    await complete(state);
    assert.equal(state.values.size, 1);
    await state.api.refreshPage();
    assert.equal(state.api.current(), null);
    const replay = await state.api.openPage();
    await replay.ready;
    assert.equal(replay.state().firstTime, false);
    await replay.cancel();
    assert.equal((await replay.finished).status, "cancelled");
    state.page.dispose();
    state.dispose();
    const reloaded = pageHost(context, state.values);
    await reloaded.owner().register(play());
    await reloaded.api.refreshPage();
    assert.equal(reloaded.api.current(), null);
    reloaded.account("second-account");
    await reloaded.api.refreshPage();
    await tick();
    assert.equal(reloaded.api.current().firstTime, true);
    assert.deepEqual(state.errors, []);
});

test("unmatched pages and required popups defer first visits until the page is available", async (context) => {
    const state = pageHost(context);
    await state.owner().register({ ...play(), page: "/settings" });
    await state.api.refreshPage();
    assert.equal(state.api.current(), null);
    state.window.location.pathname = "/settings";
    state.popup(true);
    await state.api.refreshPage();
    assert.equal(state.api.current(), null);
    assert.equal(state.header.children.length, 1);
    state.popup(false);
    await state.api.refreshPage();
    await tick();
    assert.equal(state.api.current().firstTime, true);
});

test("provider removal releases help controls and automatic sessions without persisting completion", async (context) => {
    const state = pageHost(context);
    const owner = state.owner();
    await owner.register(play());
    await state.api.refreshPage();
    await tick();
    owner.dispose();
    await state.api.refreshPage();
    assert.equal(state.api.current(), null);
    assert.equal(state.header.children.length, 0);
    assert.equal(state.values.size, 0);
    assert.ok(state.rendered.every((entry) => entry.disposed));
});

test("page entry schedules discoveries from registrations after a provider finishes mounting", async (context) => {
    const state = pageHost(context);
    state.page.connect();
    await tick();
    await state.owner().register(play());
    await tick();
    assert.equal(state.api.current().firstTime, true);
    assert.ok(state.events.includes("ui:tutorial:page"));
});

test("SPA page mount publication resumes discovery after navigation has replaced the page", async (context) => {
    const state = pageHost(context);
    await state.owner().register({ ...play(), page: "/settings" });
    state.page.connect();
    await tick();
    state.window.dispatchEvent(new Event("cognis:route-will-change"));
    state.window.location.pathname = "/settings";
    await state.api.refreshPage();
    assert.equal(state.api.current(), null);
    await state.ctx.runFlow("page:mounted", { pathname: "/settings" });
    await tick();
    assert.equal(state.api.current().firstTime, true);
});

test("pending page blockers prevent automatic and replay tutorials until dismissal", async (context) => {
    const state = pageHost(context);
    await tick();
    state.window.dispatchEvent(new Event("cognis:route-will-change"));
    const dismissed = Promise.withResolvers();
    const id = "test:initialPopup";
    state.ctx.extendFlow(
        "page:ready",
        "blocking",
        { id },
        () => dismissed.promise,
    );
    context.after(() => state.ctx.removeFlowHook("page:ready", "blocking", id));
    state.page.connect();
    await state.owner().register(play());
    await state.ctx.runFlow("page:mounted", {
        pathname: state.window.location.pathname,
    });
    await state.api.refreshPage();
    assert.equal(state.readiness.isReady(), false);
    assert.equal(state.api.current(), null);
    assert.equal(await state.api.openPage(), false);
    assert.equal(state.header.children[0].disabled, true);
    dismissed.resolve();
    await tick();
    await tick();
    assert.equal(state.readiness.isReady(), true);
    assert.equal(state.api.current().firstTime, true);
});
