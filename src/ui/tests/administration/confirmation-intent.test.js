import assert from "node:assert/strict";
import test from "node:test";
import { confirmationPage } from "./fixtures/confirmation-page.js";

async function openDisable(context, kind, options = {}) {
    const fixture = await confirmationPage(context, options);
    const toggle = fixture.toggle(kind);
    toggle.focus();
    fixture.change(kind, false);
    await fixture.settle();
    return { fixture, toggle, overlay: fixture.active().at(-1) };
}

for (const locale of ["en", "de", "id", "ja"]) {
    for (const kind of ["gateway", "adapter"]) {
        test(`${locale} ${kind} Disable uses actual danger and neutral controls with safe focus`, async (context) => {
            const { fixture, toggle, overlay } = await openDisable(
                context,
                kind,
                { locale },
            );
            const actions = overlay.querySelectorAll(".popup-footer button");
            assert.equal(actions.length, 2);
            for (const button of actions) {
                assert.equal(button.tagName, "BUTTON");
                assert.equal(button.type, "button");
                assert.equal(
                    ["btn-confirm", "btn-cancel", "btn-neutral"].filter(
                        (name) => button.classList.contains(name),
                    ).length,
                    1,
                );
            }
            const cancel = overlay.querySelector(
                '[data-popup-action="cancel"]',
            );
            const confirm = overlay.querySelector(
                '[data-popup-action="confirm"]',
            );
            assert.ok(cancel.classList.contains("btn-neutral"));
            assert.ok(confirm.classList.contains("btn-cancel"));
            assert.equal(
                cancel.textContent.trim(),
                fixture.i18n.t("ui.reuse.cancel"),
            );
            assert.equal(
                confirm.textContent.trim(),
                fixture.i18n.t("ui.reuse.disable"),
            );
            assert.ok(
                overlay
                    .querySelector('[data-popup-action="close"]')
                    .classList.contains("btn-neutral"),
            );
            assert.equal(fixture.document.activeElement, cancel);
            const enter = fixture.key("Enter");
            assert.equal(enter.defaultPrevented, false);
            cancel.click();
            await fixture.settle();
            assert.equal(fixture.writes().length, 0);
            assert.equal(toggle.checked, true);
            assert.equal(toggle.disabled, false);
            assert.equal(fixture.document.activeElement, toggle);
        });
    }
}
for (const kind of ["gateway", "adapter"]) {
    for (const action of ["cancel", "close", "Escape"]) {
        test(`${kind} ${action} safely dismisses without a write`, async (context) => {
            const { fixture, toggle } = await openDisable(context, kind);
            if (action === "Escape") {
                fixture.key("Escape");
                await fixture.settle();
            } else await fixture.decide(action);
            assert.equal(fixture.writes().length, 0);
            assert.equal(toggle.checked, true);
            assert.equal(toggle.disabled, false);
        });
    }
    test(`${kind} pending confirmation and transport execute once`, async (context) => {
        const { fixture, toggle } = await openDisable(context, kind);
        fixture.change(kind, false);
        await fixture.settle();
        assert.equal(fixture.dialogs.length, 1);
        let release;
        const pending = new Promise((resolve) => {
            release = resolve;
        });
        fixture.intercept(async (request) => {
            if (request.method === "POST") {
                await pending;
                return Response.json({});
            }
        });
        await fixture.decide("confirm");
        assert.equal(fixture.writes().length, 1);
        assert.equal(toggle.disabled, true);
        fixture.change(kind, false);
        await fixture.settle();
        assert.equal(fixture.writes().length, 1);
        release();
        await fixture.settle();
        await fixture.settle();
        assert.deepEqual(
            fixture.writes().map((request) => request.url),
            [
                "/synthetic/adapter/disable",
                "/api/v1/gateways/synthetic-gateway/disable",
            ],
        );
    });
    for (const teardown of ["abort", "leaveComponents", "remount"]) {
        test(`${kind} ${teardown} cancels confirmation and retained controls`, async (context) => {
            const { fixture, toggle, overlay } = await openDisable(
                context,
                kind,
            );
            const confirm = overlay.querySelector(
                '[data-popup-action="confirm"]',
            );
            await fixture[teardown]();
            await fixture.settle();
            confirm.click();
            toggle.checked = false;
            toggle.dispatchEvent(new fixture.window.Event("change"));
            await fixture.settle();
            assert.equal(fixture.writes().length, 0);
            assert.equal(fixture.active().length, 0);
        });
    }
    for (const field of [
        "cognis_account",
        "cognis_access_token",
        "cognis_provider_id",
    ]) {
        test(`${kind} identity change ${field} invalidates a pending decision`, async (context) => {
            const { fixture, overlay } = await openDisable(context, kind);
            fixture.window.localStorage.setItem(field, "synthetic-replacement");
            await fixture.sessionChanged();
            overlay.querySelector('[data-popup-action="confirm"]').click();
            await fixture.settle();
            assert.equal(fixture.writes().length, 0);
            assert.equal(fixture.hookCount(), 0);
        });
    }
}
test("gateway cancellation during adapter read does not open a delayed popup", async (context) => {
    const fixture = await confirmationPage(context);
    let release;
    fixture.intercept((request) =>
        request.url.endsWith("/adapters")
            ? new Promise((resolve) => {
                  release = resolve;
              })
            : undefined,
    );
    fixture.change("gateway", false);
    await fixture.settle();
    fixture.abort();
    release(Response.json({ data: [] }));
    await fixture.settle();
    assert.equal(fixture.dialogs.length, 0);
    assert.equal(fixture.writes().length, 0);
});
for (const status of [403, 500])
    test(`failed ${status} component request stops the cascade and does not replay`, async (context) => {
        const { fixture, toggle } = await openDisable(context, "gateway");
        fixture.intercept((request) =>
            request.method === "POST"
                ? new Response("", { status })
                : undefined,
        );
        await fixture.decide("confirm");
        assert.equal(fixture.writes().length, 1);
        assert.equal(
            fixture.events.some((event) => event[1]?.variant === "error"),
            true,
        );
        if (status === 500) {
            assert.equal(toggle.disabled, true);
            fixture.change("gateway", false);
            await fixture.settle();
            assert.equal(fixture.writes().length, 1);
        } else {
            assert.equal(toggle.checked, true);
            assert.equal(toggle.disabled, false);
        }
    });
