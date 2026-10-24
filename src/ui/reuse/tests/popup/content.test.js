import assert from "node:assert/strict";
import test from "node:test";
import { createPopupContentApi } from "../../popup/content.js";

function contentElement({ inert = false, ariaHidden = null } = {}) {
    const classes = new Set();
    const attributes = new Map(
        ariaHidden === null ? [] : [["aria-hidden", ariaHidden]],
    );
    return {
        inert,
        classes,
        classList: {
            add: (name) => classes.add(name),
            remove: (name) => classes.delete(name),
        },
        children: [],
        append(element) {
            this.children.push(element);
        },
        getAttribute: (name) => attributes.get(name) ?? null,
        setAttribute: (name, value) => attributes.set(name, value),
        removeAttribute: (name) => attributes.delete(name),
    };
}

test("popup accessories use the owning heading and refit without changing the caller's control", () => {
    const heading = contentElement();
    const accessory = contentElement();
    let fitted = 0;
    const api = createPopupContentApi(
        { querySelector: () => heading },
        () => fitted++,
    );
    api.appendHeadingAccessory(accessory);
    assert.equal(heading.children[0], accessory);
    assert.equal(accessory.classes.has("popup-heading-accessory"), true);
    assert.equal(fitted, 1);
});

test("popup concealment blurs and blocks its content while preserving prior accessibility state", () => {
    const heading = contentElement();
    const body = contentElement({ inert: true, ariaHidden: "false" });
    const api = createPopupContentApi(
        { querySelectorAll: () => [heading, body] },
        () => {},
    );
    api.setContentConcealed(true);
    api.setContentConcealed(true);
    for (const element of [heading, body]) {
        assert.equal(element.inert, true);
        assert.equal(element.getAttribute("aria-hidden"), "true");
        assert.equal(element.classes.has("popup-content--concealed"), true);
    }
    api.setContentConcealed(false);
    assert.equal(heading.inert, false);
    assert.equal(heading.getAttribute("aria-hidden"), null);
    assert.equal(body.inert, true);
    assert.equal(body.getAttribute("aria-hidden"), "false");
    for (const element of [heading, body])
        assert.equal(element.classes.has("popup-content--concealed"), false);
});
