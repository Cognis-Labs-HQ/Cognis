import test from "node:test";
import assert from "node:assert/strict";
import { guides } from "../../app/administration/guides.js";
import {
    tutorialHost,
    tick,
} from "../../reuse/tutorials/tests/fixtures/host.js";

async function administration(context) {
    const state = tutorialHost({ role: () => "admin" });
    context.after(state.dispose);
    state.ctx.capabilities.contribute("session:isAuthenticated", () => true);
    state.window.location.pathname = "/administration";
    const attributes = new Set();
    const row = {
        open: false,
        setAttribute: (name) => attributes.add(name),
        removeAttribute: (name) => attributes.delete(name),
    };
    const element = state.element();
    element.closest = (selector) =>
        selector === "details.module-row"
            ? row
            : selector === "#components"
              ? { querySelectorAll: () => [row] }
              : null;
    let popup = false;
    const attached = [];
    const surface = {
        ...element,
        contains: () => true,
        querySelectorAll: () => [element],
    };
    state.ctx.capabilities.contribute("ui:transientSurfaces", {
        attachLifetime: (target, signal) => attached.push({ target, signal }),
    });
    const root = {
        ownerDocument: state.document,
        isConnected: true,
        contains: () => true,
        querySelectorAll(selector) {
            if (selector.includes("data-tutorial-component"))
                return row.open && attributes.has("data-tutorial-component")
                    ? [element]
                    : [];
            return [element];
        },
    };
    state.document.querySelectorAll = () => (popup ? [surface] : []);
    await state.api.mountPage({
        ...guides[0],
        root,
        signal: new AbortController().signal,
        i18n: { t: (key) => key },
    });
    const session = await state.api.start("ui.administration:components");
    await session.ready;
    return {
        ...state,
        session,
        row,
        attributes,
        attached,
        showSettings() {
            popup = true;
            element.closest = (selector) =>
                selector === "[data-component-settings-popup]"
                    ? surface
                    : selector === "#components"
                      ? { querySelectorAll: () => [row] }
                      : null;
        },
    };
}

test("Next bypasses unopened component details and their settings branch", async (context) => {
    const state = await administration(context);
    assert.equal(state.session.state().stepId, "enable-and-disable");
    await state.session.next();
    assert.equal(state.session.state().stepId, "gateways-and-adapters");
    assert.equal(state.session.state().total, 2);
    await state.session.next();
    assert.equal((await state.session.finished).status, "completed");
    assert.equal(state.attributes.size, 0);
});

test("opening component details enables settings, and Restart releases their lifetime", async (context) => {
    const state = await administration(context);
    await state.session.next();
    state.row.open = true;
    await state.rendered.at(-1).interacted({
        type: "click",
        target: { closest: () => state.row },
    });
    await tick();
    assert.equal(state.session.state().stepId, "component-metadata");
    await state.session.next();
    assert.equal(state.session.state().stepId, "configuration");
    state.showSettings();
    await state.rendered.at(-1).interacted({
        type: "click",
        target: { closest: () => ({ closest: () => state.row }) },
    });
    await tick();
    assert.equal(state.session.state().stepId, "settings-fields");
    assert.equal(state.attached.length, 1);
    await state.session.back();
    assert.equal(state.session.state().stepId, "configuration");
    assert.equal(state.attached[0].signal.aborted, true);
    await state.rendered.at(-1).interacted({
        type: "click",
        target: { closest: () => ({ closest: () => state.row }) },
    });
    await tick();
    assert.equal(state.attached.length, 2);
    await state.session.next();
    assert.equal(state.session.state().stepId, "settings-actions");
    await state.session.restart();
    assert.equal(state.attached[1].signal.aborted, true);
    assert.equal(state.attributes.size, 0);
    assert.equal(state.session.state().stepId, "enable-and-disable");
});
