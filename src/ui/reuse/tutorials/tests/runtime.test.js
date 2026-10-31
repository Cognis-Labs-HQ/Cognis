import test from "node:test";
import assert from "node:assert/strict";
import { tutorialHost, play, tick } from "./fixtures/host.js";

function host(context) {
    const state = tutorialHost();
    context.after(state.dispose);
    return state;
}

test("independent owners use public registration and staged start/progression/back/complete flows", async (context) => {
    const state = host(context);
    const one = state.owner("builtin"),
        two = state.owner("module.example");
    const first = await one.register(play()),
        second = await two.register(play());
    assert.equal((await state.api.list()).length, 2);
    const session = await first.start();
    assert.equal(await session.ready, true);
    assert.equal(session.state().index, 0);
    await Promise.all([session.next(), session.next()]);
    assert.equal(session.state().index, 1);
    await session.back();
    assert.equal(session.state().index, 0);
    await session.next();
    await session.next();
    assert.equal((await session.finished).status, "completed");
    assert.equal(
        state.rendered.every((view) => view.disposed),
        true,
    );
    assert.equal(state.focus.count, 1);
    const other = await second.start();
    await other.ready;
    await session.cancel();
    assert.equal(state.api.current().id, second.id);
    await other.skip();
    assert.equal((await other.finished).status, "skipped");
    for (const action of ["register", "start", "next", "back", "skip"])
        assert.ok(state.events.includes(`ui:tutorial:${action}`));
});

test("duplicate definitions, unsupported versions and overlapping starts are rejected without altering the current session", async (context) => {
    const state = host(context),
        owner = state.owner();
    const first = await owner.register(play());
    await assert.rejects(owner.register(play()), /conflict/);
    await assert.rejects(
        owner.register({ ...play(), version: 2 }),
        /invalid_tutorial/,
    );
    await assert.rejects(
        owner.register({ ...play(), surprise: "code" }),
        /invalid_tutorial/,
    );
    await assert.rejects(
        owner.register(
            play([
                { id: "same", titleKey: "a" },
                { id: "same", titleKey: "b" },
            ]),
        ),
        /invalid_tutorial/,
    );
    const session = await first.start();
    await session.ready;
    await assert.rejects(first.start(), /session_active/);
    const replacement = await first.start({ replace: true });
    await replacement.ready;
    assert.equal((await session.finished).reason, "replaced");
    assert.equal(state.api.current().id, first.id);
});

test("provider removal unregisters only its own contributions and prevents late publication", async (context) => {
    const state = host(context),
        one = state.owner("one"),
        two = state.owner("two");
    const first = await one.register(play());
    await two.register(play());
    const session = await first.start();
    await session.ready;
    one.abort();
    assert.equal((await session.finished).status, "cancelled");
    assert.equal((await state.api.list()).length, 1);
    await assert.rejects(one.register(play()), /disposed/);
    const again = state.owner("one");
    await again.register(play());
    assert.equal((await state.api.list()).length, 2);
});

test("target privacy and ambiguity fail safely, while public targets permit independent consumers", async (context) => {
    const state = host(context),
        source = state.owner("source"),
        reader = state.owner("reader");
    const target = state.element();
    const privateTarget = await source.target("private", {
        resolve: () => target,
    });
    await source.target("public", { public: true, resolve: () => target });
    await assert.rejects(
        source.target("public", { resolve: () => target }),
        /conflict/,
    );
    const denied = await reader.register(
        play([
            {
                id: "private",
                target: privateTarget.id,
                titleKey: "a",
                missing: { timeoutMs: 0, action: "cancel" },
            },
        ]),
    );
    const unavailable = await denied.start();
    assert.equal((await unavailable.finished).reason, "missingTarget");
    const allowed = await reader.register({
        ...play([{ id: "public", target: "source:public", titleKey: "a" }]),
        id: "allowed",
    });
    const session = await allowed.start();
    await session.ready;
    assert.equal(state.rendered.at(-1).target, target);
    await session.cancel();
    await source.target("ambiguous", {
        public: true,
        resolve: () => [target, state.element()],
    });
    const ambiguous = await reader.register({
        ...play([
            {
                id: "ambiguous",
                target: "source:ambiguous",
                titleKey: "a",
                missing: { timeoutMs: 0, action: "cancel" },
            },
        ]),
        id: "ambiguous",
    });
    assert.equal(
        (await (await ambiguous.start()).finished).reason,
        "missingTarget",
    );
});

