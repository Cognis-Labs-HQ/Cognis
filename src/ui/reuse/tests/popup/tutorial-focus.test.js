import assert from "node:assert/strict";
import test from "node:test";
import { tutorialFixture } from "./tutorial-fixture.js";
import { popupFixture } from "./dom-fixture.js";

function focusAction(fixture, guide, name) {
    const control = guide.menu.querySelector(`[data-action="${name}"]`);
    control.focus();
    assert.equal(fixture.document.activeElement, control);
    control.click();
    assert.equal(guide.actions.at(-1), name);
}

test("accepted popup tutorials retain Next, Back, Finish and menu keyboard focus across steps and replay", async (context) => {
    const fixture = await tutorialFixture(context);
    const popup = await fixture.open();
    let guide = await fixture.guide(popup);
    assert.equal(fixture.document.activeElement, guide.panel);
    focusAction(fixture, guide, "next");
    fixture.key("Tab");
    assert.ok(
        guide.menu.contains(fixture.document.activeElement) ||
            popup.overlay.contains(fixture.document.activeElement),
    );
    guide.view.dispose();
    assert.ok(popup.overlay.contains(fixture.document.activeElement));
    guide = await fixture.guide(popup, { index: 1, interaction: "none" });
    focusAction(fixture, guide, "back");
    focusAction(fixture, guide, "restart");
    popup.overlay.querySelector("input").focus();
    assert.equal(fixture.document.activeElement, guide.panel);
    popup.api.updateBody('<input value="Updated">');
    await fixture.settle();
    assert.equal(fixture.document.activeElement, guide.panel);
    guide.view.dispose();
    guide = await fixture.guide(popup, { index: 2 });
    focusAction(fixture, guide, "next");
    assert.equal(
        guide.menu.querySelector('[data-action="next"]').textContent,
        "Finish",
    );
    guide.controller.abort();
    await fixture.settle();
    assert.ok(popup.overlay.contains(fixture.document.activeElement));
    guide = await fixture.guide(popup);
    focusAction(fixture, guide, "next");
    guide.view.dispose();
    await popup.dismiss();
    assert.equal(fixture.document.activeElement, fixture.invoker);
});

test("new unrelated mandatory popup retains ownership and does not inherit tutorial delegation", async (context) => {
    const fixture = await tutorialFixture(context);
    const parent = await fixture.open();
    const guide = await fixture.guide(parent);
    const child = await fixture.open({
        mandatory: true,
        actions: [],
        body: "",
    });
    child.overlay.classList.add("popup-overlay--visible");
    guide.menu.querySelector('[data-action="next"]').focus();
    assert.equal(fixture.document.activeElement, child.overlay);
    assert.equal(fixture.key("Tab").defaultPrevented, true);
    fixture.key("Escape");
    assert.equal(fixture.active().length, 2);
    guide.controller.abort();
    assert.equal(fixture.document.activeElement, child.overlay);
    await child.dismiss();
    assert.ok(parent.overlay.contains(fixture.document.activeElement));
    await parent.dismiss();
});

test("a tutorial that does not accept the popup never receives its focus ownership", async (context) => {
    const fixture = await tutorialFixture(context);
    const popup = await fixture.open();
    const guide = await fixture.guide(popup, { selector: ".unrelated-popup" });
    assert.ok(guide.actions.includes("modal"));
    assert.equal(guide.panel, null);
    fixture.invoker.focus();
    assert.ok(popup.overlay.contains(fixture.document.activeElement));
    await popup.dismiss();
});

test("removed tutorial surfaces revoke delegation and restore ordinary popup keyboard ownership", async (context) => {
    const fixture = await tutorialFixture(context);
    const popup = await fixture.open();
    const guide = await fixture.guide(popup, { interaction: "none" });
    guide.panel.remove();
    await Promise.resolve();
    await Promise.resolve();
    assert.ok(popup.overlay.contains(fixture.document.activeElement));
    assert.equal(guide.menu.isConnected, false);
    const controls = popup.overlay.querySelectorAll("button");
    controls[controls.length - 1].focus();
    assert.equal(fixture.key("Tab").defaultPrevented, true);
    assert.equal(fixture.document.activeElement, controls[0]);
    await popup.dismiss();
});

