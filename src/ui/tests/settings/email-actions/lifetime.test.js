import assert from "node:assert/strict";
import test from "node:test";
import { fixture, deferred, initialEmails, settle } from "./fixture.js";

test("email controls expose distinct constructive and destructive consequences", async (context) => {
    const state = await fixture(context);
    for (const [button, variant] of [
        [state.primary(), "btn-confirm"],
        [state.remove(), "btn-cancel"],
    ]) {
        assert.equal(button.tagName, "BUTTON");
        assert.equal(button.type, "button");
        assert.equal(button.classList.contains(variant), true);
        assert.equal(
            [...button.classList].filter((name) =>
                /^btn-(confirm|cancel|neutral)$/.test(name),
            ).length,
            1,
        );
    }
});

test("rapid and conflicting taps share one in-flight mutation", async (context) => {
    const state = await fixture(context);
    const gate = deferred();
    state.respond(async ({ method }) =>
        method === "DELETE"
            ? gate.promise
            : Response.json({
                  data: initialEmails.filter(
                      (entry) => entry.email !== "second@example.test",
                  ),
              }),
    );
    const remove = state.remove();
    remove.click();
    remove.click();
    state.primary().click();
    await settle();
    assert.equal(state.mutations().length, 1);
    assert.equal(remove.disabled, true);
    assert.equal(state.primary().disabled, true);
    gate.resolve(Response.json({ data: { removed: true } }));
    await settle();
    assert.equal(state.root.textContent.includes("second@example.test"), false);
    assert.equal(state.remove().disabled, false);
    assert.ok(state.flows.includes("notify:emails:request"));
});

test("an acknowledged removal with failed refresh is not reported as a failed mutation", async (context) => {
    const state = await fixture(context);
    state.respond(async ({ method }) =>
        method === "DELETE"
            ? Response.json({ data: { removed: true } })
            : Response.json(
                  { error: { code: "synthetic_read_failed" } },
                  { status: 500 },
              ),
    );
    state.remove().click();
    await settle();
    assert.equal(state.mutations().length, 1);
    assert.equal(state.remove().disabled, true);
    assert.ok(state.refresh());
    assert.ok(
        state
            .messages()
            .includes(
                state.i18n.t("ui.app.settings.emails_saved_refresh_failed"),
            ),
    );
    assert.ok(
        !state
            .messages()
            .includes(state.i18n.t("ui.app.settings.emails_remove_failed")),
    );
});

test("successful refresh renders the acknowledged primary state", async (context) => {
    const state = await fixture(context);
    state.respond(async ({ method }) =>
        method === "PUT"
            ? Response.json({ data: { updated: true } })
            : Response.json({
                  data: initialEmails.map((entry) => ({
                      ...entry,
                      primary: entry.email === "second@example.test",
                  })),
              }),
    );
    state.primary().click();
    await settle();
    assert.equal(state.mutations().length, 1);
    const row = [...state.root.querySelectorAll("li")].find((element) =>
        element.textContent.includes("second@example.test"),
    );
    assert.ok(row.querySelector(".email-badge-primary"));
    assert.equal(row.querySelector("[data-remove-email]"), null);
});

for (const action of ["remove", "primary"]) {
    for (const interruption of [
        "abort",
        "disconnect",
        "identity",
        "provider",
    ]) {
        test(`${action} suppresses completion after ${interruption}`, async (context) => {
            const state = await fixture(context);
            const gate = deferred();
            state.respond(async ({ method }) =>
                method !== "GET"
                    ? gate.promise
                    : Response.json({ data: initialEmails }),
            );
            state[action]().click();
            await settle();
            const before = state.renders;
            if (interruption === "abort") state.controller.abort();
            if (interruption === "disconnect") state.root.remove();
            if (interruption === "identity")
                localStorage.setItem(
                    "cognis_account",
                    "different-synthetic-account",
                );
            if (interruption === "provider") {
                const { uiCtx } = await import("../../../reuse/ui-ctx.js");
                const client = uiCtx.capabilities.get("notify:emailClient");
                uiCtx.capabilities.remove("notify:emailClient", client);
                state.providerController.abort();
            }
            const beforeMarkup = state.root.innerHTML;
            gate.resolve(
                Response.json({
                    data: {
                        [action === "remove" ? "removed" : "updated"]: true,
                    },
                }),
            );
            await settle();
            assert.deepEqual(state.messages(), []);
            assert.equal(state.renders, before);
            assert.equal(state.root.innerHTML, beforeMarkup);
            assert.equal(state.mutations().length, 1);
        });
    }
}

