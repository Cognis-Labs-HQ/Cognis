import assert from "node:assert/strict";
import test from "node:test";
import { registerTutorials } from "../../../ui/reuse/tutorials/runtime.js";
import { guides } from "../ui/guides.js";
import {
    environment,
    deferred,
    response,
    broadcasts,
    settle,
} from "./fixtures/administration.js";

const guide = guides.find(
    ({ owner }) => owner === "notify.administration.tutorials",
);
const tutorialId = `${guide.owner}:broadcasts`;

async function tutorialEnvironment(options = {}) {
    const env = await environment("broadcasts", options);
    env.root.id = "broadcasts";
    // jsdom needs synthetic geometry for target visibility checks.
    const rect = {
        x: 0,
        y: 0,
        top: 0,
        left: 0,
        right: 120,
        bottom: 24,
        width: 120,
        height: 24,
    };
    env.window.HTMLElement.prototype.getBoundingClientRect = () => rect;
    env.window.HTMLElement.prototype.getClientRects = () => [rect];
    const lifetime = new AbortController();
    const flows = new Map();
    const capabilities = new Map();
    const executed = [];
    const views = [];
    const leases = [];
    const completed = [];
    const errors = [];
    let role = "admin";
    // Execute each registered stage through the public ctx contract.
    const ctx = {
        capabilities: {
            get: (id) => capabilities.get(id),
            contribute: (id, value) => {
                assert.equal(capabilities.has(id), false);
                capabilities.set(id, value);
            },
        },
        registerFlow(id, stages) {
            assert.equal(flows.has(id), false);
            flows.set(id, new Map(stages.map((stage) => [stage, []])));
        },
        extendFlow(id, stage, metadata, handler) {
            assert.equal(typeof handler, "function");
            assert(flows.get(id)?.has(stage), `${id}/${stage}`);
            flows.get(id).get(stage).push(handler);
        },
        async runFlow(id, input) {
            assert(flows.has(id), id);
            executed.push(id);
            const state = { input, data: {} };
            for (const handlers of flows.get(id).values()) {
                for (const handler of handlers) await handler(state);
            }
            return state;
        },
    };
    capabilities.set("session:isAuthenticated", () => true);
    capabilities.set("ui:floatingMenus", {
        request() {
            const lease = {
                disposed: false,
                dispose() {
                    this.disposed = true;
                },
            };
            leases.push(lease);
            return Promise.resolve(lease);
        },
    });
    const api = registerTutorials(ctx, {
        document: env.window.document,
        identity: () => "synthetic-admin",
        role: () => role,
        onComplete: (actor, id) => completed.push({ actor, id }),
        log: (level, message, details) => {
            if (level === "error") errors.push({ message, details });
        },
        // The session owns target selection, progression and cancellation.
        view(options) {
            const view = {
                ...options,
                disposed: false,
                dispose() {
                    this.disposed = true;
                },
            };
            views.push(view);
            return view;
        },
    });
    const dispose = await api.mountPage({
        ...guide,
        root: env.window.document.body,
        signal: lifetime.signal,
        i18n: env.i18n,
    });
    return {
        ...env,
        api,
        lifetime,
        views,
        leases,
        completed,
        executed,
        errors,
        dispose,
        setRole: (value) => {
            role = value;
        },
        current: () =>
            views.filter((view) => !view.disposed && !view.waiting).at(-1),
        async start() {
            const session = await api.start(tutorialId);
            assert.equal(await session.ready, true);
            return session;
        },
        close() {
            lifetime.abort();
            env.close();
        },
    };
}

function assertStep(env, session, id, total, selector) {
    const current = env.current();
    assert.equal(session.state().stepId, id);
    assert.equal(session.state().total, total);
    assert.equal(current.stepId, id);
    assert.equal(current.total, total);
    assert.equal(current.target, env.root.querySelector(selector));
    assert.equal(current.target.isConnected, true);
    assert.equal(current.step.highlightNext, true);
    assert.equal(current.text.title, env.i18n.t(current.step.titleKey));
    assert.equal(current.text.body, env.i18n.t(current.step.bodyKey));
    assert.equal(env.views.filter((view) => !view.disposed).length, 1);
}

