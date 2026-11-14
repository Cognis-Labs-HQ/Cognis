import assert from "node:assert/strict";
import test from "node:test";
import { popupFixture } from "./dom-fixture.js";

const variants = ["confirm", "cancel", "neutral"];
const actions = [
    { id: "save", label: "Save", variant: "confirm" },
    { id: "discard", label: "Discard", variant: "cancel" },
    { id: "keep", label: "Änderungen weiter bearbeiten", variant: "neutral" },
    {
        id: "details",
        label: "詳細",
        disabled: true,
        icon: { light: "/icon.svg" },
    },
];

function checkActions(overlay) {
    const buttons = [...overlay.querySelectorAll(".popup-footer button")];
    assert.equal(buttons.length, actions.length);
    buttons.forEach((button, index) => {
        const action = actions[index];
        assert.equal(button.type, "button");
        assert.equal(button.dataset.popupAction, action.id);
        assert.equal(button.textContent, action.label);
        assert.equal(button.disabled, Boolean(action.disabled));
        assert.deepEqual(
            variants.filter((variant) =>
                button.classList.contains(`btn-${variant}`),
            ),
            [action.variant ?? "neutral"],
        );
    });
    assert.equal(buttons.at(-1).querySelector("img").alt, "");
}

test("initial, replaced and newly inserted footers share native consequence classes", async (context) => {
    const fixture = await popupFixture(context);
    const popup = await fixture.open({
        pages: [
            { id: "first", actions },
            { id: "empty", actions: [] },
            { id: "last", actions },
        ],
    });
    checkActions(popup.overlay);
    popup.api.setPage("last");
    checkActions(popup.overlay);
    popup.api.setPage("empty");
    assert.equal(popup.overlay.querySelector(".popup-footer"), null);
    popup.api.setPage("last");
    checkActions(popup.overlay);
    await popup.dismiss();
    const empty = await fixture.open({
        pages: [
            { id: "first", actions: [] },
            { id: "last", actions },
        ],
    });
    empty.api.setPage("last");
    checkActions(empty.overlay);
    await empty.dismiss();
});

test("dirty confirmation gives Discard danger styling and safe Keep neutral styling", async (context) => {
    const fixture = await popupFixture(context);
    const editor = await fixture.open({ closeProtection: true });
    editor.api.markDirty();
    fixture.key("Escape");
    await fixture.settle();
    const confirmation = fixture.active().at(-1);
    assert.equal(
        confirmation
            .querySelector('[data-popup-action="discard"]')
            .classList.contains("btn-cancel"),
        true,
    );
    const keep = confirmation.querySelector('[data-popup-action="keep"]');
    assert.equal(keep.classList.contains("btn-neutral"), true);
    keep.click();
    await fixture.settle();
    assert.equal(fixture.active()[0], editor.overlay);
});

test("pending, stale, inactive and closing action controls cannot reenter callbacks", async (context) => {
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
    save.click();
    save.click();
    assert.equal(calls, 1);
    complete();
    await fixture.settle();
    const child = await fixture.open();
    save.click();
    assert.equal(calls, 1);
    await child.dismiss();
    popup.api.updateBody(
        '<button type="button" data-popup-action="details">Details</button>',
    );
    const details = popup.overlay.querySelector(".popup-body button");
    details.click();
    await fixture.settle();
    assert.equal(calls, 2);
    popup.api.updateBody("");
    details.click();
    assert.equal(calls, 2);
    await popup.dismiss();
    save.click();
    assert.equal(calls, 2);
});

test("pending actions allow explicit close and settled failures permit deliberate retries", async (context) => {
    const fixture = await popupFixture(context);
    let complete;
    let attempts = 0;
    const pending = new Promise((resolve) => {
        complete = resolve;
    });
    const popup = await fixture.open({
        actions,
        onAction: async (action) => {
            if (action === null) return;
            attempts++;
            await pending;
            throw new Error("Synthetic action failure");
        },
    });
    const save = popup.overlay.querySelector('[data-popup-action="save"]');
    save.click();
    popup.overlay.querySelector(".popup-close-btn").click();
    assert.equal(await popup.result, null);
    complete();
    await fixture.settle();
    save.click();
    assert.equal(attempts, 1);
    const retry = await fixture.open({
        actions,
        onAction: () => {
            attempts++;
            throw new Error("Synthetic action failure");
        },
    });
    const retrySave = retry.overlay.querySelector('[data-popup-action="save"]');
    retrySave.click();
    await fixture.settle();
    retrySave.click();
    await fixture.settle();
    assert.equal(attempts, 3);
    await retry.dismiss();
});

test("page replacement revokes old actions and native disabled ancestors block activation", async (context) => {
    const fixture = await popupFixture(context);
    const calls = [];
    const popup = await fixture.open({
        pages: [
            { id: "first", actions },
            { id: "second", actions },
        ],
        onAction: (action) => {
            calls.push(action);
            return false;
        },
    });
    const old = popup.overlay.querySelector('[data-popup-action="save"]');
    popup.api.setPage("second");
    old.click();
    assert.deepEqual(calls, []);
    popup.api.updateBody(
        '<fieldset disabled><button type="button" data-popup-action="blocked">Blocked</button></fieldset><div inert><button type="button" data-popup-action="inert">Inert</button></div>',
    );
    for (const button of popup.overlay.querySelectorAll(".popup-body button")) {
        button.dispatchEvent(
            new fixture.window.MouseEvent("click", { bubbles: true }),
        );
    }
    assert.deepEqual(calls, []);
    await popup.dismiss();
    const done = await fixture.open();
    assert.equal(
        done.overlay
            .querySelector(".popup-footer button")
            .classList.contains("btn-neutral"),
        true,
    );
    await done.dismiss();
});

test("registered hidden completion actions settle a live popup without becoming keyboard defaults", async (context) => {
    const fixture = await popupFixture(context);
    const popup = await fixture.open({
        body: '<input><button type="button" data-popup-action="verified" class="btn-confirm" style="display:none">Verified</button>',
        actions: [{ id: "cancel", label: "Cancel", variant: "neutral" }],
    });
    assert.equal(fixture.key("Enter").defaultPrevented, false);
    assert.deepEqual(fixture.active(), [popup.overlay]);
    popup.overlay.querySelector('[data-popup-action="verified"]').click();
    assert.equal(await popup.result, "verified");
    assert.equal(fixture.document.activeElement, fixture.invoker);
});
