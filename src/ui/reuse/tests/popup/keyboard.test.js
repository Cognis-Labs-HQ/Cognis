import assert from "node:assert/strict";
import test from "node:test";
import { popupFixture } from "./dom-fixture.js";

function ownName(document, overlay, expected) {
    const heading = document.getElementById(
        overlay.getAttribute("aria-labelledby"),
    );
    assert.equal(heading, overlay.querySelector("h2"));
    assert.equal(heading.textContent, expected);
}

test("dirty Cancel, Keep, repeated Cancel and Discard preserve names and focus through closing animation", async (context) => {
    const fixture = await popupFixture(context);
    const { document, window, invoker, key, settle, active } = fixture;
    const editor = await fixture.open({
        closeProtection: true,
        actions: [{ id: "cancel", label: "Cancel", variant: "cancel" }],
    });
    const input = editor.overlay.querySelector("input");
    assert.equal(document.activeElement, input);
    input.value = "Changed";
    input.dispatchEvent(new window.Event("input", { bubbles: true }));
    const cancel = editor.overlay.querySelector('[data-popup-action="cancel"]');
    cancel.focus();
    cancel.click();
    await settle();
    const child = active().at(-1);
    assert.equal(active().length, 2);
    ownName(document, editor.overlay, "Synthetic editor");
    ownName(document, child, "Unsaved Changes");
    input.focus();
    assert.ok(child.contains(document.activeElement));
    child.querySelector('[data-popup-action="keep"]').click();
    await settle();
    assert.equal(document.activeElement, cancel);
    assert.equal(input.value, "Changed");
    assert.equal(
        child.isConnected,
        true,
        "closing animation retains the overlay",
    );
    assert.equal(child.inert, true);
    assert.equal(key("Tab").defaultPrevented, true);
    assert.equal(
        document.activeElement,
        editor.overlay.querySelector("button"),
    );
    key("Escape");
    await settle();
    const repeated = active().at(-1);
    ownName(document, repeated, "Unsaved Changes");
    assert.notEqual(
        repeated.getAttribute("aria-labelledby"),
        child.getAttribute("aria-labelledby"),
    );
    repeated.querySelector('[data-popup-action="discard"]').click();
    await editor.result;
    assert.equal(active().length, 0);
    assert.equal(document.activeElement, invoker);
});

test("Tab wraps both directions and rejects background focus in the topmost of three modals", async (context) => {
    const fixture = await popupFixture(context);
    const first = await fixture.open();
    const second = await fixture.open();
    const third = await fixture.open();
    const { document, key } = fixture;
    for (const popup of [first, second, third])
        ownName(document, popup.overlay, "Synthetic editor");
    const buttons = third.overlay.querySelectorAll("button");
    buttons[0].focus();
    assert.equal(key("Tab", true).defaultPrevented, true);
    assert.equal(document.activeElement, buttons[1]);
    assert.equal(key("Tab").defaultPrevented, true);
    assert.equal(document.activeElement, buttons[0]);
    fixture.invoker.focus();
    assert.ok(third.overlay.contains(document.activeElement));
    await third.dismiss();
    assert.ok(second.overlay.contains(document.activeElement));
    await second.dismiss();
    assert.ok(first.overlay.contains(document.activeElement));
    await first.dismiss();
    assert.equal(document.activeElement, fixture.invoker);
});

test("empty mandatory modal and dynamic hidden disabled or removed controls remain contained", async (context) => {
    const fixture = await popupFixture(context);
    const { document, key, settle } = fixture;
    const popup = await fixture.open({
        mandatory: true,
        actions: [],
        body: "",
    });
    assert.equal(document.activeElement, popup.overlay);
    assert.equal(key("Tab").defaultPrevented, true);
    assert.equal(key("Tab", true).defaultPrevented, true);
    key("Escape");
    await settle();
    assert.equal(fixture.active().length, 1);
    popup.api.updateBody(
        '<input disabled><button hidden>Hidden</button><div style="display:none"><button>Invisible</button></div><button id="live">Live</button>',
    );
    await settle();
    key("Tab");
    assert.equal(document.activeElement.id, "live");
    document.activeElement.disabled = true;
    await settle();
    assert.equal(document.activeElement, popup.overlay);
    popup.api.updateBody('<input id="replacement">');
    await settle();
    key("Tab");
    assert.equal(document.activeElement.id, "replacement");
    popup.api.updateBody("");
    await settle();
    assert.equal(document.activeElement, popup.overlay);
    await popup.dismiss();
    fixture.invoker.focus();
    assert.equal(document.activeElement, fixture.invoker);
});

