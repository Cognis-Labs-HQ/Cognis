import assert from "node:assert/strict";
import test from "node:test";
import { fixture, deferred, initialEmails, settle } from "./fixture.js";

for (const action of ["remove", "primary"]) {
    test(`${action} reports its own accepted outcome once`, async (context) => {
        const state = await fixture(context);
        state.respond(async ({ method }) =>
            method !== "GET"
                ? Response.json({
                      data: {
                          [action === "remove" ? "removed" : "updated"]: true,
                      },
                  })
                : Response.json({
                      data:
                          action === "remove"
                              ? initialEmails.filter(
                                    (entry) =>
                                        entry.email !== "second@example.test",
                                )
                              : initialEmails.map((entry) => ({
                                    ...entry,
                                    primary:
                                        entry.email === "second@example.test",
                                })),
                  }),
        );
        state[action]().click();
        await settle();
        assert.deepEqual(state.messages(), [
            state.i18n.t(`ui.app.settings.emails_${action}_completed`),
        ]);
        assert.equal(state.mutations().length, 1);
        assert.equal(state.refresh(), null);
    });

    test(`${action} rejected before mutation remains actionable with localized failure`, async (context) => {
        const state = await fixture(context);
        state.respond(async () =>
            Response.json({ error: { code: "forbidden" } }, { status: 403 }),
        );
        state[action]().click();
        await settle();
        assert.deepEqual(state.messages(), [
            state.i18n.t(`ui.app.settings.emails_${action}_failed`),
        ]);
        assert.equal(state[action]().disabled, false);
        assert.equal(state.calls.length, 2);
    });

    test(`${action} queue acknowledgement uses the actual offline projection`, async (context) => {
        const state = await fixture(context, { offlineEnabled: true });
        state.offline();
        state[action]().click();
        await settle();
        assert.equal(state.mutations().length, 0);
        assert.equal(state.pending.length, 1);
        assert.equal(
            state.pending[0].payload.method,
            action === "remove" ? "DELETE" : "PUT",
        );
        assert.deepEqual(state.messages(), [
            state.i18n.t("ui.app.settings.emails_queued"),
        ]);
        assert.equal(state.refresh(), null);
        if (action === "remove")
            assert.equal(
                state.root.textContent.includes("second@example.test"),
                false,
            );
        else
            assert.ok(
                [...state.root.querySelectorAll("li")]
                    .find((row) =>
                        row.textContent.includes("second@example.test"),
                    )
                    .querySelector(".email-badge-primary"),
            );
    });
}

test("primary-removal protection uses its existing localized warning", async (context) => {
    const state = await fixture(context);
    state.respond(async () =>
        Response.json(
            { error: { code: "cannot_remove_primary_email" } },
            { status: 409 },
        ),
    );
    state.remove().click();
    await settle();
    assert.deepEqual(state.messages(), [
        state.i18n.t("ui.app.settings.emails_remove_primary_body"),
    ]);
    assert.equal(state.remove().disabled, false);
    assert.equal(
        document.querySelector(".toast").classList.contains("toast--warning"),
        true,
    );
});

test("last-email protection reports removal failure without offering an automatic retry", async (context) => {
    const state = await fixture(context);
    state.respond(async () =>
        Response.json(
            { error: { code: "cannot_remove_last_email" } },
            { status: 409 },
        ),
    );
    state.remove().click();
    await settle();
    assert.deepEqual(state.messages(), [
        state.i18n.t("ui.app.settings.emails_remove_failed"),
    ]);
    assert.equal(state.mutations().length, 1);
});

for (const [label, reply] of [
    [
        "server error",
        () =>
            Response.json(
                { error: { code: "synthetic_failure" } },
                { status: 500 },
            ),
    ],
    [
        "undeclared client error",
        () =>
            Response.json(
                { error: { code: "unknown_conflict" } },
                { status: 409 },
            ),
    ],
    [
        "generic non-final reply",
        () => Response.json({ data: null }, { status: 202 }),
    ],
    ["unrecognized success payload", () => Response.json({ data: {} })],
    ["unreadable response", () => new Response("{", { status: 200 })],
    [
        "lost response",
        () => {
            throw new TypeError("Synthetic response loss");
        },
    ],
]) {
    test(`${label} stays unconfirmed and never retries the mutation`, async (context) => {
        const state = await fixture(context);
        state.respond(reply);
        state.remove().click();
        await settle();
        assert.equal(state.remove().disabled, true);
        assert.ok(state.refresh());
        assert.deepEqual(state.messages(), [
            state.i18n.t("ui.app.settings.emails_outcome_unknown"),
        ]);
        assert.equal(state.mutations().length, 1);
        assert.equal(
            document
                .querySelector(".toast")
                .classList.contains("toast--warning"),
            true,
        );
    });
}

test("a no-content acknowledgement remains saved when the list read throws", async (context) => {
    const state = await fixture(context);
    state.respond(async ({ method }) => {
        if (method === "DELETE") return new Response(null, { status: 204 });
        throw new TypeError("Synthetic refresh loss");
    });
    state.remove().click();
    await settle();
    assert.deepEqual(state.messages(), [
        state.i18n.t("ui.app.settings.emails_saved_refresh_failed"),
    ]);
    assert.equal(state.mutations().length, 1);
});

test("a transport AbortError with current ownership stays unconfirmed", async (context) => {
    const state = await fixture(context);
    state.respond(async () => {
        throw new DOMException(
            "Synthetic transport cancellation",
            "AbortError",
        );
    });
    state.remove().click();
    await settle();
    assert.equal(state.controller.signal.aborted, false);
    assert.equal(state.remove().disabled, true);
    assert.ok(state.refresh());
    assert.deepEqual(state.messages(), [
        state.i18n.t("ui.app.settings.emails_outcome_unknown"),
    ]);
    assert.equal(state.mutations().length, 1);
});