test("an accepted write survives a failed refresh without duplicate submission", async (context) => {
    const { fixture, toggle } = await openDisable(context, "adapter");
    let submitted = false;
    fixture.intercept((request) => {
        if (request.method === "POST") submitted = true;
        else if (submitted) throw new Error("synthetic_read_failed");
    });
    await fixture.decide("confirm");
    assert.equal(fixture.writes().length, 2);
    assert.equal(toggle.disabled, true);
    fixture.change("adapter", false);
    await fixture.settle();
    assert.equal(fixture.writes().length, 2);
    assert.equal(
        fixture.events.some((event) => event[1]?.variant === "error"),
        true,
    );
});
for (const kind of ["gateway", "adapter", "module"]) {
    test(`${kind} Enable stays constructive and dependency Cancel does not mutate`, async (context) => {
        const fixture = await confirmationPage(context, {
            enabled: false,
            gatewayEnabled: kind === "adapter",
            requires: ["synthetic-dependency"],
            includeModule: kind === "module",
        });
        fixture.change(kind, true);
        await fixture.settle();
        const overlay = fixture.active().at(-1);
        assert.ok(overlay);
        assert.ok(
            overlay
                .querySelector('[data-popup-action="confirm"]')
                .classList.contains("btn-confirm"),
        );
        assert.ok(
            overlay
                .querySelector('[data-popup-action="cancel"]')
                .classList.contains("btn-neutral"),
        );
        await fixture.decide("cancel");
        assert.equal(fixture.writes().length, 0);
        assert.equal(fixture.toggle(kind).checked, false);
    });
}
test("retained module binder uses danger Disable and safe cancellation", async (context) => {
    const { fixture, toggle, overlay } = await openDisable(context, "module", {
        includeModule: true,
    });
    assert.ok(
        overlay
            .querySelector('[data-popup-action="confirm"]')
            .classList.contains("btn-cancel"),
    );
    await fixture.decide("cancel");
    assert.equal(toggle.checked, true);
    assert.equal(fixture.writes().length, 0);
    fixture.change("module", false);
    await fixture.decide("confirm");
    assert.deepEqual(
        fixture.writes().map((request) => request.url),
        ["/api/v1/modules/synthetic-module/disable"],
    );
});
for (const action of ["stay", "close", "Escape", "discard"]) {
    test(`dirty navigation ${action} preserves the intended draft outcome`, async (context) => {
        const fixture = await confirmationPage(context);
        fixture.edit();
        const first = fixture.navigate();
        const second = fixture.navigate();
        assert.equal(first, second);
        await fixture.settle();
        const overlay = fixture.active().at(-1);
        assert.equal(
            fixture.document.activeElement.dataset.popupAction,
            "stay",
        );
        assert.ok(
            overlay
                .querySelector('[data-popup-action="stay"]')
                .classList.contains("btn-neutral"),
        );
        assert.ok(
            overlay
                .querySelector('[data-popup-action="discard"]')
                .classList.contains("btn-cancel"),
        );
        if (action === "Escape") {
            fixture.key("Escape");
            await fixture.settle();
        } else await fixture.decide(action);
        assert.equal(await first, action === "discard");
        assert.equal(fixture.discards(), action === "discard" ? 1 : 0);
        assert.equal(fixture.isDirty(), action !== "discard");
        assert.equal(fixture.writes().length, 0);
    });
}
test("old dirty navigation cannot discard after a new mount", async (context) => {
    const fixture = await confirmationPage(context);
    fixture.edit();
    const pending = fixture.navigate();
    await fixture.settle();
    const button = fixture
        .active()
        .at(-1)
        .querySelector('[data-popup-action="discard"]');
    await fixture.remount();
    button.click();
    assert.equal(await pending, false);
    assert.equal(fixture.discards(), 0);
});