for (const action of ["cancel", "skip", "retry"]) {
    test(`missing targets have bounded ${action} behavior and no blocking view`, async (context) => {
        const state = host(context),
            owner = state.owner();
        let target;
        await owner.target("late", { resolve: () => target });
        const definition = await owner.register(
            play([
                {
                    id: "late",
                    target: "example:late",
                    titleKey: "a",
                    interaction: "target",
                    missing: { timeoutMs: 0, action },
                },
            ]),
        );
        const session = await definition.start();
        if (action === "retry") {
            await session.ready;
            assert.equal(state.rendered.at(-1).waiting, true);
            target = state.element();
            await session.retry();
            assert.equal(state.rendered.at(-1).target, target);
        } else {
            const result = await session.finished;
            assert.equal(
                result.status,
                action === "skip" ? "completed" : "cancelled",
            );
        }
    });
}

test("a replaced target is resolved again and disabled targets release their interaction lock", async (context) => {
    const state = host(context),
        owner = state.owner();
    let target = state.element();
    await owner.target("live", { resolve: () => target });
    const definition = await owner.register(
        play([
            {
                id: "live",
                target: "example:live",
                titleKey: "a",
                interaction: "target",
                missing: { timeoutMs: 0, action: "cancel" },
            },
        ]),
    );
    const session = await definition.start();
    await session.ready;
    const first = state.rendered.at(-1);
    target = state.element();
    assert.equal(first.valid(), false);
    first.lost();
    await tick();
    assert.equal(first.disposed, true);
    const next = state.rendered.at(-1);
    assert.equal(next.target, target);
    target.matches = () => true;
    next.lost();
    assert.equal((await session.finished).status, "cancelled");
});

test("cancellation during an owner callback discards late work and runs its cleanup once", async (context) => {
    const state = host(context),
        owner = state.owner();
    let complete, entered;
    const started = new Promise((resolve) => {
        entered = resolve;
    });
    let cleaned = 0;
    const definition = await owner.register(
        play([
            {
                id: "async",
                titleKey: "a",
                enter: () => {
                    entered();
                    return new Promise((resolve) => {
                        complete = resolve;
                    });
                },
            },
        ]),
    );
    const session = await definition.start();
    await started;
    await session.cancel();
    complete(() => {
        cleaned++;
    });
    await tick();
    assert.equal(cleaned, 1);
    assert.equal(
        state.rendered.every((view) => view.disposed),
        true,
    );
    assert.equal(state.api.current(), null);
});

test("callback rejection, missing capability and permission loss terminate without stale overlays", async (context) => {
    const state = host(context),
        owner = state.owner();
    const broken = await owner.register(
        play([
            {
                id: "broken",
                titleKey: "a",
                enter: () => {
                    throw new Error("failure");
                },
            },
        ]),
    );
    assert.equal((await (await broken.start()).finished).status, "failed");
    assert.equal(state.feedback.length, 1);
    let permission = true;
    state.ctx.capabilities.contribute("example:ready", true);
    const required = await owner.register({
        ...play(),
        id: "required",
        requires: ["example:ready"],
        available: () => permission,
    });
    const session = await required.start();
    await session.ready;
    permission = false;
    await session.next();
    assert.equal((await session.finished).reason, "permissionLost");
    state.ctx.capabilities.remove("example:ready", true);
    await assert.rejects(required.start(), /unavailable/);
});

