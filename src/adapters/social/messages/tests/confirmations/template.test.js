import assert from "node:assert/strict";
import test from "node:test";
import { templateFixture } from "./fixture.js";
import { deferred } from "../async-state/fixture.js";

for (const outcome of [
    "cancel",
    "confirm",
    "Escape",
    "close",
    "backdrop",
    "Enter",
    " ",
]) {
    test(`template Delete popup respects ${JSON.stringify(outcome)}`, async (context) => {
        const fixture = await templateFixture(context);
        const pending = fixture.openDelete();
        await fixture.settle();
        const overlay = fixture.active()[0];
        const cancel = overlay.querySelector('[data-popup-action="cancel"]');
        const confirm = overlay.querySelector('[data-popup-action="confirm"]');
        assert.ok(cancel.classList.contains("btn-neutral"));
        assert.ok(confirm.classList.contains("btn-cancel"));
        assert.ok(overlay.textContent.includes("<Synthetic & template>"));
        if (outcome === "Escape") fixture.key("Escape");
        else if (outcome === "backdrop") overlay.click();
        else if (["Enter", " "].includes(outcome)) {
            cancel.focus();
            assert.equal(fixture.key(outcome).defaultPrevented, false);
            assert.equal(fixture.writes.length, 0);
            cancel.click();
        } else
            overlay.querySelector(`[data-popup-action="${outcome}"]`).click();
        confirm.click();
        await pending;
        assert.equal(fixture.writes.length, outcome === "confirm" ? 1 : 0);
        assert.equal(fixture.read().length, outcome === "confirm" ? 0 : 1);
    });
}

for (const kind of ["delete", "edit"]) {
    for (const change of [
        "selection",
        "abort",
        "cleanup",
        "account",
        "token",
        "preferences",
        "template",
    ]) {
        test(`${change} invalidates template ${kind} without overwriting newer data`, async (context) => {
            const fixture = await templateFixture(context);
            const pending =
                kind === "delete"
                    ? fixture.openDelete()
                    : fixture.templates.openTemplatesPopup("template-A");
            await fixture.settle();
            const overlay = fixture.active()[0];
            if (change === "selection") fixture.state.generation++;
            if (change === "abort") fixture.controller.abort();
            if (change === "cleanup") fixture.state.disposed = true;
            if (change === "account")
                fixture.storage.set("cognis_account", "replacement");
            if (change === "token")
                fixture.storage.set("cognis_access_token", "replacement");
            if (change === "preferences")
                fixture.storage.set("messages:saved-templates:v1:reader", "[]");
            if (change === "template")
                fixture.storage.set(
                    "messages:saved-templates:v1:reader",
                    JSON.stringify([
                        { ...fixture.original[0], content: "Newer content" },
                    ]),
                );
            const expected = fixture.read();
            if (kind === "delete")
                overlay.querySelector('[data-popup-action="confirm"]').click();
            else
                overlay.querySelector("form").dispatchEvent(
                    new fixture.window.Event("submit", {
                        bubbles: true,
                        cancelable: true,
                    }),
                );
            await pending;
            assert.equal(fixture.writes.length, 0);
            assert.deepEqual(fixture.read(), expected);
            assert.deepEqual(fixture.toasts, []);
        });
    }
}

test("template openings coalesce before popup preparation and retained rows cannot delete twice", async (context) => {
    const fixture = await templateFixture(context);
    const pending = fixture.openDelete();
    await fixture.openDelete();
    await fixture.templates.openTemplatesPopup();
    await fixture.settle();
    assert.equal(fixture.active().length, 1);
    fixture.active()[0].querySelector('[data-popup-action="confirm"]').click();
    await pending;
    await fixture.openDelete();
    assert.equal(fixture.writes.length, 1);
    assert.equal(fixture.read().length, 0);
});

test("editor persists once and retained editor controls cannot change a newer editor", async (context) => {
    const fixture = await templateFixture(context);
    const pending = fixture.templates.openTemplatesPopup("template-A");
    await fixture.settle();
    const oldOverlay = fixture.active()[0];
    oldOverlay.querySelector("input").value = "Edited";
    oldOverlay.querySelector("textarea").value = "New content";
    const submit = () =>
        oldOverlay.querySelector("form").dispatchEvent(
            new fixture.window.Event("submit", {
                bubbles: true,
                cancelable: true,
            }),
        );
    submit();
    submit();
    await pending;
    assert.equal(fixture.writes.length, 1);
    assert.equal(fixture.read()[0].title, "Edited");
    const newer = fixture.templates.openTemplatesPopup("template-A");
    await fixture.settle();
    const newOverlay = fixture.active()[0];
    oldOverlay.querySelector("[data-template-token]").click();
    submit();
    assert.equal(newOverlay.querySelector("textarea").value, "New content");
    assert.equal(fixture.writes.length, 1);
    newOverlay.querySelector('[data-popup-action="close"]').click();
    await newer;
});

for (const kind of ["delete", "edit"]) {
    test(`failed template ${kind} reports an error without losing stored templates`, async (context) => {
        const fixture = await templateFixture(context);
        const pending =
            kind === "delete"
                ? fixture.openDelete()
                : fixture.templates.openTemplatesPopup("template-A");
        await fixture.settle();
        fixture.state.failWrite = true;
        const overlay = fixture.active()[0];
        if (kind === "delete")
            overlay.querySelector('[data-popup-action="confirm"]').click();
        else
            overlay.querySelector("form").dispatchEvent(
                new fixture.window.Event("submit", {
                    bubbles: true,
                    cancelable: true,
                }),
            );
        await pending;
        assert.equal(fixture.writes.length, 0);
        assert.equal(fixture.read().length, 1);
        assert.equal(fixture.toasts.length, 1);
    });
}

for (const corrupt of ["{", "{}", "[{}]"]) {
    test(`unreadable saved templates ${corrupt} never become an empty writable list`, async (context) => {
        const fixture = await templateFixture(context);
        fixture.storage.set("messages:saved-templates:v1:reader", corrupt);
        fixture.templates.renderSidebarTemplateList();
        await fixture.templates.openTemplatesPopup();
        await fixture.openDelete();
        assert.equal(fixture.active().length, 0);
        assert.equal(fixture.writes.length, 0);
        assert.equal(
            fixture.storage.get("messages:saved-templates:v1:reader"),
            corrupt,
        );
        assert.equal(fixture.toasts.length, 1);
    });
}

test("template deletion writes only the initiating account list", async (context) => {
    const fixture = await templateFixture(context);
    const otherTemplates = JSON.stringify([
        { id: "other", title: "Other", content: "Other content" },
    ]);
    fixture.storage.set(
        "messages:saved-templates:v1:other-account",
        otherTemplates,
    );
    const pending = fixture.openDelete();
    await fixture.settle();
    fixture.active()[0].querySelector('[data-popup-action="confirm"]').click();
    await pending;
    assert.deepEqual(
        fixture.writes.map(({ key }) => key),
        ["messages:saved-templates:v1:reader"],
    );
    assert.equal(
        fixture.storage.get("messages:saved-templates:v1:other-account"),
        otherTemplates,
    );
});

test("obsolete template popup preparation failure stays silent", async (context) => {
    const fixture = await templateFixture(context);
    const gate = deferred();
    fixture.state.openPopup = () => gate.promise;
    const pending = fixture.openDelete();
    fixture.state.generation++;
    gate.reject(new Error("synthetic_obsolete_popup"));
    await pending;
    assert.equal(fixture.writes.length, 0);
    assert.deepEqual(fixture.toasts, []);
});
