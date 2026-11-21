import test from "node:test";
import assert from "node:assert/strict";
import { fixture, settle, deferred } from "./fixture.mjs";

async function mount(context, options = {}) {
    const environment = await fixture(options);
    context.after(environment.close);
    environment.actions = [];
    environment.commands = [];
    environment.opened = [];
    environment.window.open = (...args) => environment.opened.push(args);
    environment.window.addEventListener(
        "cognis:notification-action",
        (event) => {
            environment.actions.push(event.detail.actionUrl);
        },
    );
    environment.window.addEventListener(
        "cognis:notification-command",
        (event) => {
            environment.commands.push(event.detail);
        },
    );
    return environment;
}

async function surface(environment, kind, changes = {}) {
    if (kind === "row") {
        Object.assign(environment.state.rows[0], changes);
        await environment.click("#notification-toggle");
        return environment.document.querySelector(".notification-item");
    }
    environment.state.rows.push({
        ...environment.state.rows[0],
        id: "synthetic-arrival",
        ...changes,
    });
    await environment.poll();
    return environment.document.querySelector(".arrival-toast");
}

async function activate(environment, element, options = {}) {
    const { type = "click", ...input } = options;
    const event = new environment.window.MouseEvent(type, {
        bubbles: true,
        cancelable: true,
        button: 0,
        detail: 0,
        ...input,
    });
    let browserDefault = false;
    const browserBoundary = (observed) => {
        if (observed !== event) return;
        browserDefault = !observed.defaultPrevented;
        // Observe ownership before suppressing jsdom's unimplemented navigation.
        observed.preventDefault();
    };
    environment.document.addEventListener(type, browserBoundary);
    element.dispatchEvent(event);
    environment.document.removeEventListener(type, browserBoundary);
    await settle();
    return { event, browserDefault };
}

function writes(environment) {
    return environment.requests.filter((request) =>
        ["PUT", "DELETE"].includes(request.method),
    );
}

function navigations(environment) {
    return environment.requests.filter(
        (request) => request.method === "NAVIGATE",
    );
}