for (const [kind, options] of [
    ["gateway", { required: true }],
    ["adapter", { locked: true }],
]) {
    test(`${kind} protected controls cannot initiate a decision`, async (context) => {
        const fixture = await confirmationPage(context, options);
        assert.equal(fixture.toggle(kind).disabled, true);
        fixture.change(kind, false);
        await fixture.settle();
        assert.equal(fixture.dialogs.length, 0);
        assert.equal(fixture.writes().length, 0);
    });
}
test("component teardown while a submitted request is pending stops the next cascade step", async (context) => {
    const { fixture } = await openDisable(context, "gateway");
    let release;
    fixture.intercept((request) =>
        request.method === "POST"
            ? new Promise((resolve) => {
                  release = resolve;
              })
            : undefined,
    );
    await fixture.decide("confirm");
    assert.equal(fixture.writes().length, 1);
    const request = fixture.writes()[0];
    assert.equal(request.signal.aborted, false);
    fixture.leaveComponents();
    assert.equal(request.signal.aborted, true);
    release(Response.json({}));
    await fixture.settle();
    await fixture.settle();
    assert.equal(fixture.writes().length, 1);
    assert.equal(fixture.refreshes(), 0);
});
test("new component render does not unlock an uncertain operation", async (context) => {
    const { fixture } = await openDisable(context, "adapter");
    fixture.intercept((request) =>
        request.method === "POST"
            ? new Response("", { status: 500 })
            : undefined,
    );
    await fixture.decide("confirm");
    fixture.rebind();
    assert.equal(fixture.toggle("adapter").disabled, true);
    fixture.change("adapter", false);
    await fixture.settle();
    assert.equal(fixture.writes().length, 1);
});

for (const selection of ["skip", "confirm"]) {
    test(`gateway Enable reloads current adapters before ${selection}`, async (context) => {
        const fixture = await confirmationPage(context, { enabled: false });
        fixture.change("gateway", true);
        await fixture.settle();
        await fixture.settle();
        assert.deepEqual(
            fixture.writes().map((request) => request.url),
            ["/api/v1/gateways/synthetic-gateway/enable"],
        );
        const overlay = await fixture.waitForPopup();
        assert.ok(overlay);
        assert.ok(
            overlay
                .querySelector('[data-popup-action="confirm"]')
                .classList.contains("btn-confirm"),
        );
        assert.ok(
            overlay
                .querySelector('[data-popup-action="skip"]')
                .classList.contains("btn-neutral"),
        );
        const adapter = overlay.querySelector(
            'input[name="gateway-enable-adapter"]',
        );
        assert.ok(adapter);
        adapter.checked = true;
        await fixture.decide(selection);
        assert.deepEqual(
            fixture.writes().map((request) => request.url),
            selection === "skip"
                ? ["/api/v1/gateways/synthetic-gateway/enable"]
                : [
                      "/api/v1/gateways/synthetic-gateway/enable",
                      "/synthetic/adapter/enable",
                  ],
        );
        assert.equal(fixture.toggle("gateway").checked, true);
    });
}
test("retained module confirmation is canceled by page teardown", async (context) => {
    const { fixture, overlay } = await openDisable(context, "module", {
        includeModule: true,
    });
    fixture.abort();
    overlay.querySelector('[data-popup-action="confirm"]').click();
    await fixture.settle();
    assert.equal(fixture.writes().length, 0);
});

