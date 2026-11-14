import assert from "node:assert/strict";
import test from "node:test";
import { popupFixture } from "./dom-fixture.js";
import { tutorialFixture } from "./tutorial-fixture.js";

// jsdom dispatches keys but does not synthesize native button activation.
function nativeActivation(fixture, button, key = "Enter", options = {}) {
    button.focus();
    const event = new fixture.window.KeyboardEvent("keydown", {
        key,
        bubbles: true,
        cancelable: true,
        ...options,
    });
    button.dispatchEvent(event);
    if (!event.defaultPrevented) button.click();
    return event;
}

const actions = [
    { id: "cancel", label: "Cancel", variant: "neutral" },
    { id: "confirm", label: "Delete", variant: "cancel" },
    { id: "save", label: "Save", variant: "confirm" },
];

test("Enter and Space on focused controls never choose a different popup action", async (context) => {
    const fixture = await popupFixture(context);
    const calls = [];
    const popup = await fixture.open({
        actions,
        headerActions: [{ id: "help", label: "Help" }],
        titleAction: { id: "inspect", label: "Inspect" },
        onAction: (action) => {
            calls.push(action);
            return false;
        },
    });
    for (const key of ["Enter", " "]) {
        for (const action of ["cancel", "confirm", "save", "help", "inspect"]) {
            const button = popup.overlay.querySelector(
                `[data-popup-action="${action}"]`,
            );
            assert.equal(
                nativeActivation(fixture, button, key).defaultPrevented,
                false,
            );
            await fixture.settle();
            assert.equal(calls.at(-1), action);
        }
    }
    assert.equal(calls.length, 10);
    await popup.dismiss();
});

test("focused Keep preserves a real dirty editor and explicit Discard closes it once", async (context) => {
    const fixture = await popupFixture(context);
    const editor = await fixture.open({ closeProtection: true, actions });
    const input = editor.overlay.querySelector("input");
    input.value = "Unsaved synthetic draft";
    input.dispatchEvent(new fixture.window.Event("input", { bubbles: true }));
    fixture.key("Escape");
    await fixture.settle();
    const first = fixture.active().at(-1);
    assert.equal(fixture.document.activeElement.dataset.popupAction, "keep");
    assert.equal(
        nativeActivation(
            fixture,
            first.querySelector('[data-popup-action="discard"]'),
            "Enter",
            { repeat: true },
        ).defaultPrevented,
        true,
    );
    assert.equal(fixture.active().length, 2);
    nativeActivation(
        fixture,
        first.querySelector('[data-popup-action="keep"]'),
    );
    await fixture.settle();
    assert.deepEqual(fixture.active(), [editor.overlay]);
    assert.equal(input.value, "Unsaved synthetic draft");
    assert.equal(first.inert, true);
    fixture.key("Escape");
    await fixture.settle();
    const second = fixture.active().at(-1);
    nativeActivation(
        fixture,
        second.querySelector('[data-popup-action="discard"]'),
    );
    await editor.result;
    assert.deepEqual(fixture.active(), []);
    assert.equal(fixture.document.activeElement, fixture.invoker);
});

test("single-line Save shortcut leaves native editing, modifiers and cancellation alone", async (context) => {
    const fixture = await popupFixture(context);
    const calls = [];
    const popup = await fixture.open({
        actions,
        onAction: (action) => {
            calls.push(action);
            return false;
        },
    });
    const input = popup.overlay.querySelector("input");
    assert.equal(fixture.key("Enter").defaultPrevented, true);
    await fixture.settle();
    assert.deepEqual(calls, ["save"]);
    for (const options of [
        { shiftKey: true },
        { ctrlKey: true },
        { altKey: true },
        { metaKey: true },
        { isComposing: true },
        { keyCode: 229 },
    ]) {
        const event = new fixture.window.KeyboardEvent("keydown", {
            key: "Enter",
            bubbles: true,
            cancelable: true,
            ...options,
        });
        input.dispatchEvent(event);
        assert.equal(event.defaultPrevented, false);
    }
    input.addEventListener("keydown", (event) => event.preventDefault(), {
        once: true,
    });
    fixture.key("Enter");
    for (const body of [
        "<textarea></textarea>",
        '<div contenteditable="true" tabindex="0"><span tabindex="0">Text</span></div>',
        '<div contenteditable="plaintext-only" tabindex="0">Text</div>',
        "<select><option>Choice</option></select>",
        '<input type="checkbox">',
        '<input type="number">',
        '<form><input><button type="submit">Submit</button></form>',
        '<a href="#example">Link</a>',
        '<input role="combobox" aria-expanded="true">',
        '<input list="choices"><datalist id="choices"><option value="Example"></datalist>',
    ]) {
        popup.api.updateBody(body);
        const target = popup.overlay.querySelector(
            ".popup-body [tabindex], .popup-body input, .popup-body textarea, .popup-body select, .popup-body a",
        );
        target.focus();
        assert.equal(fixture.key("Enter").defaultPrevented, false, body);
        await fixture.settle();
    }
    assert.deepEqual(calls, ["save"]);
    await popup.dismiss();
});

test("disabled hidden removed and destructive controls never become implicit defaults", async (context) => {
    const fixture = await popupFixture(context);
    let calls = 0;
    const popup = await fixture.open({
        actions,
        onAction: () => {
            calls++;
            return false;
        },
    });
    const input = popup.overlay.querySelector("input");
    const save = popup.overlay.querySelector('[data-popup-action="save"]');
    for (const attribute of ["disabled", "hidden", "inert", "aria-disabled"]) {
        save.setAttribute(attribute, "true");
        input.focus();
        assert.equal(fixture.key("Enter").defaultPrevented, false, attribute);
        save.removeAttribute(attribute);
    }
    save.style.display = "none";
    assert.equal(fixture.key("Enter").defaultPrevented, false);
    save.remove();
    assert.equal(fixture.key("Enter").defaultPrevented, false);
    await fixture.settle();
    assert.equal(calls, 0);
    await popup.dismiss();
});