test("explicit route steps use the guarded host navigator; unrelated navigation and history cancel", async (context) => {
    const state = host(context),
        owner = state.owner();
    state.ctx.capabilities.contribute("ui:navigate", async (path) => {
        state.window.dispatchEvent(new Event("cognis:route-will-change"));
        state.window.location.pathname = path;
        return true;
    });
    const definition = await owner.register(
        play([{ id: "route", titleKey: "a", route: "/settings" }]),
    );
    const session = await definition.start();
    await session.ready;
    assert.equal(state.window.location.pathname, "/settings");
    state.window.dispatchEvent(new Event("popstate"));
    assert.equal((await session.finished).status, "cancelled");
    state.ctx.capabilities.remove(
        "ui:navigate",
        state.ctx.capabilities.get("ui:navigate"),
    );
    state.ctx.capabilities.contribute("ui:navigate", async () => false);
    state.window.location.pathname = "/dashboard";
    const denied = await definition.start();
    assert.equal((await denied.finished).reason, "navigationDenied");
});

test("events and awaited conditions advance once even under repeated delivery", async (context) => {
    const state = host(context),
        owner = state.owner();
    const target = state.element();
    await owner.target("button", { resolve: () => target });
    let complete;
    const definition = await owner.register(
        play([
            {
                id: "event",
                target: "example:button",
                titleKey: "a",
                advance: { event: "keydown", key: "Enter" },
            },
            {
                id: "await",
                titleKey: "b",
                waitFor: () =>
                    new Promise((resolve) => {
                        complete = resolve;
                    }),
            },
            { id: "last", titleKey: "c" },
        ]),
    );
    const session = await definition.start();
    await session.ready;
    const original = state.rendered.at(-1);
    original.interacted({ key: "Escape" });
    assert.equal(session.state().index, 0);
    original.interacted({ key: "Enter" });
    original.interacted({ key: "Enter" });
    await tick();
    assert.equal(session.state().index, 1);
    complete();
    await tick();
    assert.equal(session.state().index, 2);
    original.interacted({ key: "Enter" });
    await tick();
    assert.equal(session.state().index, 2);
});

test("external provider lifecycle rolls back failed bootstrap and supports disable/uninstall/re-enable through the public engine", async (context) => {
    const state = host(context);
    const { createProviderLifecycle } =
        await import("../../provider-lifecycle.js");
    const external = await import("./fixtures/external-module.js");
    state.ctx.capabilities.contribute("fixture:contentRoot", state.element());
    const lifecycle = createProviderLifecycle({
        uiCtx: state.ctx,
        importProvider: async () => external,
    });
    const descriptor = {
        scriptUrl: "/static/modules/fixture/tutorials/provider.js",
    };
    await lifecycle.reconcile([descriptor]);
    const play = state.ctx.capabilities.get("fixture:tutorial");
    const session = await play.start();
    await session.ready;
    await lifecycle.reconcile([]);
    assert.equal((await session.finished).status, "cancelled");
    assert.equal((await state.api.list()).length, 0);
    assert.equal(state.ctx.capabilities.get("fixture:tutorial"), undefined);
    await lifecycle.reconcile([descriptor]);
    assert.equal((await state.api.list()).length, 1);
    await lifecycle.reconcile([]);
    const failing = createProviderLifecycle({
        uiCtx: state.ctx,
        importProvider: async () => ({
            mountProvider: async (ctx) => {
                await external.mountProvider(ctx);
                throw new Error("bootstrap_failed");
            },
        }),
    });
    await assert.rejects(failing.reconcile([descriptor]), /bootstrap_failed/);
    assert.equal((await state.api.list()).length, 0);
    assert.equal(
        state.rendered.every((entry) => entry.disposed),
        true,
    );
});