for (const status of [403, 500]) {
    test(`HTTP ${status} adapter listing cannot approve a blind gateway disable`, async (context) => {
        const fixture = await confirmationPage(context);
        fixture.intercept((request) =>
            request.url.endsWith("/adapters")
                ? new Response("", { status })
                : undefined,
        );
        fixture.change("gateway", false);
        await fixture.settle();
        await fixture.settle();
        assert.equal(fixture.dialogs.length, 0);
        assert.equal(fixture.writes().length, 0);
        assert.equal(fixture.toggle("gateway").checked, true);
    });
    test(`HTTP ${status} refresh after accepted writes holds the control`, async (context) => {
        const { fixture, toggle } = await openDisable(context, "adapter");
        let submitted = false;
        fixture.intercept((request) => {
            if (request.method === "POST") submitted = true;
            else if (submitted) return new Response("", { status });
        });
        await fixture.decide("confirm");
        assert.equal(fixture.writes().length, 2);
        assert.equal(toggle.disabled, true);
        fixture.change("adapter", false);
        await fixture.settle();
        assert.equal(fixture.writes().length, 2);
        assert.equal(
            fixture.events.some((event) => event[1]?.variant === "error"),
            true,
        );
    });
}

for (const phase of ["decision", "mutation"]) {
    test(`registered ${phase} flow rechecks page ownership after a delayed hook`, async (context) => {
        const fixture = await confirmationPage(context);
        let release;
        const flow = [...fixture.flows.keys()].find((name) =>
            name.endsWith(`:${phase}`),
        );
        assert.ok(flow);
        fixture.ctx.extendFlow(
            flow,
            "authorize",
            { id: "synthetic-delay", order: 100 },
            () =>
                new Promise((resolve) => {
                    release = resolve;
                }),
        );
        fixture.change("adapter", false);
        await fixture.settle();
        if (phase === "mutation") await fixture.decide("confirm");
        assert.equal(typeof release, "function");
        fixture.abort();
        release();
        await fixture.settle();
        await fixture.settle();
        assert.equal(fixture.writes().length, 0);
        assert.equal(fixture.active().length, 0);
        assert.deepEqual([...fixture.flows.keys()], ["authenticate-session"]);
    });
}
test("dirty-leave flow rechecks ownership after confirmation before discarding", async (context) => {
    const fixture = await confirmationPage(context);
    fixture.edit();
    let release;
    const flow = [...fixture.flows.keys()].find((name) =>
        name.endsWith(":leaveSection"),
    );
    fixture.ctx.extendFlow(
        flow,
        "confirm",
        { id: "synthetic-delay", order: 100 },
        () =>
            new Promise((resolve) => {
                release = resolve;
            }),
    );
    const pending = fixture.navigate();
    await fixture.decide("discard");
    assert.equal(typeof release, "function");
    fixture.abort();
    release();
    assert.equal(await pending, false);
    assert.equal(fixture.discards(), 0);
});

test("retained module rejection preserves the existing setup warning", async (context) => {
    const { fixture, toggle } = await openDisable(context, "module", {
        includeModule: true,
    });
    fixture.intercept((request) =>
        request.method === "POST"
            ? new Response("", { status: 409 })
            : undefined,
    );
    await fixture.decide("confirm");
    assert.equal(toggle.checked, true);
    assert.equal(toggle.disabled, false);
    assert.ok(
        fixture.events.some(
            (event) =>
                event[0] === fixture.i18n.t("ui.app.admin.setup_required") &&
                event[1]?.variant === "warning",
        ),
    );
});

