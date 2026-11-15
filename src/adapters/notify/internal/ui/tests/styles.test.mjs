import test from "node:test";
import assert from "node:assert/strict";
import { fixture, settle } from "./fixture.mjs";

const selector =
    'link[href="/static/gateways/notify-internal/notifications.css"]';
const links = (environment) => [
    ...environment.document.querySelectorAll(selector),
];
const latest = (environment) => links(environment).at(-1);
const styleTimers = (environment) =>
    [...environment.timers].filter(([, timer]) => timer.delay === 5000);

function event(environment, link, name) {
    if (name === "load")
        Object.defineProperty(link, "sheet", { value: {}, configurable: true });
    link.dispatchEvent(new environment.window.Event(name));
}

function assertMounted(environment, mounting) {
    assert.equal(mounting.completed, true);
    assert.equal(
        environment.document.querySelectorAll("#notification-toggle").length,
        1,
    );
    assert.equal(
        environment.document.querySelectorAll(".notification-item").length,
        1,
    );
    assert.ok(environment.flowCalls.includes("notify:internal:readInbox"));
    assert.ok(
        environment.requests.every((request) => request.method === "GET"),
    );
}

function assertQuiet(environment) {
    assert.equal(
        environment.document.querySelector("#notification-toggle"),
        null,
    );
    assert.equal(environment.requests.length, 0);
    assert.equal(environment.flowCalls.length, 0);
    assert.equal(environment.notices.length, 0);
}

async function setup(context, options = {}) {
    const environment = await fixture({
        styles: "absent",
        deferMount: true,
        realI18n: true,
        ...options,
    });
    context.after(environment.close);
    return environment;
}

for (const styles of ["absent", "pending"]) {
    test(`${styles} style failure degrades explicitly and a later mount loads a fresh attempt`, async (context) => {
        const environment = await setup(context, { styles });
        const first = environment.mount();
        await settle();
        const failed = latest(environment);
        assert.equal(first.completed, false);
        assertQuiet(environment);
        event(environment, failed, "error");
        await settle();
        assertMounted(environment, first);
        assert.equal(
            environment.notices[0][0],
            await environment.translate("adapter.notify.internal.error_styles"),
        );
        assert.equal(environment.notices[0][1].variant, "error");
        assert.equal(environment.logs.length, 1);
        assert.equal(styleTimers(environment).length, 0);
        first.controller.abort();
        assert.equal(environment.dismissedNotices.length, 1);
        const second = environment.mount();
        await settle();
        const retry = latest(environment);
        assert.notEqual(retry, failed);
        assert.equal(second.completed, false);
        assert.equal(failed.isConnected, styles === "pending");
        event(environment, retry, "load");
        await settle();
        assertMounted(environment, second);
        assert.equal(environment.notices.length, 1);
        assert.equal(styleTimers(environment).length, 0);
        assert.equal(links(environment).length, styles === "pending" ? 2 : 1);
    });

    test(`${styles} pending styles remain useful after one waiter is canceled`, async (context) => {
        const environment = await setup(context, { styles });
        const first = environment.mount();
        const pending = latest(environment);
        const second = environment.mount();
        first.controller.abort();
        await settle();
        assert.equal(first.completed, true);
        assert.equal(second.completed, false);
        assert.equal(latest(environment), pending);
        assert.equal(styleTimers(environment).length, 1);
        assertQuiet(environment);
        event(environment, pending, "load");
        await settle();
        assertMounted(environment, second);
        assert.equal(environment.logs.length, 0);
    });

    for (const terminal of ["error", "load"]) {
        test(`${styles} resource observes ${terminal} after every waiter aborts`, async (context) => {
            const environment = await setup(context, { styles });
            const first = environment.mount();
            const second = environment.mount();
            const resource = latest(environment);
            first.controller.abort();
            second.controller.abort();
            await settle();
            assert.equal(first.completed, true);
            assert.equal(second.completed, true);
            event(environment, resource, terminal);
            await settle();
            assertQuiet(environment);
            assert.equal(styleTimers(environment).length, 0);
            const third = environment.mount();
            await settle();
            if (terminal === "error") {
                const retry = latest(environment);
                assert.notEqual(retry, resource);
                event(environment, retry, "load");
                await settle();
            } else assert.equal(latest(environment), resource);
            assertMounted(environment, third);
        });
    }

    test(`${styles} missing terminal event has one bounded wait and permits later recovery`, async (context) => {
        const environment = await setup(context, { styles });
        const first = environment.mount();
        const stalled = latest(environment);
        const [timerId, timer] = styleTimers(environment)[0];
        environment.timers.delete(timerId);
        timer.callback();
        await settle();
        assertMounted(environment, first);
        assert.equal(environment.logs[0][1].reason, "timeout");
        assert.equal(environment.notices.length, 1);
        assert.equal(styleTimers(environment).length, 0);
        assert.equal(stalled.isConnected, styles === "pending");
        first.controller.abort();
        const second = environment.mount();
        await settle();
        const retry = latest(environment);
        assert.notEqual(retry, stalled);
        event(environment, stalled, "error");
        event(environment, stalled, "load");
        await settle();
        assert.equal(second.completed, false);
        assert.equal(environment.logs.length, 1);
        assert.equal(styleTimers(environment).length, 1);
        event(environment, retry, "load");
        await settle();
        assertMounted(environment, second);
    });
}

