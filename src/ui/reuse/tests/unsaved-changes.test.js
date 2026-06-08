import test from "node:test";
import assert from "node:assert/strict";

import {
    createFormDirtyTracker,
    createUnsavedChangesBar,
} from "../unsaved-changes.js";

class FakeButton {
    constructor() {
        this.listeners = new Map();
    }

    addEventListener(eventName, handler) {
        const handlers = this.listeners.get(eventName) ?? [];
        handlers.push(handler);
        this.listeners.set(eventName, handlers);
    }
}

class FakeFloatingElement {
    constructor() {
        this.hidden = false;
        this.buttons = new Map([
            ['[data-action="save"]', new FakeButton()],
            ['[data-action="discard"]', new FakeButton()],
        ]);
    }

    querySelector(selector) {
        return this.buttons.get(selector) ?? null;
    }
}

class FakeField {
    constructor({
        tagName = "INPUT",
        name = "",
        type = "text",
        value = "",
        checked = false,
    } = {}) {
        this.tagName = tagName;
        this.name = name;
        this.type = type;
        this.value = value;
        this.checked = checked;
        this.listeners = new Map();
    }

    addEventListener(eventName, handler) {
        const handlers = this.listeners.get(eventName) ?? [];
        handlers.push(handler);
        this.listeners.set(eventName, handlers);
    }

    removeEventListener(eventName, handler) {
        const handlers = this.listeners.get(eventName) ?? [];
        this.listeners.set(
            eventName,
            handlers.filter((entry) => entry !== handler),
        );
    }

    dispatch(eventName) {
        for (const handler of this.listeners.get(eventName) ?? []) {
            handler({ target: this });
        }
    }
}

class FakeRootElement {
    constructor(fields) {
        this.fields = fields;
    }

    querySelectorAll() {
        return this.fields;
    }
}

test("quiet unsaved changes bar keeps floating controls hidden", () => {
    const floatingEl = new FakeFloatingElement();
    const changesBar = createUnsavedChangesBar(floatingEl, { quiet: true });

    changesBar.markDirty("profile", true);
    assert.equal(changesBar.isAnyDirty(), true);
    assert.equal(floatingEl.hidden, true);

    changesBar.markDirty("profile", false);
    assert.equal(changesBar.isAnyDirty(), false);
    assert.equal(floatingEl.hidden, true);
});

test("form dirty tracker only marks dirty after an actual edit", () => {
    const field = new FakeField({
        name: "displayName",
        value: "Ada",
    });
    const tracker = createFormDirtyTracker(new FakeRootElement([field]), {
        quiet: true,
    });

    assert.equal(tracker.isAnyDirty(), false);

    field.value = "Grace";
    field.dispatch("input");
    assert.equal(tracker.isAnyDirty(), true);

    field.value = "Ada";
    field.dispatch("input");
    assert.equal(tracker.isAnyDirty(), false);
});

test("form dirty tracker re-syncs radio groups when a selection is reverted", () => {
    const firstOption = new FakeField({
        name: "visibility",
        type: "radio",
        checked: true,
    });
    const secondOption = new FakeField({
        name: "visibility",
        type: "radio",
        checked: false,
    });
    const tracker = createFormDirtyTracker(
        new FakeRootElement([firstOption, secondOption]),
        { quiet: true },
    );

    firstOption.checked = false;
    secondOption.checked = true;
    secondOption.dispatch("change");
    assert.equal(tracker.isAnyDirty(), true);

    firstOption.checked = true;
    secondOption.checked = false;
    firstOption.dispatch("change");
    assert.equal(tracker.isAnyDirty(), false);
});
