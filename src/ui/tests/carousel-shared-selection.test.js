import { loadTestModule } from "../../tooling/reuse/test-module.ts";
import assert from "node:assert/strict";
import test from "node:test";

test("shared-relationship carousel changes keep selections in both sentence structure and vocabulary", async () => {
    const listeners = new Map();
    const carousel = () => {
        const items = [];
        return {
            items,
            dataset: { horizontalCarousel: "words" },
            querySelector: () => ({ textContent: "" }),
            querySelectorAll: (selector) =>
                selector.includes(".is-selected")
                    ? items.filter((item) =>
                          item.classList.contains("is-selected"),
                      )
                    : items,
        };
    };
    const words = carousel(),
        structure = carousel();
    const button = (value, owner) => {
        const classes = new Set();
        const order = { textContent: "" };
        const item = {
            dataset: { carouselValue: value },
            classList: {
                contains: (name) => classes.has(name),
                toggle: (name) =>
                    classes.has(name)
                        ? classes.delete(name)
                        : classes.add(name),
            },
            setAttribute() {},
            querySelector: () => order,
            closest: (selector) =>
                selector === "[data-horizontal-carousel]"
                    ? owner
                    : selector === "[data-carousel-value]"
                      ? item
                      : null,
        };
        owner.items.push(item);
        return item;
    };
    const desu = button("です", structure),
        water = button("水", words),
        drink = button("飲む", words);
    const changes = [];
    const root = {
        contains: () => true,
        querySelectorAll: () => [words, structure],
        addEventListener: (type, listener) => listeners.set(type, listener),
    };
    const context = {
        createAnchoredPopup: () => ({ hide() {}, destroy() {} }),
    };
    Object.assign(
        context,
        loadTestModule(
            new URL("../reuse/horizontal-carousel.js", import.meta.url),
            { "./escape-html.js": context, "./popup.js": context },
            context,
        ),
    );
    context.mountHorizontalCarousels(root, {
        onChange: ({ values }) => changes.push([...values]),
    });
    for (const item of [desu, water, drink])
        await listeners.get("click")({ target: item });
    assert.deepEqual(changes[0], ["です"]);
    assert.deepEqual(new Set(changes[2]), new Set(["です", "水", "飲む"]));
});