test("page changes keep instance naming and recover focus without reviving dismissed content", async (context) => {
    const fixture = await popupFixture(context);
    const popup = await fixture.open({
        pages: [
            {
                id: "first",
                title: "First",
                body: "<input>",
                actions: [{ id: "next", label: "Next" }],
            },
            { id: "second", title: "Second", body: "<textarea></textarea>" },
        ],
    });
    const headingId = popup.overlay.getAttribute("aria-labelledby");
    assert.equal(popup.api.setPage("second"), true);
    await fixture.settle();
    ownName(fixture.document, popup.overlay, "Second");
    assert.equal(popup.overlay.getAttribute("aria-labelledby"), headingId);
    assert.equal(
        fixture.document.activeElement,
        popup.overlay.querySelector("textarea"),
    );
    await popup.dismiss();
    assert.equal(popup.api.setPage("first"), false);
    assert.equal(popup.api.updateBody("<button>Stale</button>"), null);
});

test("removed invokers fall back safely and repeated opens restore the connected invoker", async (context) => {
    const fixture = await popupFixture(context);
    const popup = await fixture.open();
    fixture.invoker.remove();
    popup.overlay.querySelector(".popup-close-btn").click();
    await popup.result;
    assert.equal(fixture.document.activeElement, fixture.document.body);
    const anchor = fixture.document.querySelector("a");
    anchor.focus();
    for (let index = 0; index < 3; index++) {
        const reopened = await fixture.open();
        await reopened.dismiss();
        assert.equal(fixture.document.activeElement, anchor);
    }
});

test("abort during a nested dirty decision clears focus ownership without stealing newer navigation focus", async (context) => {
    const fixture = await popupFixture(context);
    const controller = new fixture.window.AbortController();
    const popup = await fixture.open({
        signal: controller.signal,
        closeProtection: true,
    });
    popup.api.markDirty();
    fixture.key("Escape");
    await fixture.settle();
    assert.equal(fixture.active().length, 2);
    controller.abort();
    const next = fixture.document.querySelector("a");
    next.focus();
    await popup.result;
    await fixture.settle();
    assert.equal(fixture.active().length, 0);
    assert.equal(fixture.document.activeElement, next);
    assert.equal(popup.api.updateBody("<input>"), null);
    const aborted = await fixture.open({ signal: controller.signal });
    assert.equal(await aborted.result, null);
    assert.equal(fixture.document.activeElement, next);
});

test("separately loaded popup modules share the actual active stack and unique heading identity", async (context) => {
    const first = await popupFixture(context);
    const second = await popupFixture(
        context,
        first.window,
        first.capabilities,
    );
    const parent = await first.open();
    const child = await second.open();
    ownName(first.document, parent.overlay, "Synthetic editor");
    ownName(first.document, child.overlay, "Synthetic editor");
    parent.overlay.querySelector("input").focus();
    assert.ok(child.overlay.contains(first.document.activeElement));
    await child.dismiss();
    assert.equal(
        first.document.activeElement,
        parent.overlay.querySelector("input"),
    );
    first.key("Escape");
    await parent.result;
    assert.equal(first.document.activeElement, first.invoker);
});

test("aborting only a child returns focus to its surviving parent", async (context) => {
    const fixture = await popupFixture(context);
    const parent = await fixture.open();
    const controller = new fixture.window.AbortController();
    const child = await fixture.open({ signal: controller.signal });
    controller.abort();
    await child.result;
    assert.equal(
        fixture.document.activeElement,
        parent.overlay.querySelector("input"),
    );
    await parent.dismiss();
});

test("a pending action completion after abort cannot update or refocus a newer popup", async (context) => {
    const fixture = await popupFixture(context);
    const controller = new fixture.window.AbortController();
    let complete;
    const pending = new Promise((resolve) => {
        complete = resolve;
    });
    let staleBody;
    const old = await fixture.open({
        signal: controller.signal,
        onAction: async (action, overlay, api) => {
            await pending;
            staleBody = api.updateBody("<input>");
            return true;
        },
    });
    old.overlay.querySelector(".popup-close-btn").click();
    controller.abort();
    await old.result;
    const current = await fixture.open();
    complete();
    await fixture.settle();
    assert.equal(staleBody, null);
    assert.ok(current.overlay.contains(fixture.document.activeElement));
    assert.equal(fixture.active().length, 1);
    await current.dismiss();
});

test("keyboard opening and heading actions retain their public behavior and name", async (context) => {
    const fixture = await popupFixture(context);
    let opening;
    let action;
    fixture.invoker.addEventListener("keydown", (event) => {
        if (event.key === "Enter")
            opening = fixture.open({
                titleAction: { id: "inspect", label: "Inspect" },
                titleDetail: "Detail",
                onAction: (actionId) => {
                    action = actionId;
                    return false;
                },
            });
    });
    fixture.key("Enter");
    const popup = await opening;
    ownName(fixture.document, popup.overlay, "Inspect");
    assert.equal(
        popup.overlay.querySelector(".popup-title-detail").textContent,
        "Detail",
    );
    popup.overlay.querySelector('[data-popup-action="inspect"]').click();
    await fixture.settle();
    assert.equal(action, "inspect");
    assert.equal(fixture.active().length, 1);
    await popup.dismiss();
    assert.equal(fixture.document.activeElement, fixture.invoker);
});
