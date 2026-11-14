import test from "node:test";
import assert from "node:assert/strict";
import {
    editorFixture,
    deferred,
    editedFields,
    originalProfile,
    settle,
} from "./editor-fixture.js";

test("valid Profile draft stays in the real popup until acknowledgement", async (context) => {
    const pending = deferred();
    const fixture = await editorFixture(context, {
        send: () => pending.promise,
    });
    const editor = await fixture.open();
    fixture.fill(editor);
    await fixture.click(editor, "save");
    assert.equal(fixture.requests.length, 1);
    assert.ok(
        editor.hasAttribute("data-popup-active"),
        "pending Save keeps the editor active",
    );
    assert.deepEqual(fixture.values(editor), editedFields);
    pending.resolve(
        Response.json({ data: { ...originalProfile, ...editedFields } }),
    );
    await settle();
    assert.equal(editor.hasAttribute("data-popup-active"), false);
    assert.equal(fixture.notices[0].variant, "success");
});

test("rejected Profile save retains the exact draft for retry", async (context) => {
    const fixture = await editorFixture(context, {
        send: async () =>
            Response.json(
                { error: { code: "invalid_profile" } },
                { status: 422 },
            ),
    });
    const editor = await fixture.open();
    fixture.fill(editor);
    await fixture.click(editor, "save");
    assert.ok(
        editor.hasAttribute("data-popup-active"),
        "rejected Save keeps the editor active",
    );
    assert.deepEqual(fixture.values(editor), editedFields);
    assert.deepEqual(
        fixture.notices.map((notice) => notice.variant),
        ["error"],
    );
    assert.equal(fixture.writes.length, 0);
});

for (const invalid of [{ displayName: "" }, { displayName: "   " }]) {
    test(`invalid Profile ${Object.keys(invalid)[0]} remains editable without persistence`, async (context) => {
        const fixture = await editorFixture(context);
        const editor = await fixture.open();
        fixture.fill(editor, invalid);
        await fixture.click(editor, "save");
        assert.ok(editor.hasAttribute("data-popup-active"));
        assert.equal(fixture.requests.length, 0);
        assert.equal(fixture.notices.length, 0);
        assert.equal(
            editor.querySelector('[data-popup-action="save"]').disabled,
            false,
        );
    });
}

test("repeated clicks, Enter and editor openings coalesce, then failure restores Save and retry", async (context) => {
    const pending = deferred();
    let count = 0;
    const fixture = await editorFixture(context, {
        send: () =>
            ++count === 1
                ? pending.promise
                : Response.json({
                      data: { ...originalProfile, ...editedFields },
                  }),
    });
    const editor = await fixture.open();
    fixture.fill(editor);
    assert.equal(await fixture.open(), editor);
    const save = editor.querySelector('[data-popup-action="save"]');
    save.click();
    save.click();
    save.dispatchEvent(
        new fixture.window.MouseEvent("click", { bubbles: true }),
    );
    fixture.key("Enter");
    await settle();
    assert.equal(fixture.requests.length, 1);
    assert.equal(save.disabled, true);
    assert.equal(
        editor.querySelector("form").getAttribute("aria-busy"),
        "true",
    );
    assert.ok(editor.contains(fixture.document.activeElement));
    pending.reject(new Error("synthetic_network_failure"));
    await settle();
    assert.equal(save.disabled, false);
    assert.equal(editor.querySelector("form").hasAttribute("aria-busy"), false);
    assert.deepEqual(fixture.values(editor), editedFields);
    editor.querySelector("textarea").focus();
    assert.equal(fixture.key("Enter").defaultPrevented, false);
    assert.equal(fixture.requests.length, 1);
    editor.querySelector("input").focus();
    fixture.key("Enter");
    await settle();
    assert.equal(fixture.requests.length, 2);
    assert.deepEqual(fixture.requests, [editedFields, editedFields]);
    assert.deepEqual(
        fixture.notices.map((notice) => notice.variant),
        ["error", "success"],
    );
    assert.deepEqual(fixture.values(await fixture.open()), editedFields);
    assert.deepEqual(
        fixture.stages.filter((stage) => stage !== "poll:start").slice(-3),
        ["before", "execute", "after"],
    );
});

