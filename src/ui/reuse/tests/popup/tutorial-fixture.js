import assert from "node:assert/strict";
import { popupFixture } from "./dom-fixture.js";

export async function tutorialFixture(context) {
    const fixture = await popupFixture(context);
    const { window, document, ctx } = fixture;
    window.HTMLElement.prototype.scrollIntoView = function () {};
    window.HTMLElement.prototype.getClientRects = function () {
        return this.hidden ? [] : [{ x: 0, y: 0, width: 100, height: 30 }];
    };
    window.HTMLElement.prototype.getBoundingClientRect = function () {
        return {
            x: 10,
            y: 10,
            left: 10,
            top: 10,
            right: 110,
            bottom: 40,
            width: 100,
            height: 30,
        };
    };
    const flows = new Map();
    ctx.registerFlow = (name, stages) => {
        assert.equal(flows.has(name), false);
        flows.set(name, new Map(stages.map((stage) => [stage, []])));
        return () => flows.delete(name);
    };
    ctx.extendFlow = (name, stage, metadata, execute) => {
        assert.ok(flows.get(name)?.has(stage));
        flows.get(name).get(stage).push(execute);
    };
    ctx.runFlow = async (name, input) => {
        assert.ok(flows.has(name));
        const state = { input, data: {} };
        for (const handlers of flows.get(name).values()) {
            for (const execute of handlers) await execute(state);
        }
        return state;
    };
    const { registerFloatingMenus } = await fixture.importModule(
        "floating-menu-queue.js",
    );
    registerFloatingMenus(ctx);
    const { createTutorialView } = await fixture.importModule(
        "tutorials/presentation.js",
    );
    const translations = {
        "ui.reuse.tutorials": "Tutorials",
        "ui.tutorial.progress": "{{current}} of {{total}}",
        "ui.reuse.back": "Back",
        "ui.reuse.next": "Next",
        "ui.reuse.finish": "Finish",
        "ui.reuse.skip": "Skip",
        "ui.tutorial.restart": "Restart",
    };
    const render = createTutorialView({
        document,
        ctx,
        loadStyles: async () => {},
        hostI18n: {
            t: (key) => {
                assert.ok(translations[key], key);
                return translations[key];
            },
        },
    });
    async function guide(
        popup,
        {
            interaction = "target",
            index = 0,
            total = 3,
            target = popup.overlay,
            selector = "[data-tutorial-fixture]",
        } = {},
    ) {
        popup.overlay.classList.add("popup-overlay--visible");
        popup.overlay.dataset.tutorialFixture = "";
        const controller = new window.AbortController();
        const actions = [];
        const view = await render({
            step: {
                popup: selector,
                interaction,
                layer: "overlay",
                effects: { callout: true },
                highlightNext: true,
            },
            text: {
                title: "Synthetic tutorial",
                body: "Synthetic instructions",
            },
            index,
            total,
            target,
            signal: controller.signal,
            actions: Object.fromEntries(
                ["next", "back", "skip", "cancel", "modal", "restart"].map(
                    (name) => [name, () => actions.push(name)],
                ),
            ),
            valid: () => true,
        });
        const panel = document.querySelector(".tutorial-callout");
        const menu = document.querySelector(".tutorial-actions");
        return { controller, view, panel, menu, actions };
    }
    return { ...fixture, guide };
}