test("catalog and replay resolve the current UI language through staged reads", async (context) => {
    const state = host(context);
    let locale = "en";
    const owner = state.api.owner("localized", {
        signal: state.ctx.signal,
        i18n: async () => {
            const language = locale;
            return { t: (key) => `${language}:${key}` };
        },
    });
    const definition = await owner.register(play());
    assert.equal((await state.api.list())[0].title, "en:owner.title");
    locale = "ja";
    assert.equal((await state.api.list())[0].title, "ja:owner.title");
    const session = await definition.start();
    await session.ready;
    assert.equal(state.rendered.at(-1).text.title, "ja:owner.one");
    assert.ok(state.events.includes("ui:tutorial:list"));
});

test("async event predicates advance once and cannot resume a cancelled step", async (context) => {
    const state = host(context),
        owner = state.owner();
    const target = state.element();
    await owner.target("predicate", { resolve: () => target });
    let accept;
    let calls = 0;
    const definition = await owner.register(
        play([
            {
                id: "predicate",
                titleKey: "a",
                target: "example:predicate",
                advance: {
                    event: "change",
                    accept: () => {
                        calls++;
                        return new Promise((resolve) => {
                            accept = resolve;
                        });
                    },
                },
            },
            { id: "second", titleKey: "b" },
        ]),
    );
    const session = await definition.start();
    await session.ready;
    const view = state.rendered.at(-1);
    const pending = view.interacted({});
    view.interacted({});
    await tick();
    assert.equal(calls, 1);
    await session.cancel();
    accept(true);
    await pending;
    assert.equal(state.api.current(), null);
    assert.equal(
        state.rendered.every((entry) => entry.disposed),
        true,
    );
});

test("route preparation always presents cancellable controls before awaiting navigation", async (context) => {
    const state = host(context),
        owner = state.owner();
    let navigate;
    state.ctx.capabilities.contribute(
        "ui:navigate",
        () =>
            new Promise((resolve) => {
                navigate = resolve;
            }),
    );
    const definition = await owner.register(
        play([{ id: "route", titleKey: "a", route: "/settings" }]),
    );
    const session = await definition.start();
    await tick();
    assert.equal(state.rendered.at(-1).waiting, true);
    await session.cancel();
    navigate(true);
    await tick();
    assert.equal((await session.finished).status, "cancelled");
    assert.equal(
        state.rendered.every((entry) => entry.disposed),
        true,
    );
});

test("withdrawing another owner's published target cancels only the affected session", async (context) => {
    const state = host(context),
        source = state.owner("source"),
        reader = state.owner("reader");
    const target = state.element();
    await source.target("shared", { public: true, resolve: () => target });
    const definition = await reader.register(
        play([{ id: "shared", titleKey: "a", target: "source:shared" }]),
    );
    const session = await definition.start();
    await session.ready;
    source.abort();
    assert.equal((await session.finished).reason, "targetRemoved");
    assert.equal((await state.api.list()).length, 1);
    assert.equal(
        state.rendered.every((entry) => entry.disposed),
        true,
    );
});

test("retained play handles cannot start a later owner's registration with the same ID", async (context) => {
    const state = host(context);
    const originalOwner = state.owner();
    const original = await originalOwner.register(play());
    originalOwner.dispose();
    const replacement = await state.owner().register(play());
    await assert.rejects(original.start(), /tutorial_unavailable/);
    const session = await replacement.start();
    await session.ready;
    original.dispose();
    assert.equal(state.api.current().id, replacement.id);
    await assert.rejects(
        replacement.start({ replace: "yes" }),
        /invalid_tutorial_start/,
    );
});

test("failed feedback cannot leak a rejection or retain a failed session", async (context) => {
    const state = tutorialHost({
        onFeedback: async () => {
            throw new Error("feedback_unavailable");
        },
    });
    context.after(state.dispose);
    const definition = play();
    definition.steps[0].enter = () => {
        throw new Error("setup_failed");
    };
    const registered = await state.owner().register(definition);
    const session = await registered.start();
    assert.equal((await session.finished).status, "failed");
    await tick();
    assert.equal(state.api.current(), null);
    assert.ok(state.rendered.every((entry) => entry.disposed));
    assert.ok(
        state.logs.some((entry) => entry[2]?.operation === "tutorialFeedback"),
    );
});