test("abort during the Settings refresh prevents late rendering and feedback", async (context) => {
    const state = await fixture(context);
    const gate = deferred();
    let reads = 0;
    state.respond(async ({ method }) => {
        if (method === "DELETE")
            return Response.json({ data: { removed: true } });
        reads += 1;
        return reads === 1
            ? Response.json({ data: initialEmails.slice(0, 1) })
            : gate.promise;
    });
    state.remove().click();
    await settle();
    assert.equal(reads, 2);
    state.controller.abort();
    const before = state.root.innerHTML;
    gate.resolve(Response.json({ data: initialEmails.slice(0, 1) }));
    await settle();
    assert.equal(state.root.innerHTML, before);
    assert.deepEqual(state.messages(), []);
});

test("same-page redraw retains pending locks without starting a new read or mutation", async (context) => {
    const state = await fixture(context);
    const gate = deferred();
    state.respond(async ({ method }) =>
        method === "DELETE"
            ? gate.promise
            : Response.json({
                  data: initialEmails.filter(
                      (entry) => entry.email !== "second@example.test",
                  ),
              }),
    );
    state.remove().click();
    await settle();
    state.root.querySelector("#email-list").replaceChildren();
    const before = state.calls.length;
    await state.prefs.refresh();
    assert.equal(state.calls.length, before);
    assert.equal(state.remove().disabled, true);
    state.primary().click();
    assert.equal(state.mutations().length, 1);
    gate.resolve(Response.json({ data: { removed: true } }));
    await settle();
    assert.equal(state.remove().disabled, false);
});

test("an older public refresh cannot overwrite the reconciled email list", async (context) => {
    const state = await fixture(context);
    const oldRead = deferred();
    state.respond(async () => oldRead.promise);
    const refresh = state.prefs.refresh();
    await settle();
    state.respond(async ({ method }) =>
        method === "DELETE"
            ? Response.json({ data: { removed: true } })
            : Response.json({
                  data: initialEmails.filter(
                      (entry) => entry.email !== "second@example.test",
                  ),
              }),
    );
    state.remove().click();
    await settle();
    assert.equal(state.root.textContent.includes("second@example.test"), false);
    oldRead.resolve(Response.json({ data: initialEmails }));
    await refresh;
    assert.equal(state.root.textContent.includes("second@example.test"), false);
    assert.equal(state.remove().disabled, false);
    assert.equal(state.mutations().length, 1);
});

test("a late old completion cannot change a new Settings mount or its controls", async (context) => {
    const state = await fixture(context);
    const gate = deferred();
    state.respond(async ({ method }) =>
        method === "DELETE"
            ? gate.promise
            : Response.json({ data: initialEmails }),
    );
    state.remove().click();
    await settle();
    state.controller.abort();
    state.root.innerHTML =
        '<section class="components-section"><ul id="email-list"></ul></section>';
    const nextLifetime = new AbortController();
    context.after(() => nextLifetime.abort());
    const { initGeneralPrefs } =
        await import("../../../app/settings/general-prefs.js");
    const next = initGeneralPrefs(state.root, {
        i18n: state.i18n,
        username: localStorage.getItem("cognis_account"),
        signal: nextLifetime.signal,
    });
    await next.init();
    const before = state.root.innerHTML;
    assert.equal(state.remove().disabled, false);
    gate.resolve(Response.json({ data: { removed: true } }));
    await settle();
    assert.equal(state.root.innerHTML, before);
    assert.equal(state.remove().disabled, false);
    assert.deepEqual(state.messages(), []);
    assert.equal(state.mutations().length, 1);
});