for (const kind of ["row", "arrival"]) {
    for (const read of kind === "row" ? [false, true] : [false]) {
        test(`${kind} ${read ? "read" : "unread"} destination is a focusable, named native link`, async (context) => {
            const environment = await mount(context);
            const owner = await surface(environment, kind, { read });
            const link = owner.querySelector("a.notification-primary");
            assert.ok(link);
            assert.equal(
                link.href,
                "https://synthetic.invalid/synthetic-destination",
            );
            assert.equal(link.getAttribute("aria-label"), "Synthetic Notice");
            assert.equal(link.querySelector("a, button"), null);
            link.focus();
            assert.equal(environment.document.activeElement, link);
            const { event, browserDefault } = await activate(environment, link);
            assert.equal(event.defaultPrevented, true);
            assert.equal(browserDefault, false);
            assert.equal(navigations(environment).length, 1);
            assert.equal(writes(environment).length, read ? 0 : 1);
            assert.equal(environment.actions.length, 1);
        });
    }

    for (const modifier of [
        "ctrlKey",
        "metaKey",
        "shiftKey",
        "altKey",
        "middle",
    ]) {
        test(`${kind} ${modifier} keeps the native link default without writes or current-tab navigation`, async (context) => {
            const environment = await mount(context);
            const owner = await surface(environment, kind);
            const primary = owner.querySelector(".notification-primary");
            const options =
                modifier === "middle"
                    ? { type: "auxclick", button: 1 }
                    : { [modifier]: true };
            const result = await activate(environment, primary, options);
            assert.equal(result.browserDefault, true);
            assert.equal(writes(environment).length, 0);
            assert.equal(navigations(environment).length, 0);
            assert.equal(environment.actions.length, 1);
            assert.equal(owner.isConnected, true);
            assert.equal(owner.classList.contains("arrival-toast--out"), false);
        });
    }

    for (const modified of [false, true]) {
        test(`${kind} cancelable destination event blocks ${modified ? "modified" : "ordinary"} navigation`, async (context) => {
            const environment = await mount(context);
            const owner = await surface(environment, kind);
            environment.window.addEventListener(
                "cognis:notification-action",
                (event) => event.preventDefault(),
            );
            const result = await activate(
                environment,
                owner.querySelector(".notification-primary"),
                { ctrlKey: modified },
            );
            assert.equal(result.browserDefault, false);
            assert.equal(result.event.defaultPrevented, true);
            assert.equal(environment.actions.length, 1);
            assert.equal(navigations(environment).length, 0);
            assert.equal(writes(environment).length, modified ? 0 : 1);
        });
    }

    test(`${kind} external link has native safe target and uses the existing external navigation boundary`, async (context) => {
        const environment = await mount(context);
        const owner = await surface(environment, kind, {
            actionUrl: "https://example.invalid/path?q=1#section",
        });
        const primary = owner.querySelector("a.notification-primary");
        assert.equal(primary.target, "_blank");
        assert.equal(primary.rel, "noopener noreferrer");
        await activate(environment, primary);
        assert.deepEqual(environment.opened, [
            [
                "https://example.invalid/path?q=1#section",
                "_blank",
                "noopener,noreferrer",
            ],
        ]);
        assert.equal(navigations(environment).length, 0);
    });

    test(`${kind} link preserves normalized path, query and fragment as escaped data`, async (context) => {
        const environment = await mount(context);
        const subject = '<img src=x onerror=alert(1)> "Notice"';
        const owner = await surface(environment, kind, {
            subject,
            actionUrl: '/next?q="quoted"&other=2#part',
        });
        const primary = owner.querySelector("a.notification-primary");
        assert.equal(primary.getAttribute("aria-label"), subject);
        assert.equal(primary.querySelector("img"), null);
        assert.equal(primary.textContent.includes(subject), true);
        assert.equal(
            primary.href,
            "https://synthetic.invalid/next?q=%22quoted%22&other=2#part",
        );
        await activate(environment, primary);
        assert.equal(
            navigations(environment)[0].path,
            "/next?q=%22quoted%22&other=2#part",
        );
    });

    test(`${kind} native nonlinked button performs its own action once`, async (context) => {
        const environment = await mount(context, { realI18n: true });
        const owner = await surface(environment, kind, { actionUrl: null });
        const primary = owner.querySelector("button.notification-primary");
        assert.ok(primary);
        assert.equal(primary.type, "button");
        assert.match(
            primary.getAttribute("aria-label"),
            kind === "row"
                ? /Mark Notification as Read/
                : /Open Notification Inbox/,
        );
        assert.match(primary.getAttribute("aria-label"), /Synthetic Notice/);
        primary.focus();
        assert.equal(environment.document.activeElement, primary);
        await activate(environment, primary);
        assert.equal(writes(environment).length, 1);
        assert.equal(navigations(environment).length, 0);
        assert.equal(
            environment.document.querySelector(".notification-panel").hidden,
            false,
        );
    });

    test(`${kind} repeated nonlinked button activation cannot duplicate a pending write`, async (context) => {
        const environment = await mount(context);
        const owner = await surface(environment, kind, { actionUrl: null });
        const primary = owner.querySelector("button.notification-primary");
        const pending = deferred();
        environment.state.intercept = (path, init) =>
            init.method === "PUT" ? pending.promise : undefined;
        await activate(environment, primary);
        await activate(environment, primary);
        assert.equal(writes(environment).length, 1);
        assert.equal(
            environment.document.querySelector(".notification-panel").hidden,
            false,
        );
        pending.resolve(Response.json({ data: { ok: true } }));
        await settle();
    });

    for (const lifecycle of [
        "account",
        "token",
        "provider",
        "removed",
        "refresh",
        "page",
    ]) {
        test(`${kind} stale ${lifecycle} controls suppress ordinary and modified native defaults`, async (context) => {
            const environment = await mount(context);
            const owner = await surface(environment, kind);
            const primary = owner.querySelector(".notification-primary");
            if (lifecycle === "account" || lifecycle === "token") {
                environment.window.localStorage.setItem(
                    lifecycle === "account"
                        ? "cognis_account"
                        : "cognis_access_token",
                    "different-synthetic-identity",
                );
            } else if (lifecycle === "provider")
                environment.providerController.abort();
            else if (lifecycle === "removed") owner.remove();
            else if (lifecycle === "page")
                await environment.uiCtx.runFlow("page:mounted", {});
            else {
                environment.state.rows = environment.state.rows.map((row) => ({
                    ...row,
                    subject: "Updated",
                    actionUrl: "/current",
                }));
                await environment.poll();
            }
            for (const options of [
                {},
                { ctrlKey: true },
                { type: "auxclick", button: 1 },
            ]) {
                const result = await activate(environment, primary, options);
                assert.equal(result.event.defaultPrevented, true);
                assert.equal(result.browserDefault, false);
            }
            assert.equal(writes(environment).length, 0);
            assert.equal(navigations(environment).length, 0);
            assert.equal(environment.actions.length, 0);
            if (lifecycle === "refresh") {
                const current = environment.document.querySelector(
                    kind === "row" ? ".notification-item" : ".arrival-toast",
                );
                await activate(
                    environment,
                    current.querySelector(".notification-primary"),
                );
                assert.equal(navigations(environment)[0].path, "/current");
                assert.equal(writes(environment).length, 1);
            }
        });
    }

    test(`${kind} commands and dismiss are sibling buttons independent of the primary destination`, async (context) => {
        const environment = await mount(context);
        const owner = await surface(environment, kind, {
            metadata: {
                continuous: kind === "arrival",
                expiresAt: Date.now() + 10000,
                actions: [{ id: "accept", label: "Accept Synthetic Action" }],
            },
        });
        const primary = owner.querySelector(".notification-primary");
        const command = owner.querySelector("[data-notification-action]");
        assert.equal(primary.contains(command), false);
        command.focus();
        assert.equal(environment.document.activeElement, command);
        await activate(environment, command);
        assert.equal(environment.commands.length, 1);
        assert.equal(environment.actions.length, 0);
        assert.equal(navigations(environment).length, 0);
        assert.equal(writes(environment).length, kind === "arrival" ? 1 : 0);
        if (kind === "row") {
            const dismiss = owner.querySelector(".notification-dismiss");
            assert.equal(primary.contains(dismiss), false);
            await activate(environment, dismiss);
            assert.equal(writes(environment)[0].method, "DELETE");
        }
    });

    for (const actionUrl of [
        "javascript:alert(1)",
        "data:text/html,bad",
        "vbscript:bad",
        "http://[",
    ]) {
        test(`${kind} unsupported destination ${actionUrl} remains a safe nonlinked action`, async (context) => {
            const environment = await mount(context);
            const owner = await surface(environment, kind, { actionUrl });
            const primary = owner.querySelector("button.notification-primary");
            assert.ok(primary);
            assert.equal(primary.hasAttribute("href"), false);
            await activate(environment, primary);
            assert.equal(writes(environment).length, 1);
            assert.equal(navigations(environment).length, 0);
            assert.equal(environment.opened.length, 0);
            assert.equal(environment.actions.length, 0);
            assert.equal(
                environment.document.querySelector(".notification-panel")
                    .hidden,
                false,
            );
        });
    }
}