test("healthy external styles retain attributes and identity across repeated provider mounts", async (context) => {
    const environment = await setup(context, { styles: "loaded" });
    const healthy = latest(environment);
    healthy.dataset.externalOwner = "fixture";
    healthy.media = "screen";
    const markup = healthy.outerHTML;
    for (let index = 0; index < 3; index++) {
        const mounting = environment.mount();
        await settle();
        assertMounted(environment, mounting);
        assert.equal(latest(environment), healthy);
        assert.equal(healthy.outerHTML, markup);
        assert.equal(styleTimers(environment).length, 0);
        mounting.controller.abort();
        assert.equal(
            environment.document.querySelector("#notification-toggle"),
            null,
        );
    }
});

test("repeated failures create one attempt per mount without an automatic retry loop", async (context) => {
    const environment = await setup(context);
    const attempts = new Set();
    for (let index = 0; index < 3; index++) {
        const mounting = environment.mount();
        const resource = latest(environment);
        assert.ok(!attempts.has(resource));
        attempts.add(resource);
        event(environment, resource, "error");
        await settle();
        assertMounted(environment, mounting);
        assert.equal(links(environment).length, 0);
        assert.equal(styleTimers(environment).length, 0);
        assert.equal(environment.logs.length, index + 1);
        mounting.controller.abort();
    }
    const mounting = environment.mount();
    event(environment, latest(environment), "load");
    await settle();
    assertMounted(environment, mounting);
    assert.equal(environment.notices.length, 3);
});

test("abort during retry neither publishes stale UI nor invalidates the current shared waiter", async (context) => {
    const environment = await setup(context);
    const first = environment.mount();
    const failed = latest(environment);
    event(environment, failed, "error");
    await settle();
    first.controller.abort();
    const readsBefore = environment.requests.length;
    const retrying = environment.mount();
    const retry = latest(environment);
    const current = environment.mount();
    retrying.controller.abort();
    await settle();
    event(environment, failed, "load");
    event(environment, failed, "error");
    await settle();
    assert.equal(current.completed, false);
    assert.equal(retrying.completed, true);
    assert.equal(environment.requests.length, readsBefore);
    assert.equal(
        environment.document.querySelector("#notification-toggle"),
        null,
    );
    assert.equal(latest(environment), retry);
    event(environment, retry, "load");
    await settle();
    assertMounted(environment, current);
    assert.equal(environment.logs.length, 1);
});

