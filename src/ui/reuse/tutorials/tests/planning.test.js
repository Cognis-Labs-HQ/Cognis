import test from "node:test";
import assert from "node:assert/strict";
import { tutorialHost, play, tick } from "./fixtures/host.js";

for (const role of [
    "user",
    "teacher",
    "moderator",
    "admin",
    "owner",
    "unknown",
]) {
    test(`step audience excludes unauthorized content and progress for ${role}`, async (context) => {
        const state = tutorialHost({ role: () => role });
        context.after(state.dispose);
        const registration = await state.owner().register(
            play([
                { id: "one", titleKey: "one" },
                { id: "administration", minRole: "admin", titleKey: "admin" },
                { id: "two", titleKey: "two" },
            ]),
        );
        const session = await registration.start();
        await session.ready;
        const privileged = ["admin", "owner"].includes(role);
        assert.equal(session.state().total, privileged ? 3 : 2);
        await session.next();
        assert.equal(
            session.state().stepId,
            privileged ? "administration" : "two",
        );
        assert.equal(session.state().index, 1);
        if (!privileged)
            assert.ok(
                !state.rendered.some((entry) => entry.text.title === "admin"),
            );
    });
}

test("conditional branches require interaction, rewind on Back, and reset on Restart through staged flows", async (context) => {
    const state = tutorialHost();
    context.after(state.dispose);
    const owner = state.owner();
    await owner.target("search", { resolve: state.element });
    let groupSignal;
    const registration = await owner.register(
        play([
            {
                id: "search",
                target: "example:search",
                titleKey: "search",
                advance: { event: "click" },
                group: "finder",
                enter: (input) => {
                    groupSignal = input.groupSignal;
                },
            },
            {
                id: "query",
                titleKey: "query",
                dependsOn: ["search"],
                group: "finder",
            },
            { id: "hidden", titleKey: "hidden", when: () => false },
            { id: "after", titleKey: "after" },
        ]),
    );
    const session = await registration.start({ firstTime: true });
    await session.ready;
    assert.equal(session.state().total, 2);
    await session.next();
    assert.equal(session.state().stepId, "after");
    await session.back();
    assert.equal(session.state().stepId, "search");
    await state.rendered.at(-1).interacted({ type: "click" });
    await tick();
    assert.equal(session.state().stepId, "query");
    assert.equal(session.state().total, 3);
    const previousGroup = groupSignal;
    await state.rendered.at(-1).actions.restart();
    assert.equal(previousGroup.aborted, true);
    assert.equal(session.state().stepId, "search");
    assert.equal(session.state().total, 2);
    assert.equal(session.state().index, 0);
    assert.ok(state.events.includes("ui:tutorial:restart"));
    await session.next();
    await session.next();
    assert.equal((await session.finished).status, "completed");
    assert.equal(await session.restart(), false);
});

test("conditions receive immutable outcomes and missing targets cannot satisfy a dependency", async (context) => {
    const state = tutorialHost();
    context.after(state.dispose);
    let observed;
    const registration = await state.owner().register(
        play([
            {
                id: "missing",
                titleKey: "missing",
                target: "example:missing",
                missing: { timeoutMs: 0, action: "skip" },
            },
            { id: "dependent", titleKey: "dependent", dependsOn: ["missing"] },
            {
                id: "after",
                titleKey: "after",
                when: (input) => {
                    observed = input;
                    return true;
                },
            },
        ]),
    );
    const session = await registration.start();
    await session.ready;
    assert.equal(session.state().stepId, "after");
    assert.ok(observed.skipped.includes("missing"));
    assert.ok(Object.isFrozen(observed.completed));
    assert.ok(Object.isFrozen(observed));
});

test("invalid dependencies and audiences are rejected at registration; condition failures settle safely", async (context) => {
    const state = tutorialHost();
    context.after(state.dispose);
    const owner = state.owner();
    for (const fields of [
        { minRole: "superuser" },
        { when: true },
        { dependsOn: ["absent"] },
        { dependsOn: ["one"] },
        { dependsOn: "one" },
    ])
        await assert.rejects(
            owner.register(play([{ id: "one", titleKey: "one", ...fields }])),
            /invalid_tutorial_definition/,
        );
    const registration = await owner.register(
        play([{ id: "one", titleKey: "one", when: () => "yes" }]),
    );
    const session = await registration.start();
    assert.equal((await session.finished).status, "failed");
    assert.equal(await session.ready, false);
    assert.equal(state.feedback.length, 1);
});

