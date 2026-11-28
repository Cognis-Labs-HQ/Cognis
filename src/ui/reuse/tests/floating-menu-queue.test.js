import test from "node:test";
import assert from "node:assert/strict";
import { flowHost } from "./fixtures/flow-host.js";
import { registerFloatingMenus } from "../floating-menu-queue.js";

function host(context) {
    const lifetime = new AbortController();
    context.after(() => lifetime.abort());
    const state = flowHost(lifetime.signal);
    return { ...state, lifetime, queue: registerFloatingMenus(state.ctx) };
}

test("tutorial reservation suspends a page menu across step replacements and yields through release", async (context) => {
    const state = host(context);
    const page = await state.queue.request({});
    const actions = { hidden: true };
    await page.present(actions);
    assert.equal(actions.hidden, false);
    const tutorial = await state.queue.request({ priority: 100 });
    assert.equal(actions.hidden, true);
    const first = { hidden: true },
        second = { hidden: true };
    await tutorial.present(first);
    assert.equal(first.hidden, false);
    await tutorial.dismiss(first);
    assert.equal(actions.hidden, true, "the reservation holds between steps");
    await tutorial.present(second);
    await tutorial.dismiss(first);
    assert.equal(
        second.hidden,
        false,
        "stale cleanup cannot hide the replacement",
    );
    await tutorial.dispose();
    assert.equal(second.hidden, true);
    assert.equal(actions.hidden, false);
    for (const name of ["request", "present", "dismiss", "release"])
        assert.ok(state.events.includes(`ui:floatingMenu:${name}`));
});

test("equal priority menus queue in order, hidden slots yield, and aborted waiters never present", async (context) => {
    const state = host(context);
    const first = await state.queue.request({});
    const second = await state.queue.request({});
    const controller = new AbortController();
    const cancelled = await state.queue.request({ signal: controller.signal });
    const one = { hidden: true },
        two = { hidden: true },
        three = { hidden: true };
    await first.present(one);
    await second.present(two);
    await cancelled.present(three);
    assert.equal(one.hidden, false);
    assert.equal(two.hidden, true);
    controller.abort();
    assert.equal(await cancelled.ready, false);
    await first.present(one, { visible: false });
    assert.equal(two.hidden, false);
    assert.equal(three.hidden, true);
    assert.equal(await cancelled.present(three), false);
    await first.dispose();
    await second.dispose();
    assert.equal(await second.dispose(), false);
});

test("queue teardown releases waiters and invalid priorities cannot claim a slot", async (context) => {
    const state = host(context);
    await state.queue.request({ priority: 100 });
    const waiting = await state.queue.request({});
    await assert.rejects(
        state.queue.request({ priority: NaN }),
        /invalid_floating_menu_priority/,
    );
    state.lifetime.abort();
    assert.equal(await waiting.ready, false);
    assert.equal(state.ctx.capabilities.get("ui:floatingMenus"), undefined);
});

test("late presentation flows cannot replace newer menu content", async (context) => {
    const state = host(context);
    const lease = await state.queue.request({});
    const first = { hidden: true },
        second = { hidden: true };
    let release;
    const gate = new Promise((resolve) => {
        release = resolve;
    });
    state.ctx.extendFlow(
        "ui:floatingMenu:present",
        "validate",
        { id: "test:delayedPresentation" },
        async ({ input }) => {
            if (input.element === first) await gate;
        },
    );
    const pending = lease.present(first);
    await lease.present(second);
    release();
    assert.equal(await pending, false);
    assert.equal(first.hidden, true);
    assert.equal(second.hidden, false);
});

test("failed queue installation rolls back and can register a working replacement", async (context) => {
    const lifetime = new AbortController();
    context.after(() => lifetime.abort());
    const state = flowHost(lifetime.signal);
    const extend = state.ctx.extendFlow;
    state.ctx.extendFlow = (id, ...args) => {
        if (id === "ui:floatingMenu:present")
            throw new Error("registration_failed");
        return extend(id, ...args);
    };
    assert.throws(
        () => registerFloatingMenus(state.ctx),
        /registration_failed/,
    );
    state.ctx.extendFlow = extend;
    const queue = registerFloatingMenus(state.ctx);
    assert.equal(queue.version, 1);
    assert.equal(state.ctx.capabilities.get("ui:floatingMenus"), queue);
    assert.equal(registerFloatingMenus(state.ctx), queue);
    const lease = await queue.request({});
    const element = { hidden: true };
    await lease.present(element);
    assert.equal(element.hidden, false);
});