test("abort and stale tutorial cleanup never refocus an old page or a newer dialog", async (context) => {
    const fixture = await tutorialFixture(context);
    const controller = new fixture.window.AbortController();
    const popup = await fixture.open({ signal: controller.signal });
    const guide = await fixture.guide(popup);
    controller.abort();
    guide.controller.abort();
    await popup.result;
    const next = fixture.document.querySelector("a");
    next.focus();
    await fixture.settle();
    assert.equal(fixture.document.activeElement, next);
    const current = await fixture.open();
    guide.view.dispose();
    assert.ok(current.overlay.contains(fixture.document.activeElement));
    await current.dismiss();
});

test("separately loaded popup modules share explicit tutorial delegation and revocation", async (context) => {
    const fixture = await tutorialFixture(context);
    const other = await popupFixture(
        context,
        fixture.window,
        fixture.capabilities,
    );
    const popup = await other.open();
    const guide = await fixture.guide(popup);
    focusAction(fixture, guide, "next");
    popup.api.updateBody('<input value="Updated">');
    await fixture.settle();
    assert.ok(guide.menu.contains(fixture.document.activeElement));
    guide.view.dispose();
    assert.ok(popup.overlay.contains(fixture.document.activeElement));
    await popup.dismiss();
});

test("delegation rejects stale or inactive owners and old releases cannot revoke a newer scope", async (context) => {
    const fixture = await tutorialFixture(context);
    const parent = await fixture.open();
    const child = await fixture.open({ mandatory: true });
    const ownership = fixture.ctx.capabilities.get("ui:popupFocus");
    const panel = fixture.document.createElement("button");
    panel.textContent = "Synthetic delegated control";
    fixture.document.body.append(panel);
    const controller = new fixture.window.AbortController();
    const options = {
        signal: controller.signal,
        surfaces: [panel],
        contains: (element) => element === panel,
        focus: () => panel.focus(),
        onRevoke: () => {},
    };
    assert.throws(
        () => ownership.delegate(parent.overlay, options),
        /popup_focus_owner_unavailable/,
    );
    await child.dismiss();
    const release = ownership.delegate(parent.overlay, options);
    panel.focus();
    assert.equal(fixture.document.activeElement, panel);
    controller.abort();
    assert.ok(parent.overlay.contains(fixture.document.activeElement));
    assert.throws(() => ownership.delegate(parent.overlay, options), {
        name: "AbortError",
    });
    const current = new fixture.window.AbortController();
    const releaseCurrent = ownership.delegate(parent.overlay, {
        ...options,
        signal: current.signal,
    });
    panel.focus();
    release();
    assert.equal(fixture.document.activeElement, panel);
    releaseCurrent();
    assert.ok(parent.overlay.contains(fixture.document.activeElement));
    await parent.dismiss();
    assert.throws(
        () =>
            ownership.delegate(parent.overlay, {
                ...options,
                signal: current.signal,
            }),
        /popup_focus_owner_unavailable/,
    );
});

test("popup dismissal synchronously revokes tutorial handlers before returning focus to its invoker", async (context) => {
    const fixture = await tutorialFixture(context);
    const popup = await fixture.open();
    const guide = await fixture.guide(popup, { interaction: "none" });
    focusAction(fixture, guide, "next");
    await popup.dismiss();
    assert.equal(guide.menu.isConnected, false);
    assert.equal(guide.panel.isConnected, false);
    assert.equal(fixture.document.activeElement, fixture.invoker);
    guide.controller.abort();
    guide.view.dispose();
    await fixture.settle();
    assert.equal(fixture.document.activeElement, fixture.invoker);
});

test("accepted tutorial without an interactive target keeps its boolean focus policy", async (context) => {
    const fixture = await tutorialFixture(context);
    const popup = await fixture.open();
    const guide = await fixture.guide(popup, { target: null });
    focusAction(fixture, guide, "next");
    fixture.invoker.focus();
    assert.equal(fixture.document.activeElement, guide.panel);
    assert.equal(guide.menu.isConnected, true);
    guide.view.dispose();
    await popup.dismiss();
});
