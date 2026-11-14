import test from "node:test";
import assert from "node:assert/strict";
import { mountProvider } from "../../layouts/tutorials.js";

test("workspace tutorial resolves the visible navigation control across viewport modes", async (context) => {
    const previousDocument = globalThis.document;
    const targets = new Map();
    let definition;
    const document = {
        defaultView: {
            getComputedStyle: () => ({
                display: "block",
                visibility: "visible",
                opacity: "1",
            }),
        },
        querySelectorAll: () => [navigation],
        getElementById: () => toggle,
    };
    const navigation = { ownerDocument: document };
    const toggle = {
        ownerDocument: document,
        isConnected: true,
        hidden: false,
        matches: () => false,
        closest: () => (toggle.hidden ? toggle : null),
        getClientRects: () => [{}],
        getBoundingClientRect: () => ({ width: 44, height: 44 }),
    };
    globalThis.document = document;
    context.after(() => {
        globalThis.document = previousDocument;
    });
    const owner = {
        target: async (name, target) => {
            targets.set(name, target);
        },
        register: async (value) => {
            definition = value;
            return () => {};
        },
        dispose: () => {},
    };
    await mountProvider({
        capabilities: {
            get: (name) =>
                name === "ui:tutorials" ? { owner: () => owner } : () => true,
            contribute: () => {},
        },
    });
    assert.equal(targets.get("navigation").resolve(), toggle);
    toggle.hidden = true;
    assert.equal(targets.get("navigation").resolve(), navigation);
    assert.equal(definition.id, "welcome");
    assert.equal(definition.page, "/dashboard");
    assert.ok(
        definition.steps.every(
            (step) => typeof step.highlightNext === "boolean",
        ),
    );
});