test("read nonlinked row retains informational content and its independent Remove button", async (context) => {
    const environment = await mount(context);
    const owner = await surface(environment, "row", {
        read: true,
        actionUrl: null,
    });
    assert.equal(owner.querySelector(".notification-primary").tagName, "SPAN");
    assert.equal(owner.querySelectorAll("button").length, 1);
    assert.ok(owner.querySelector(".notification-dismiss"));
    await activate(environment, owner);
    assert.equal(writes(environment).length, 0);
    assert.equal(navigations(environment).length, 0);
});

for (const failure of ["http500", "reject", "malformed"]) {
    test(`row ${failure} read preserves the outcome policy and disables native link retry until refreshed`, async (context) => {
        const environment = await mount(context, { writes: failure });
        const owner = await surface(environment, "row");
        const primary = owner.querySelector(".notification-primary");
        await activate(environment, primary);
        assert.equal(writes(environment).length, 1);
        assert.equal(environment.state.rows[0].read, false);
        assert.equal(environment.notices.length, 1);
        assert.equal(navigations(environment).length, 1);
        assert.equal(primary.hasAttribute("href"), false);
        assert.equal(primary.getAttribute("aria-disabled"), "true");
        await activate(environment, primary, { ctrlKey: true });
        assert.equal(writes(environment).length, 1);
        await environment.click("#notification-toggle");
        await environment.click(".notification-retry");
        const refreshed = environment.document.querySelector(
            "a.notification-primary",
        );
        assert.equal(refreshed.getAttribute("aria-disabled"), "false");
        assert.equal(refreshed.tabIndex, 0);
        assert.ok(refreshed.hasAttribute("href"));
        assert.equal(writes(environment).length, 1);
    });
}