for (const payload of [
    {},
    { data: null },
    { data: "invalid" },
    { data: [{ active: true }] },
    { data: [{ id: "synthetic-adapter" }] },
    { data: [{ id: "synthetic-adapter", active: "false" }] },
    { data: [{ id: "synthetic-adapter", enabled: 0 }] },
    { data: [{ senderId: " ", active: true }] },
]) {
    test(`malformed adapter list ${JSON.stringify(payload)} cannot reach confirmation`, async (context) => {
        const fixture = await confirmationPage(context);
        fixture.intercept((request) =>
            request.url.endsWith("/adapters")
                ? Response.json(payload)
                : undefined,
        );
        fixture.change("gateway", false);
        await fixture.settle();
        await fixture.settle();
        assert.equal(fixture.dialogs.length, 0);
        assert.equal(fixture.writes().length, 0);
        assert.equal(fixture.toggle("gateway").checked, true);
        assert.ok(
            fixture.events.some((event) => event[1]?.variant === "error"),
        );
    });
}
for (const adapter of [
    { id: "synthetic-adapter", active: false },
    { senderId: "synthetic-adapter", active: false },
    { id: "synthetic-adapter", enabled: false },
    { id: "synthetic-adapter", active: false, enabled: true },
]) {
    test(`inactive adapter ${JSON.stringify(adapter)} preserves gateway-only disable`, async (context) => {
        const fixture = await confirmationPage(context);
        fixture.intercept((request) =>
            request.url.endsWith("/adapters")
                ? Response.json({ data: [adapter] })
                : undefined,
        );
        fixture.change("gateway", false);
        await fixture.settle();
        await fixture.decide("confirm");
        assert.deepEqual(
            fixture.writes().map((request) => request.url),
            ["/api/v1/gateways/synthetic-gateway/disable"],
        );
        assert.equal(fixture.toggle("gateway").checked, false);
        assert.equal(fixture.toggle("gateway").disabled, false);
        assert.equal(
            fixture.events.some((event) => event[1]?.variant === "error"),
            false,
        );
    });
}
for (const gateway of [
    { id: "synthetic-gateway" },
    { id: "synthetic-gateway", status: "enabled" },
    { id: "synthetic-gateway", status: false },
    { status: "disabled" },
    { id: " ", status: "disabled" },
]) {
    test(`malformed gateway refresh ${JSON.stringify(gateway)} retains an accepted operation`, async (context) => {
        const { fixture, toggle } = await openDisable(context, "gateway");
        fixture.intercept((request) =>
            request.url === "/api/v1/gateways"
                ? Response.json({ data: [gateway] })
                : undefined,
        );
        await fixture.decide("confirm");
        assert.equal(fixture.writes().length, 2);
        assert.equal(toggle.disabled, true);
        assert.equal(fixture.toggle("gateway"), toggle);
        assert.ok(
            fixture.events.some(
                (event) =>
                    event[0] ===
                    fixture.i18n.t("ui.app.admin.toggle_incomplete"),
            ),
        );
        fixture.change("gateway", false);
        await fixture.settle();
        assert.equal(fixture.writes().length, 2);
    });
}
test("optional navbar failure does not lock a successfully refreshed gateway", async (context) => {
    const { fixture } = await openDisable(context, "gateway", {
        navbarRefresh: async () => {
            throw new Error("synthetic_avatar_failure");
        },
    });
    await fixture.decide("confirm");
    await fixture.settle();
    assert.equal(fixture.toggle("gateway").checked, false);
    assert.equal(fixture.toggle("gateway").disabled, false);
    assert.equal(fixture.writes().length, 2);
    assert.ok(
        fixture.events.some(
            (event) => event[1] === "administration_navbar_refresh_failed",
        ),
    );
    assert.ok(
        fixture.events.some(
            (event) => event[0] === fixture.i18n.t("ui.reuse.load_failed"),
        ),
    );
});

test("a gateway without an adapter catalog can be disabled directly", async (context) => {
    const fixture = await confirmationPage(context, { hasAdapters: false });
    fixture.intercept((request) =>
        request.url.endsWith("/adapters")
            ? new Response("", { status: 404 })
            : undefined,
    );
    fixture.change("gateway", false);
    await fixture.settle();
    assert.equal(fixture.dialogs.length, 1);
    await fixture.decide("confirm");
    assert.deepEqual(
        fixture.writes().map((request) => request.url),
        ["/api/v1/gateways/synthetic-gateway/disable"],
    );
    assert.equal(fixture.toggle("gateway").checked, false);
    assert.equal(fixture.toggle("gateway").disabled, false);
    assert.equal(
        fixture.requests.filter((request) => request.url.endsWith("/adapters"))
            .length,
        0,
    );
});

