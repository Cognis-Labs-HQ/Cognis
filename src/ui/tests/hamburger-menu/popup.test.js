import assert from "node:assert/strict";
import test from "node:test";
import { popupFixture } from "../../reuse/tests/popup/dom-fixture.js";

test("opening an actual popup dismisses the action menu without taking modal focus", async (context) => {
    const { uiCtx } = await import("../../reuse/ui-ctx.js");
    const capabilities = new Map([
        ["ui:floatingMenus", uiCtx.capabilities.get("ui:floatingMenus")],
    ]);
    const fixture = await popupFixture(context, undefined, capabilities);
    const { document, window, invoker } = fixture;
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = "/static/styles/reuse/hamburger-menu.css";
    Object.defineProperty(link, "sheet", { value: {} });
    document.head.append(link);
    const { openHamburgerMenu } =
        await fixture.importModule("hamburger-menu.js");
    const choice = openHamburgerMenu(invoker, {
        items: [{ id: "edit", label: "Edit" }],
    });
    await fixture.settle();
    assert.equal(document.activeElement.dataset.actionId, "edit");
    const popup = await fixture.open();
    assert.equal(await choice, null);
    assert.ok(popup.overlay.contains(document.activeElement));
    document.activeElement.dispatchEvent(
        new window.KeyboardEvent("keydown", { key: "Escape", bubbles: true }),
    );
    await popup.result;
    assert.equal(document.querySelector(".hamburger-menu"), null);
});

async function modalMenuFixture(context) {
    const { uiCtx } = await import("../../reuse/ui-ctx.js");
    const fixture = await popupFixture(
        context,
        undefined,
        new Map([
            ["ui:floatingMenus", uiCtx.capabilities.get("ui:floatingMenus")],
        ]),
    );
    const { document, window } = fixture;
    const resources = new window.MutationObserver(() => {
        for (const link of document.head.querySelectorAll("link")) {
            if (link.sheet) continue;
            Object.defineProperty(link, "sheet", { value: {} });
            link.dispatchEvent(new window.Event("load"));
        }
    });
    resources.observe(document.head, { childList: true });
    context.after(() => resources.disconnect());
    const popup = await fixture.open({
        body: '<button id="menu-trigger">Actions</button><button id="other-control">Other</button>',
    });
    const trigger = popup.overlay.querySelector("#menu-trigger");
    trigger.focus();
    const { openHamburgerMenu } =
        await fixture.importModule("hamburger-menu.js");
    const open = (options = {}) =>
        openHamburgerMenu(trigger, {
            items: [
                { id: "disabled", label: "Disabled", disabled: true },
                { id: "inspect", label: "Inspect" },
                { id: "edit", label: "Edit" },
            ],
            ...options,
        });
    return { ...fixture, openPopup: fixture.open, popup, trigger, open };
}

test("menu inside actual popup supports keyboard entry, navigation and Escape without closing parent", async (context) => {
    const fixture = await modalMenuFixture(context);
    const { document, popup, trigger, open, settle, key } = fixture;
    const result = open();
    await settle();
    assert.equal(document.activeElement.dataset.actionId, "inspect");
    key("ArrowDown");
    assert.equal(document.activeElement.dataset.actionId, "edit");
    key("Escape");
    assert.equal(await result, null);
    assert.equal(document.activeElement, trigger);
    assert.equal(popup.overlay.hasAttribute("data-popup-active"), true);
    const repeated = open();
    await settle();
    assert.equal(document.activeElement.dataset.actionId, "inspect");
    document.activeElement.click();
    assert.equal(await repeated, "inspect");
    assert.equal(document.activeElement, trigger);
    await popup.dismiss();
});

test("inside-popup outside focus remains on the chosen control after delegation release", async (context) => {
    const { document, popup, open, settle } = await modalMenuFixture(context);
    const result = open();
    await settle();
    const outside = popup.overlay.querySelector("#other-control");
    outside.focus();
    outside.click();
    assert.equal(await result, null);
    assert.equal(document.activeElement, outside);
    await popup.dismiss();
});

test("nested popup takes focus and parent teardown cancels a delegated menu", async (context) => {
    const fixture = await modalMenuFixture(context);
    const { document, popup, open, settle, trigger } = fixture;
    const result = open();
    await settle();
    const child = await fixture.openPopup({ title: "Nested decision" });
    assert.equal(await result, null);
    assert.ok(child.overlay.contains(document.activeElement));
    await child.dismiss();
    trigger.focus();
    const repeated = open();
    await settle();
    assert.equal(document.activeElement.dataset.actionId, "inspect");
    await popup.dismiss();
    assert.equal(await repeated, null);
    assert.equal(document.querySelector(".hamburger-menu"), null);
});