for (const mode of ["offline", "connection-loss"]) {
    test(`${mode} accepts only a durably buffered Profile draft`, async (context) => {
        const pending = deferred();
        const fixture = await editorFixture(context, {
            send: () => pending.promise,
        });
        const editor = await fixture.open();
        fixture.fill(editor);
        if (mode === "offline") fixture.host.disconnect();
        await fixture.click(editor, "save");
        if (mode === "connection-loss") {
            fixture.host.disconnect();
            pending.reject(new Error("synthetic_disconnect"));
            await settle();
        }
        assert.equal(editor.hasAttribute("data-popup-active"), false);
        const buffered = await fixture.host.outbox.pending("social.profile");
        assert.equal(buffered.length, 1);
        assert.deepEqual(buffered[0].payload.body, editedFields);
        assert.equal(fixture.notices[0].variant, "success");
        assert.equal(fixture.renderedProfiles.at(-1).queued, true);
        assert.deepEqual(fixture.values(await fixture.open()), editedFields);
    });
}

test("failed durable buffering leaves the draft available and does not report success", async (context) => {
    const fixture = await editorFixture(context);
    const editor = await fixture.open();
    fixture.fill(editor);
    fixture.host.disconnect();
    const set = fixture.host.values.set;
    fixture.host.values.set = () => {
        throw new Error("synthetic_storage_failure");
    };
    await fixture.click(editor, "save");
    assert.ok(editor.hasAttribute("data-popup-active"));
    assert.deepEqual(fixture.values(editor), editedFields);
    assert.equal(fixture.notices[0].variant, "error");
    assert.equal(
        (await fixture.host.outbox.pending("social.profile")).length,
        0,
    );
    assert.equal(fixture.writes.length, 0);
    fixture.host.values.set = set;
    await fixture.click(editor, "save");
    assert.equal(editor.hasAttribute("data-popup-active"), false);
    assert.equal(
        (await fixture.host.outbox.pending("social.profile")).length,
        1,
    );
});

for (const response of [
    () => new Response("invalid JSON"),
    () => Response.json({}),
    () => Response.json({ data: null }),
    () => Response.json({ queued: "true", data: {} }),
    () => new Response(null, { status: 204 }),
]) {
    test("uncertain Profile acknowledgement retains the draft", async (context) => {
        const fixture = await editorFixture(context, { send: response });
        const editor = await fixture.open();
        fixture.fill(editor);
        await fixture.click(editor, "save");
        assert.ok(editor.hasAttribute("data-popup-active"));
        assert.deepEqual(fixture.values(editor), editedFields);
        assert.equal(fixture.notices[0].variant, "error");
        assert.equal(fixture.writes.length, 0);
    });
}

for (const failure of ["refreshError", "storageError", "navbarError"]) {
    test(`accepted Profile save survives optional ${failure}`, async (context) => {
        const fixture = await editorFixture(context, {
            [failure]: new Error("synthetic_optional_failure"),
        });
        const editor = await fixture.open();
        fixture.fill(editor);
        await fixture.click(editor, "save");
        assert.equal(editor.hasAttribute("data-popup-active"), false);
        assert.deepEqual(
            fixture.notices.map((notice) => notice.variant),
            ["success"],
        );
        assert.deepEqual(fixture.values(await fixture.open()), editedFields);
    });
}

for (const action of ["cancel", "close", "Escape", "backdrop"]) {
    test(`${action} during Save discards the editor; late completion cannot overwrite a newer draft`, async (context) => {
        const pending = deferred();
        const fixture = await editorFixture(context, {
            send: () => pending.promise,
        });
        const editor = await fixture.open();
        fixture.fill(editor);
        await fixture.click(editor, "save");
        if (action === "Escape") fixture.key("Escape");
        else if (action === "backdrop") editor.click();
        else await fixture.click(editor, action);
        await settle();
        const confirmation = fixture.active().at(-1);
        assert.notEqual(confirmation, editor);
        await fixture.click(confirmation, "discard");
        assert.equal(fixture.active().length, 0);
        assert.deepEqual(
            fixture.notices.map((notice) => notice.variant),
            ["info"],
        );
        const newer = await fixture.open();
        assert.equal(
            fixture.values(newer).displayName,
            originalProfile.displayName,
        );
        const newerDraft = { ...editedFields, displayName: "Newer unsaved" };
        fixture.fill(newer, newerDraft);
        pending.resolve(
            Response.json({ data: { ...originalProfile, ...editedFields } }),
        );
        await settle();
        assert.deepEqual(fixture.values(newer), newerDraft);
        assert.ok(newer.hasAttribute("data-popup-active"));
        assert.equal(fixture.writes.length, 0);
        assert.equal(fixture.refreshed.length, 0);
        assert.equal(fixture.navbarRefreshes.length, 0);
        assert.deepEqual(
            fixture.notices.map((notice) => notice.variant),
            ["info"],
        );
    });
}

