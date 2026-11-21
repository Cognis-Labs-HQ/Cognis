import assert from "node:assert/strict";
import test from "node:test";
import { fixture, deferred, initialEmails, settle } from "./fixture.js";

async function unknownRemoval(state) {
    state.respond(async () => {
        throw new TypeError("Synthetic response loss");
    });
    state.remove().click();
    await settle();
    assert.ok(state.refresh());
}

test("failed and repeated Refresh issue reads only and recover after observing removal", async (context) => {
    const state = await fixture(context);
    await unknownRemoval(state);
    state.respond(async () =>
        Response.json({ error: { code: "read_failed" } }, { status: 500 }),
    );
    state.refresh().click();
    await settle();
    assert.equal(state.remove().disabled, true);
    const gate = deferred();
    state.respond(async () => gate.promise);
    const before = state.calls.length;
    const refresh = state.refresh();
    refresh.click();
    refresh.click();
    await settle();
    assert.equal(state.calls.length - before, 1);
    assert.equal(refresh.disabled, true);
    gate.resolve(
        Response.json({
            data: initialEmails.filter(
                (entry) => entry.email !== "second@example.test",
            ),
        }),
    );
    await settle();
    assert.equal(state.refresh(), null);
    assert.equal(state.remove().disabled, false);
    assert.equal(state.mutations().length, 1);
    assert.equal(state.calls.at(-1).cache, "no-store");
    assert.equal(
        state.messages().at(-1),
        state.i18n.t("ui.app.settings.emails_refreshed"),
    );
});

test("an unchanged valid live read keeps an unknown write unconfirmed with recovery guidance", async (context) => {
    const state = await fixture(context);
    await unknownRemoval(state);
    state.respond(async () => Response.json({ data: initialEmails }));
    state.refresh().click();
    await settle();
    assert.equal(state.remove().disabled, true);
    assert.equal(state.refresh().disabled, false);
    assert.equal(
        state.messages().at(-1),
        state.i18n.t("ui.app.settings.emails_outcome_unknown"),
    );
    assert.match(state.messages().at(-1), /reopen Settings/);
    assert.equal(state.mutations().length, 1);
});

test("a removed primary target cannot masquerade as an observed primary change", async (context) => {
    const state = await fixture(context);
    state.respond(async () => {
        throw new TypeError("Synthetic response loss");
    });
    state.primary().click();
    await settle();
    state.respond(async () =>
        Response.json({
            data: initialEmails.filter(
                (entry) => entry.email !== "second@example.test",
            ),
        }),
    );
    state.refresh().click();
    await settle();
    assert.ok(state.refresh());
    assert.equal(state.primary().disabled, true);
    state.respond(async () =>
        Response.json({
            data: initialEmails.map((entry) => ({
                ...entry,
                primary: entry.email === "second@example.test",
            })),
        }),
    );
    state.refresh().click();
    await settle();
    assert.equal(state.refresh(), null);
    assert.equal(state.mutations().length, 1);
});

test("cached reads cannot resolve unknown delivery even when they show the requested state", async (context) => {
    const state = await fixture(context, { offlineEnabled: true });
    state.respond(async () =>
        Response.json({
            data: initialEmails.filter(
                (entry) => entry.email !== "second@example.test",
            ),
        }),
    );
    const { uiCtx } = await import("../../../reuse/ui-ctx.js");
    const client = uiCtx.capabilities.get("notify:emailClient");
    await client.request(state.calls[0].path);
    // The displayed list predates the refreshed provider snapshot.
    state.respond(async ({ method }) =>
        method === "GET"
            ? Response.json({
                  data: initialEmails.filter(
                      (entry) => entry.email !== "second@example.test",
                  ),
              })
            : Response.json({ data: null }, { status: 202 }),
    );
    state.remove().click();
    await settle();
    state.offline();
    assert.equal(
        (await client.request(state.calls[0].path)).headers.get(
            "x-cognis-read-source",
        ),
        "cached",
    );
    const before = state.calls.length;
    state.refresh().click();
    await settle();
    assert.equal(state.calls.length, before);
    assert.ok(state.refresh());
    assert.equal(state.remove().disabled, true);
    assert.equal(state.mutations().length, 1);
});

test("recovery bypasses an older shared read and waits for its own authoritative result", async (context) => {
    const state = await fixture(context, { offlineEnabled: true });
    state.respond(async () => Response.json({ data: null }, { status: 202 }));
    state.remove().click();
    await settle();
    const oldRead = deferred();
    const currentRead = deferred();
    let reads = 0;
    state.respond(async () =>
        ++reads === 1 ? oldRead.promise : currentRead.promise,
    );
    const { uiCtx } = await import("../../../reuse/ui-ctx.js");
    const externalRead = uiCtx.capabilities
        .get("notify:emailClient")
        .request(state.calls[0].path);
    await settle();
    const before = state.calls.length;
    state.refresh().click();
    await settle();
    assert.equal(state.calls.length, before + 1);
    assert.equal(state.calls.at(-1).cache, "no-store");
    oldRead.resolve(
        Response.json({
            data: initialEmails.filter(
                (entry) => entry.email !== "second@example.test",
            ),
        }),
    );
    await externalRead;
    await settle();
    assert.equal(state.refresh().disabled, true);
    assert.equal(state.remove().disabled, true);
    currentRead.resolve(Response.json({ data: initialEmails }));
    await settle();
    assert.ok(state.refresh());
    assert.equal(state.remove().disabled, true);
    assert.equal(state.mutations().length, 1);
});

