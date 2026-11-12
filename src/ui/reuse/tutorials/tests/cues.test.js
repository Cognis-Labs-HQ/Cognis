import test from "node:test";
import assert from "node:assert/strict";
import { tutorialHost, play } from "./fixtures/host.js";

test("authors control the Next cue per stage through the registered manifest", async (context) => {
    const state = tutorialHost();
    context.after(state.dispose);
    const registration = await state.owner().register(
        play([
            { id: "explain", titleKey: "explain", highlightNext: true },
            { id: "quiet", titleKey: "quiet", highlightNext: false },
            { id: "default", titleKey: "default" },
        ]),
    );
    const session = await registration.start();
    await session.ready;
    assert.equal(state.rendered.at(-1).step.highlightNext, true);
    await session.next();
    assert.equal(state.rendered.at(-1).step.highlightNext, false);
    await session.next();
    assert.equal(state.rendered.at(-1).step.highlightNext, false);
    assert.ok(state.events.includes("ui:tutorial:register"));
    assert.ok(state.events.includes("ui:tutorial:next"));
});

test("Next cue flags reject malformed values before publication", async (context) => {
    const state = tutorialHost();
    context.after(state.dispose);
    const owner = state.owner();
    for (const highlightNext of ["true", 1, null, {}]) {
        await assert.rejects(
            owner.register(
                play([{ id: "one", titleKey: "one", highlightNext }]),
            ),
            /invalid_tutorial_definition/,
        );
    }
    assert.deepEqual(await state.api.list(), []);
});
