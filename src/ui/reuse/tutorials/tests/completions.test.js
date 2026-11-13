import assert from "node:assert/strict";
import test from "node:test";
import { createTutorialCompletions } from "../completions.js";

function host(database = new Map(), legacy = new Map()) {
    let actor = "alice";
    let failRead = false;
    let failWrite = false;
    const calls = [];
    const storage = {
        get length() {
            return legacy.size;
        },
        key: (index) => [...legacy.keys()][index],
        getItem: (key) => legacy.get(key),
        removeItem: (key) => legacy.delete(key),
    };
    const completions = createTutorialCompletions({
        account: () => actor,
        identity: () => actor,
        storage: () => storage,
        request: async (_path, options) => {
            const owner = actor;
            calls.push({ owner, ...options });
            if (options.method === "POST") {
                if (failWrite) return new Response(null, { status: 503 });
                const ids = database.get(owner) ?? new Set();
                for (const id of JSON.parse(options.body).ids) ids.add(id);
                database.set(owner, ids);
                return new Response(null, { status: 204 });
            }
            return new Response(
                JSON.stringify({ data: [...(database.get(owner) ?? [])] }),
                { status: failRead ? 503 : 200 },
            );
        },
    });
    return {
        completions,
        calls,
        database,
        legacy,
        actor: (value) => {
            actor = value;
        },
        failRead: (value) => {
            failRead = value;
        },
        failWrite: (value) => {
            failWrite = value;
        },
    };
}

test("completion follows an account across browsers and keeps other accounts independent", async () => {
    const first = host();
    await first.completions.complete("alice", "ui.dashboard:overview");
    const anotherBrowser = host(first.database);
    assert.deepEqual(
        await anotherBrowser.completions.load("alice"),
        new Set(["ui.dashboard:overview"]),
    );
    anotherBrowser.actor("bob");
    assert.deepEqual(await anotherBrowser.completions.load("bob"), new Set());
    await assert.rejects(
        anotherBrowser.completions.complete("alice", "ui.dashboard:overview"),
        /identity_changed/,
    );
});

test("legacy completion migrates only for the signed-in account and is removed after database acknowledgement", async () => {
    const legacy = new Map([
        ["cognis_tutorial:alice:ui.dashboard:overview", "completed"],
        ["cognis_tutorial:bob:ui.dashboard:overview", "completed"],
    ]);
    const state = host(new Map(), legacy);
    state.failWrite(true);
    await assert.rejects(state.completions.load("alice"), /save_failed/);
    assert.equal(legacy.size, 2);
    state.failWrite(false);
    assert.deepEqual(
        await state.completions.load("alice"),
        new Set(["ui.dashboard:overview"]),
    );
    assert.deepEqual(
        [...legacy.keys()],
        ["cognis_tutorial:bob:ui.dashboard:overview"],
    );
    assert.deepEqual(
        state.database.get("alice"),
        new Set(["ui.dashboard:overview"]),
    );
});

test("failed database reads and writes stay retryable and never become successful completion", async () => {
    const state = host();
    state.failRead(true);
    await assert.rejects(state.completions.load("alice"), /load_failed/);
    state.failRead(false);
    state.failWrite(true);
    await assert.rejects(
        state.completions.complete("alice", "ui.dashboard:overview"),
        /save_failed/,
    );
    assert.deepEqual(await state.completions.load("alice"), new Set());
    state.failWrite(false);
    await state.completions.complete("alice", "ui.dashboard:overview");
    assert.deepEqual(
        await state.completions.load("alice"),
        new Set(["ui.dashboard:overview"]),
    );
});

test("an account switch while loading cannot publish another account's completion", async () => {
    let resolve;
    let actor = "alice";
    const completions = createTutorialCompletions({
        account: () => actor,
        identity: () => actor,
        storage: () => undefined,
        request: () =>
            new Promise((done) => {
                resolve = done;
            }),
    });
    const pending = completions.load("alice");
    actor = "bob";
    resolve(new Response(JSON.stringify({ data: ["ui.dashboard:overview"] })));
    await assert.rejects(pending, /identity_changed/);
});

import { tutorialHost, play, tick } from "./fixtures/host.js";

test("a finished guide waits for account completion acknowledgement before settling", async (context) => {
    let acknowledge;
    const saved = new Promise((resolve) => {
        acknowledge = resolve;
    });
    const state = tutorialHost({
        identity: () => "alice",
        onComplete: () => saved,
    });
    context.after(state.dispose);
    const handle = await state.owner().register(play());
    const session = await handle.start();
    await session.ready;
    await session.next();
    await session.next();
    let settled = false;
    void session.finished.then(() => {
        settled = true;
    });
    await tick();
    assert.equal(settled, false);
    acknowledge();
    assert.equal((await session.finished).status, "completed");
    assert.ok(state.events.includes("ui:tutorial:complete"));
});

test("completion persistence failures report failure rather than acknowledging account completion", async (context) => {
    const state = tutorialHost({
        identity: () => "alice",
        onComplete: async () => {
            throw new Error("tutorial_completion_save_failed");
        },
    });
    context.after(state.dispose);
    const handle = await state.owner().register(play());
    const session = await handle.start();
    await session.ready;
    await session.next();
    await session.next();
    assert.equal((await session.finished).status, "failed");
    await tick();
    assert.deepEqual(state.feedback, [["completion"]]);
});

test("new page discovery revalidates completion saved by another browser", async () => {
    const first = host();
    const another = host(first.database);
    assert.deepEqual(await another.completions.load("alice"), new Set());
    await first.completions.complete("alice", "ui.dashboard:overview");
    another.completions.invalidate();
    assert.deepEqual(
        await another.completions.load("alice"),
        new Set(["ui.dashboard:overview"]),
    );
});