test("pending row activation owns the click synchronously and prevents a second navigation path", async (context) => {
    const environment = await mount(context);
    const owner = await surface(environment, "row");
    const primary = owner.querySelector(".notification-primary");
    const pending = deferred();
    environment.state.intercept = (path, init) =>
        init.method === "PUT" ? pending.promise : undefined;
    const first = await activate(environment, primary);
    assert.equal(first.event.defaultPrevented, true);
    assert.equal(primary.hasAttribute("href"), false);
    assert.equal(primary.getAttribute("aria-disabled"), "true");
    assert.equal(primary.tabIndex, -1);
    for (const options of [
        {},
        { ctrlKey: true },
        { type: "auxclick", button: 1 },
    ]) {
        const result = await activate(environment, primary, options);
        assert.equal(result.event.defaultPrevented, true);
    }
    assert.equal(writes(environment).length, 1);
    assert.equal(navigations(environment).length, 0);
    pending.resolve(Response.json({ data: { ok: true } }));
    await settle();
    assert.equal(navigations(environment).length, 1);
});

test("reopening invalidates retained links and the new primary control acts once", async (context) => {
    const environment = await mount(context);
    const owner = await surface(environment, "row");
    const stale = owner.querySelector(".notification-primary");
    for (let count = 0; count < 3; count++) {
        await environment.click("#notification-toggle");
        await environment.click("#notification-toggle");
    }
    const result = await activate(environment, stale, { metaKey: true });
    assert.equal(result.event.defaultPrevented, true);
    assert.equal(stale.hasAttribute("href"), false);
    await activate(
        environment,
        environment.document.querySelector("a.notification-primary"),
    );
    assert.equal(writes(environment).length, 1);
    assert.equal(navigations(environment).length, 1);
});

test("ordinary arrival dismiss is focusable and does not read or navigate", async (context) => {
    const environment = await mount(context);
    const owner = await surface(environment, "arrival");
    const dismiss = owner.querySelector(".arrival-toast-dismiss");
    assert.equal(
        owner.querySelector(".notification-primary").contains(dismiss),
        false,
    );
    dismiss.focus();
    assert.equal(environment.document.activeElement, dismiss);
    await activate(environment, dismiss);
    assert.equal(writes(environment).length, 0);
    assert.equal(navigations(environment).length, 0);
    assert.equal(owner.classList.contains("arrival-toast--out"), true);
    assert.equal(
        owner.querySelector(".notification-primary").hasAttribute("href"),
        false,
    );
});