test("already-aborted scopes create no stylesheet, fetch or publication", async (context) => {
    const environment = await setup(context);
    const controller = new environment.window.AbortController();
    controller.abort();
    const mounting = environment.mount({ controller });
    await settle();
    assert.equal(mounting.completed, true);
    assert.equal(links(environment).length, 0);
    assert.equal(styleTimers(environment).length, 0);
    assertQuiet(environment);
});

test("external style that loads after timeout remains reusable without mutation", async (context) => {
    const environment = await setup(context, { styles: "pending" });
    const external = latest(environment);
    const markup = external.outerHTML;
    const mounting = environment.mount();
    const [timerId, timer] = styleTimers(environment)[0];
    environment.timers.delete(timerId);
    timer.callback();
    await settle();
    mounting.controller.abort();
    event(environment, external, "load");
    const current = environment.mount();
    await settle();
    assertMounted(environment, current);
    assert.equal(links(environment).length, 1);
    assert.equal(external.outerHTML, markup);
});

for (const bundleFirst of [false, true]) {
    test(`direct and bundled providers share pending and failed attempts with bundle first ${bundleFirst}`, async (context) => {
        const environment = await setup(context, {
            styles: "pending",
            bundle: true,
        });
        const first = environment.mount({ bundle: bundleFirst });
        const second = environment.mount({ bundle: !bundleFirst });
        const failed = latest(environment);
        assert.equal(styleTimers(environment).length, 1);
        first.controller.abort();
        second.controller.abort();
        event(environment, failed, "error");
        await settle();
        assertQuiet(environment);
        assert.equal(environment.logs.length, 1);
        const third = environment.mount({ bundle: bundleFirst });
        const retry = latest(environment);
        assert.notEqual(retry, failed);
        const fourth = environment.mount({ bundle: !bundleFirst });
        third.controller.abort();
        assert.equal(latest(environment), retry);
        assert.equal(styleTimers(environment).length, 1);
        event(environment, failed, "load");
        await settle();
        assert.equal(fourth.completed, false);
        event(environment, retry, "load");
        await settle();
        assertMounted(environment, fourth);
        fourth.controller.abort();
        const fifth = environment.mount({ bundle: bundleFirst });
        await settle();
        assertMounted(environment, fifth);
        assert.equal(styleTimers(environment).length, 0);
    });
}

test("degraded and recovered mounts retain the workspace bell and panel targets", async (context) => {
    const environment = await setup(context);
    const first = environment.mount();
    event(environment, latest(environment), "error");
    await settle();
    await environment.click("#notification-toggle");
    assert.equal(
        environment.document.querySelectorAll(".notification-panel").length,
        1,
    );
    assert.equal(
        environment.document.querySelector(".notification-panel").hidden,
        false,
    );
    first.controller.abort();
    assert.equal(
        environment.document.querySelector(".notification-panel"),
        null,
    );
    const second = environment.mount();
    event(environment, latest(environment), "load");
    await settle();
    assertMounted(environment, second);
    await environment.click("#notification-toggle");
    assert.equal(
        environment.document.querySelector(".notification-panel").hidden,
        false,
    );
    await environment.click("#notification-toggle");
    assert.equal(
        environment.document.querySelector(".notification-panel").hidden,
        true,
    );
});

test("an unavailable English style-error translation rejects the mount explicitly", async (context) => {
    const key = "adapter.notify.internal.error_styles";
    const environment = await setup(context, {
        missingTranslations: { en: [key] },
    });
    const mounting = environment.mount();
    const rejected = assert.rejects(
        mounting.promise,
        (error) => error.code === "missing_translation" && error.key === key,
    );
    event(environment, latest(environment), "error");
    await rejected;
    assert.equal(
        environment.document.querySelector("#notification-toggle"),
        null,
    );
    assert.equal(environment.notices.length, 0);
    assert.equal(environment.flowCalls.length, 0);
});