for (const [label, rows, total] of [
    ["populated", broadcasts, 3],
    ["empty", [], 2],
]) {
    test(`broadcast guide ${label}: real Next, Back, Restart, completion and Replay`, async () => {
        const env = await tutorialEnvironment({ rows });
        try {
            const audience = env.root.querySelector(
                ".notif-broadcast-role-options",
            );
            const refresh = env.root.querySelector(".notif-broadcast-refresh");
            assert(
                audience.compareDocumentPosition(refresh) &
                    env.window.Node.DOCUMENT_POSITION_FOLLOWING,
            );
            if (rows.length) {
                const publication = env.root.querySelector(
                    ".notif-broadcast-toggle",
                );
                assert(
                    refresh.compareDocumentPosition(publication) &
                        env.window.Node.DOCUMENT_POSITION_FOLLOWING,
                );
            }
            assert.deepEqual(
                (await env.api.list()).map(({ id }) => id),
                [tutorialId],
            );
            const session = await env.start();
            assertStep(
                env,
                session,
                "audience-and-content",
                total,
                ".notif-broadcast-role-options",
            );
            await env.current().actions.next();
            assertStep(
                env,
                session,
                "refresh-list",
                total,
                ".notif-broadcast-refresh",
            );
            if (rows.length) {
                await env.current().actions.next();
                assertStep(
                    env,
                    session,
                    "publication-state",
                    total,
                    ".notif-broadcast-toggle",
                );
            }
            await env.current().actions.back();
            assertStep(
                env,
                session,
                rows.length ? "refresh-list" : "audience-and-content",
                total,
                rows.length
                    ? ".notif-broadcast-refresh"
                    : ".notif-broadcast-role-options",
            );
            await env.current().actions.restart();
            assertStep(
                env,
                session,
                "audience-and-content",
                total,
                ".notif-broadcast-role-options",
            );
            for (let index = 0; index < total; index++)
                await env.current().actions.next();
            assert.equal((await session.finished).status, "completed");
            assert.equal(env.api.current(), null);
            assert.equal(session.signal.aborted, true);
            assert(env.views.every((view) => view.disposed));
            assert(env.leases.every((lease) => lease.disposed));
            assert.deepEqual(env.completed, [
                { actor: "synthetic-admin", id: tutorialId },
            ]);
            const replay = await env.start();
            assertStep(
                env,
                replay,
                "audience-and-content",
                total,
                ".notif-broadcast-role-options",
            );
            env.lifetime.abort();
            assert.equal((await replay.finished).status, "cancelled");
            assert.equal(replay.signal.aborted, true);
            assert.deepEqual(await env.api.list(), []);
            assert(env.views.every((view) => view.disposed));
            assert(env.leases.every((lease) => lease.disposed));
            await assert.rejects(
                env.api.start(tutorialId),
                /tutorial_unavailable/,
            );
            env.dispose();
            assert.deepEqual(
                env.writes(),
                [],
                "guide progression must never send, create or toggle",
            );
            for (const action of [
                "mountPage",
                "start",
                "next",
                "back",
                "restart",
                "complete",
            ]) {
                assert(env.executed.includes(`ui:tutorial:${action}`), action);
            }
            assert.deepEqual(env.errors, []);
        } finally {
            env.close();
        }
    });
}

test("pending broadcast refresh omits disabled publication and refresh stages until replay", async () => {
    const env = await tutorialEnvironment();
    const pending = deferred();
    try {
        env.intercept((request) =>
            request.url === "/api/v1/notify/broadcasts"
                ? pending.promise
                : undefined,
        );
        env.root.querySelector(".notif-broadcast-refresh").click();
        await settle();
        assert.equal(
            env.root.querySelector(".notif-broadcast-refresh").disabled,
            true,
        );
        assert.equal(
            env.root.querySelector(".notif-broadcast-toggle").disabled,
            true,
        );
        const session = await env.start();
        assertStep(
            env,
            session,
            "audience-and-content",
            1,
            ".notif-broadcast-role-options",
        );
        await env.current().actions.next();
        assert.equal((await session.finished).status, "completed");
        assert.deepEqual(
            env.views
                .filter((view) => !view.waiting)
                .map(({ stepId }) => stepId),
            ["audience-and-content"],
        );
        pending.resolve(response(broadcasts));
        await settle();
        assert.equal(
            env.root.querySelector(".notif-broadcast-refresh").disabled,
            false,
        );
        const replay = await env.start();
        assertStep(
            env,
            replay,
            "audience-and-content",
            3,
            ".notif-broadcast-role-options",
        );
        await replay.next();
        assertStep(env, replay, "refresh-list", 3, ".notif-broadcast-refresh");
        await replay.next();
        assertStep(
            env,
            replay,
            "publication-state",
            3,
            ".notif-broadcast-toggle",
        );
        await replay.cancel();
        assert.equal((await replay.finished).status, "cancelled");
        assert(env.views.every((view) => view.disposed));
        assert(env.leases.every((lease) => lease.disposed));
        assert.deepEqual(env.writes(), []);
        assert.deepEqual(env.errors, []);
    } finally {
        pending.resolve(response(broadcasts));
        env.close();
    }
});

test("broadcast guide respects administrator access and page scope", async () => {
    const env = await tutorialEnvironment();
    try {
        env.setRole("user");
        assert.deepEqual(await env.api.list(), []);
        await assert.rejects(env.api.start(tutorialId), /tutorial_unavailable/);
        env.setRole("admin");
        env.root.hidden = true;
        assert.deepEqual(await env.api.list(), []);
        await assert.rejects(env.api.start(tutorialId), /tutorial_unavailable/);
        env.root.hidden = false;
        const session = await env.start();
        env.window.dispatchEvent(
            new env.window.Event("cognis:route-will-change"),
        );
        assert.equal((await session.finished).reason, "navigation");
        assert(env.views.every((view) => view.disposed));
        assert(env.leases.every((lease) => lease.disposed));
        assert.deepEqual(env.writes(), []);
    } finally {
        env.close();
    }
});