for (const decision of ["keep", "discard"]) {
    test(`save completion waits for an active discard decision: ${decision}`, async (context) => {
        const pending = deferred();
        const fixture = await editorFixture(context, {
            send: () => pending.promise,
        });
        const editor = await fixture.open();
        fixture.fill(editor);
        await fixture.click(editor, "save");
        fixture.key("Escape");
        await settle();
        const confirmation = fixture.active().at(-1);
        pending.resolve(
            Response.json({ data: { ...originalProfile, ...editedFields } }),
        );
        await settle();
        assert.equal(fixture.active().length, 2);
        assert.equal(fixture.writes.length, 0);
        assert.ok(confirmation.contains(fixture.document.activeElement));
        await fixture.click(confirmation, decision);
        assert.equal(fixture.active().length, 0);
        assert.equal(fixture.writes.length, decision === "keep" ? 1 : 0);
        assert.deepEqual(
            fixture.notices.map((notice) => notice.variant),
            [decision === "keep" ? "success" : "info"],
        );
    });
}

test("discard before saving sends nothing and reopening uses saved fields", async (context) => {
    const fixture = await editorFixture(context);
    const editor = await fixture.open();
    fixture.fill(editor);
    await fixture.click(editor, "cancel");
    await fixture.click(fixture.active().at(-1), "keep");
    assert.ok(editor.hasAttribute("data-popup-active"));
    assert.deepEqual(fixture.values(editor), editedFields);
    await fixture.click(editor, "cancel");
    await fixture.click(fixture.active().at(-1), "discard");
    assert.equal(fixture.requests.length, 0);
    assert.equal(fixture.notices.length, 0);
    assert.equal(fixture.values(await fixture.open()).bio, originalProfile.bio);
});

for (const change of ["unmount", "newer-mount", "account", "session"]) {
    test(`${change} revokes pending editor callbacks without stale feedback`, async (context) => {
        const pending = deferred();
        const fixture = await editorFixture(context, {
            send: () => pending.promise,
        });
        const editor = await fixture.open();
        fixture.fill(editor);
        await fixture.click(editor, "save");
        if (change === "unmount") fixture.page.abort();
        if (change === "newer-mount")
            await fixture.app.mount(fixture.document.querySelector("#app"), {
                signal: fixture.page.signal,
            });
        if (change === "account" || change === "session") {
            fixture.host.changeAccount(
                change === "account" ? "different" : "learner",
                "new-session",
            );
            await fixture.host.ctx.runFlow("authenticate-session", {});
        }
        assert.equal(editor.hasAttribute("data-popup-active"), false);
        pending.resolve(
            Response.json({ data: { ...originalProfile, ...editedFields } }),
        );
        await settle();
        assert.equal(fixture.notices.length, 0);
        assert.equal(fixture.writes.length, 0);
        assert.equal(fixture.refreshed.length, 0);
        assert.equal(fixture.navbarRefreshes.length, 0);
        if (change === "newer-mount")
            assert.equal(
                fixture.values(await fixture.open()).displayName,
                originalProfile.displayName,
            );
    });
}

test("navigation during asynchronous popup preparation leaves no editor or save behind", async (context) => {
    const fixture = await editorFixture(context);
    fixture.document.querySelector(".profile-hero-edit-btn").click();
    fixture.page.abort();
    await settle();
    assert.equal(fixture.active().length, 0);
    assert.equal(fixture.requests.length, 0);
    assert.equal(fixture.notices.length, 0);
});

test("reopening during closing animation keeps unique labels and a functioning form", async (context) => {
    const fixture = await editorFixture(context);
    const first = await fixture.open();
    await fixture.click(first, "cancel");
    assert.ok(first.isConnected, "closed popup is retained for animation");
    const second = await fixture.open();
    assert.notEqual(
        first.querySelector("form").id,
        second.querySelector("form").id,
    );
    for (const input of second.querySelectorAll("input, textarea, select")) {
        const label = second.querySelector(`label[for="${input.id}"]`);
        assert.ok(label);
        assert.equal(label.control, input);
        assert.equal(fixture.document.getElementById(input.id), input);
    }
    fixture.fill(second);
    await fixture.click(second, "save");
    assert.deepEqual(fixture.requests, [editedFields]);
});

test("cross-tab account change closes an idle editor without persisting its draft", async (context) => {
    const fixture = await editorFixture(context);
    const editor = await fixture.open();
    fixture.fill(editor);
    fixture.host.changeAccount("other");
    fixture.window.dispatchEvent(
        new fixture.window.StorageEvent("storage", {
            key: "cognis_account",
            newValue: "other",
        }),
    );
    await settle();
    assert.equal(fixture.active().length, 0);
    assert.equal(fixture.requests.length, 0);
    assert.equal(fixture.notices.length, 0);
});