test("a queued write with unavailable projection remains queued and can refresh without resubmitting", async (context) => {
    const state = await fixture(context, { offlineEnabled: true });
    state.offline();
    const original = state.outbox.pending;
    state.outbox.pending = async () => {
        if (state.pending.length)
            throw new Error("synthetic_queue_read_unavailable");
        return original();
    };
    state.remove().click();
    await settle();
    assert.deepEqual(state.messages(), [
        state.i18n.t("ui.app.settings.emails_queued_refresh_failed"),
    ]);
    assert.equal(state.pending.length, 1);
    assert.equal(state.remove().disabled, true);
    state.outbox.pending = original;
    state.refresh().click();
    await settle();
    assert.equal(state.pending.length, 1);
    assert.equal(state.mutations().length, 0);
    assert.equal(state.refresh(), null);
});

for (const action of ["remove", "primary"]) {
    test(`pending ${action} projection cannot resolve an unknown write from a live read`, async (context) => {
        const state = await fixture(context, { offlineEnabled: true });
        state.respond(async ({ method }) =>
            method === "GET"
                ? Response.json({ data: initialEmails })
                : Response.json({ data: null }, { status: 202 }),
        );
        state[action]().click();
        await settle();
        state.pending.push({
            id: "synthetic-pending",
            payload: {
                path: state.mutations()[0].path,
                method: action === "remove" ? "DELETE" : "PUT",
                body: null,
            },
        });
        const { uiCtx } = await import("../../../reuse/ui-ctx.js");
        const response = await uiCtx.capabilities
            .get("notify:emailClient")
            .request(state.calls[0].path);
        assert.equal(response.headers.get("x-cognis-read-source"), "live");
        const projected = await response.json();
        const target = projected.data.find(
            (entry) => entry.email === "second@example.test",
        );
        assert.equal(action === "remove" ? !target : target.primary, true);
        state.refresh().click();
        await settle();
        assert.ok(state.refresh());
        assert.equal(state[action]().disabled, true);
        assert.equal(state.calls.at(-1).cache, "no-store");
        assert.equal(state.mutations().length, 1);
    });
}

for (const data of [
    [{}],
    [{ email: "first@example.test" }],
    [initialEmails[0], initialEmails[0]],
]) {
    test(`malformed authoritative list cannot resolve unknown removal: ${JSON.stringify(data)}`, async (context) => {
        const state = await fixture(context);
        await unknownRemoval(state);
        const before = state.root.textContent;
        state.respond(async () => Response.json({ data }));
        state.refresh().click();
        await settle();
        assert.ok(state.refresh());
        assert.equal(state.remove().disabled, true);
        assert.equal(state.root.textContent, before);
        assert.equal(state.mutations().length, 1);
    });
}

test("accepted removal with only cached offline state remains saved but needs online reconciliation", async (context) => {
    const state = await fixture(context, { offlineEnabled: true });
    state.respond(async ({ method }) => {
        assert.equal(method, "DELETE");
        state.offline();
        return Response.json({ data: { removed: true } });
    });
    state.remove().click();
    await settle();
    assert.deepEqual(state.messages(), [
        state.i18n.t("ui.app.settings.emails_saved_refresh_failed"),
    ]);
    assert.equal(state.remove().disabled, true);
    const before = state.calls.length;
    state.refresh().click();
    await settle();
    assert.equal(state.calls.length, before);
    assert.equal(state.remove().disabled, true);
    state.online();
    state.respond(async () =>
        Response.json({
            data: initialEmails.filter(
                (entry) => entry.email !== "second@example.test",
            ),
        }),
    );
    state.refresh().click();
    await settle();
    assert.equal(state.refresh(), null);
    assert.equal(state.mutations().length, 1);
});

for (const status of [202, 206]) {
    test(`a ${status} list cannot resolve unknown removal even with well-shaped goal state`, async (context) => {
        const state = await fixture(context);
        await unknownRemoval(state);
        const before = state.root.textContent;
        state.respond(async () =>
            Response.json(
                {
                    data: initialEmails.filter(
                        (entry) => entry.email !== "second@example.test",
                    ),
                },
                { status },
            ),
        );
        state.refresh().click();
        await settle();
        assert.ok(state.refresh());
        assert.equal(state.remove().disabled, true);
        assert.equal(state.root.textContent, before);
        assert.equal(state.mutations().length, 1);
    });
}