test("held and pending Enter cannot repeat actions", async (context) => {
    const fixture = await popupFixture(context);
    let complete;
    let calls = 0;
    const pending = new Promise((resolve) => {
        complete = resolve;
    });
    const popup = await fixture.open({
        actions,
        onAction: async () => {
            calls++;
            await pending;
            return false;
        },
    });
    const save = popup.overlay.querySelector('[data-popup-action="save"]');
    nativeActivation(fixture, save);
    assert.equal(
        nativeActivation(fixture, save, "Enter", { repeat: true })
            .defaultPrevented,
        true,
    );
    nativeActivation(fixture, save);
    assert.equal(calls, 1);
    complete();
    await fixture.settle();
    nativeActivation(fixture, save);
    await fixture.settle();
    assert.equal(calls, 2);
    await popup.dismiss();
});

test("registered tutorial controls keep Enter through replay and nested popup ownership", async (context) => {
    const fixture = await tutorialFixture(context);
    let calls = 0;
    const popup = await fixture.open({
        actions,
        onAction: () => {
            calls++;
            return false;
        },
    });
    for (let index = 0; index < 2; index++) {
        const guide = await fixture.guide(popup);
        nativeActivation(
            fixture,
            guide.menu.querySelector('[data-action="next"]'),
        );
        assert.deepEqual(guide.actions, ["next"]);
        assert.equal(calls, 0);
        const child = await fixture.open({ body: "<p>Decision</p>", actions });
        nativeActivation(
            fixture,
            child.overlay.querySelector('[data-popup-action="cancel"]'),
        );
        assert.equal(await child.result, "cancel");
        assert.equal(calls, 0);
        guide.view.dispose();
    }
    await popup.dismiss();
});

test("constructive descriptors keep Confirm and custom field shortcuts independent of CSS", async (context) => {
    const fixture = await popupFixture(context);
    for (const id of ["confirm", "create"]) {
        const calls = [];
        const popup = await fixture.open({
            actions: [
                { id, label: "Continue", variant: "confirm" },
                { id: "delete", label: "Delete", variant: "cancel" },
            ],
            onAction: (action) => {
                calls.push(action);
                return false;
            },
        });
        popup.overlay.querySelector(`[data-popup-action="${id}"]`).className =
            "btn-neutral";
        popup.overlay.querySelector('[data-popup-action="delete"]').className =
            "btn-confirm";
        fixture.key("Enter");
        await fixture.settle();
        assert.deepEqual(calls, [id]);
        await popup.dismiss();
    }
});

test("native form submission keeps validation and ignores footer shortcuts", async (context) => {
    const fixture = await popupFixture(context);
    let submissions = 0;
    let actionsCalled = 0;
    const popup = await fixture.open({
        body: '<form id="native"><input required><button type="submit">Submit</button></form><input form="native" aria-label="Associated">',
        actions,
        onAction: () => {
            actionsCalled++;
            return false;
        },
    });
    const form = popup.overlay.querySelector("form");
    form.addEventListener("submit", (event) => {
        event.preventDefault();
        submissions++;
    });
    for (const input of popup.overlay.querySelectorAll("input")) {
        input.focus();
        assert.equal(fixture.key("Enter").defaultPrevented, false);
        form.requestSubmit();
        assert.equal(submissions, 0);
    }
    form.querySelector("input").value = "Valid";
    form.requestSubmit();
    assert.equal(submissions, 1);
    assert.equal(actionsCalled, 0);
    await popup.dismiss();
});

test("real footer-owned form-builder fields preserve constructive actions and owner validation", async (context) => {
    const fixture = await popupFixture(context);
    const { createFormBuilder } = await fixture.importModule("form-builder.js");
    const { escapeHtml } = await fixture.importModule("escape-html.js");
    const builder = createFormBuilder(
        { escapeHtml, i18n: { t: () => "Required" } },
        {
            formId: "footer-owned",
            includeSubmitButton: false,
            fields: [{ name: "name", label: "Name", required: true }],
        },
    );
    let controller;
    let calls = 0;
    let saves = 0;
    const popup = await fixture.open({
        body: builder.render(),
        actions,
        onOpen: (overlay) => {
            controller = builder.attach(overlay.querySelector("form"));
        },
        onAction: (action) => {
            calls++;
            if (action === "save" && controller.validateAll(true)) saves++;
            return false;
        },
    });
    assert.equal(fixture.key("Enter").defaultPrevented, true);
    await fixture.settle();
    assert.equal(calls, 1);
    assert.equal(saves, 0);
    const input = popup.overlay.querySelector("input");
    input.value = "Valid";
    fixture.key("Enter");
    await fixture.settle();
    assert.equal(saves, 1);
    const submit = fixture.document.createElement("button");
    submit.type = "submit";
    submit.textContent = "Owner submit";
    popup.overlay.querySelector("form").append(submit);
    assert.equal(fixture.key("Enter").defaultPrevented, false);
    assert.equal(saves, 1);
    submit.remove();
    const imageSubmit = fixture.document.createElement("input");
    imageSubmit.type = "image";
    imageSubmit.setAttribute("form", "footer-owned");
    popup.overlay.querySelector(".popup-body").append(imageSubmit);
    assert.equal(fixture.key("Enter").defaultPrevented, false);
    assert.equal(saves, 1);
    controller.detach();
    await popup.dismiss();
});