test("gateway disable preserves gateway-managed locked adapter controls", async (context) => {
    const fixture = await confirmationPage(context, { locked: true });
    fixture.intercept((request) => {
        if (request.url.endsWith("/adapters"))
            return Response.json({
                data: [{ id: "synthetic-adapter", active: true, locked: true }],
            });
        if (request.method === "POST" && request.url.includes("/adapters/"))
            return Response.json(
                { error: { code: "adapter_locked" } },
                { status: 409 },
            );
    });
    assert.equal(fixture.toggle("adapter").disabled, true);
    fixture.change("adapter", false);
    await fixture.settle();
    assert.equal(fixture.dialogs.length, 0);
    fixture.change("gateway", false);
    await fixture.settle();
    await fixture.decide("confirm");
    assert.deepEqual(
        fixture.writes().map((request) => request.url),
        ["/api/v1/gateways/synthetic-gateway/disable"],
    );
    assert.equal(fixture.toggle("gateway").checked, false);
    assert.equal(fixture.toggle("gateway").disabled, false);
});

test("gateway enable does not offer individually locked adapters", async (context) => {
    const fixture = await confirmationPage(context, {
        enabled: false,
        locked: true,
    });
    fixture.intercept((request) =>
        request.url.endsWith("/adapters")
            ? Response.json({
                  data: [
                      { id: "synthetic-adapter", active: false, locked: true },
                  ],
              })
            : undefined,
    );
    fixture.change("gateway", true);
    await fixture.settle();
    await fixture.settle();
    assert.equal(fixture.dialogs.length, 0);
    assert.equal(
        fixture.requests.some((request) =>
            request.url.startsWith("/static/templates/administration/"),
        ),
        false,
    );
    assert.deepEqual(
        fixture.writes().map((request) => request.url),
        ["/api/v1/gateways/synthetic-gateway/enable"],
    );
    assert.equal(fixture.toggle("gateway").checked, true);
    assert.equal(fixture.toggle("gateway").disabled, false);
    assert.equal(fixture.toggle("adapter").disabled, true);
});

for (const target of ["gateway", "adapter"]) {
    test(`full-page recovery rejects missing ${target} state after an uncertain write`, async (context) => {
        const { fixture, toggle } = await openDisable(context, "gateway");
        fixture.intercept((request) =>
            request.method === "POST"
                ? new Response("", { status: 500 })
                : undefined,
        );
        await fixture.decide("confirm");
        assert.equal(fixture.writes().length, 1);
        assert.equal(toggle.disabled, true);
        fixture.intercept((request) => {
            if (target === "gateway" && request.url === "/api/v1/gateways")
                return Response.json({ data: [{ id: "synthetic-gateway" }] });
            if (target === "adapter" && request.url.endsWith("/adapters"))
                return Response.json({ data: [{ id: "synthetic-adapter" }] });
        });
        await fixture.remount();
        assert.equal(fixture.toggle("gateway"), null);
        assert.equal(fixture.toggle("adapter"), null);
        toggle.dispatchEvent(new fixture.window.Event("change"));
        await fixture.settle();
        assert.equal(fixture.writes().length, 1);
        assert.ok(
            fixture.events.some(
                (event) => event[0] === fixture.i18n.t("ui.reuse.load_failed"),
            ),
        );
    });
}

test("adapter selection templates keep labels opaque and escaped", async (context) => {
    const name = "<script>unsafe</script> {id}";
    const fixture = await confirmationPage(context, {
        enabled: false,
        adapterName: name,
    });
    fixture.change("gateway", true);
    const overlay = await fixture.waitForPopup();
    assert.equal(overlay.querySelector("script"), null);
    assert.equal(
        overlay.querySelector(".provider-option-label").textContent,
        name,
    );
    assert.equal(
        overlay.querySelector('input[name="gateway-enable-adapter"]').value,
        "synthetic-adapter",
    );
    await fixture.decide("skip");
    assert.equal(fixture.writes().length, 1);
});
test("failed adapter selection template does not repeat an accepted gateway enable", async (context) => {
    const fixture = await confirmationPage(context, { enabled: false });
    fixture.intercept((request) =>
        request.url.startsWith("/static/templates/administration/")
            ? new Response("", { status: 500 })
            : undefined,
    );
    fixture.change("gateway", true);
    await fixture.settle();
    await fixture.settle();
    assert.equal(fixture.writes().length, 1);
    assert.equal(fixture.dialogs.length, 0);
    assert.equal(fixture.toggle("gateway").disabled, true);
    fixture.change("gateway", true);
    await fixture.settle();
    assert.equal(fixture.writes().length, 1);
});