test("priority banner actions release navigation atomically through the tutorial flow", async (context) => {
    const state = tutorialHost();
    context.after(state.dispose);
    const registration = await state
        .owner()
        .register(
            play([{ id: "one", titleKey: "one", preventNavigation: true }]),
        );
    const session = await registration.start({ firstTime: true });
    await session.ready;
    const navigation = () => {
        const event = new CustomEvent("cognis:route-before-navigate", {
            cancelable: true,
            detail: { path: "/settings" },
        });
        state.window.dispatchEvent(event);
        return event.defaultPrevented;
    };
    assert.equal(navigation(), true);
    state.rendered.at(-1).actions.priority();
    assert.equal(navigation(), false);
    assert.equal((await session.finished).reason, "priorityAction");
    assert.ok(state.events.includes("ui:tutorial:priority"));
});

test("losing the required role invalidates a privileged stage and removes it from the remaining path", async (context) => {
    let role = "admin";
    const state = tutorialHost({ role: () => role });
    context.after(state.dispose);
    const registration = await state.owner().register(
        play([
            { id: "administration", titleKey: "admin", minRole: "admin" },
            { id: "after", titleKey: "after" },
        ]),
    );
    const session = await registration.start();
    await session.ready;
    const current = state.rendered.at(-1);
    role = "user";
    assert.equal(current.valid(), false);
    current.lost();
    await tick();
    assert.equal(session.state().stepId, "after");
    assert.equal(session.state().total, 1);
    assert.equal(session.state().index, 0);
});

for (const grouped of [true, false]) {
    test(`Back reopens the beginning of a completed ${grouped ? "group" : "dependency branch"}`, async (context) => {
        const state = tutorialHost();
        context.after(state.dispose);
        const owner = state.owner();
        await owner.target("opener", { resolve: state.element });
        const registration = await owner.register(
            play([
                {
                    id: "open",
                    titleKey: "open",
                    target: "example:opener",
                    advance: { event: "click" },
                    ...(grouped ? { group: "finder" } : {}),
                },
                {
                    id: "query",
                    titleKey: "query",
                    dependsOn: ["open"],
                    ...(grouped ? { group: "finder" } : {}),
                },
                {
                    id: "close",
                    titleKey: "close",
                    dependsOn: ["open"],
                    ...(grouped ? { group: "finder" } : {}),
                },
                { id: "after", titleKey: "after" },
            ]),
        );
        const session = await registration.start({ firstTime: true });
        await session.ready;
        await state.rendered.at(-1).interacted({ type: "click" });
        await tick();
        await session.next();
        await session.back();
        assert.equal(
            session.state().stepId,
            "query",
            "Back inside a branch remains sequential",
        );
        await session.next();
        await session.next();
        assert.equal(session.state().stepId, "after");
        await session.back();
        assert.equal(session.state().stepId, "open");
        assert.equal(
            session.state().total,
            2,
            "the closed branch outcomes are reset",
        );
        await tick();
        assert.equal(
            session.state().stepId,
            "open",
            "the branch cannot auto-skip back to its exit",
        );
    });
}

test("optional stages are counted after asynchronous setup reveals their controls", async (context) => {
    const state = tutorialHost();
    context.after(state.dispose);
    let visible = false;
    const owner = state.owner();
    const control = state.element();
    const target = await owner.target("optional", {
        resolve: () => (visible ? control : null),
    });
    const registered = await owner.register(
        play([
            {
                id: "open",
                titleKey: "open",
                enter: async () => {
                    visible = true;
                },
            },
            {
                id: "optional",
                titleKey: "optional",
                target: target.id,
                when: ({ targetAvailable }) => targetAvailable,
            },
        ]),
    );
    const session = await registered.start();
    await session.ready;
    assert.equal(state.rendered.at(-1).total, 2);
    await session.next();
    assert.equal(session.state().stepId, "optional");
    await session.next();
    assert.equal((await session.finished).status, "completed");
});
