import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync(
    new URL("../ui/app/composer-extras.js", import.meta.url),
    "utf8",
)
    .replace(
        'import { escapeHtml } from "/static/reuse/escape-html.js";',
        "const escapeHtml = (value) => String(value);",
    )
    .replace(
        'import { localizedLabel } from "./presentation.js";',
        "const localizedLabel = (metadata) => metadata?.labels?.en ?? '';",
    )
    .replace(
        /import \{[\s\S]*?\} from "\.\/composition-tokens\.js";/,
        `const compositionTokenEntryId = (value) => value;
const literalCompositionToken = (value) => \`literal:\${value}\`;`,
    );
const { bindComposerExtras } = await import(
    `data:text/javascript;base64,${Buffer.from(source).toString("base64")}`
);

test("tag carousels add and remove sentence structure entries", () => {
    const option = { value: "word:structure", selected: false };
    const select = {
        options: [option],
        get selectedOptions() {
            return this.options.filter(({ selected }) => selected);
        },
        append() {},
    };
    const classes = new Set();
    const attributes = new Map();
    const control = {
        dataset: {
            libraryTagCarouselEntry: option.value,
            libraryTagCarouselRelationship: "words",
        },
        classList: {
            toggle(name, enabled) {
                if (enabled) classes.add(name);
                else classes.delete(name);
            },
        },
        setAttribute(name, value) {
            attributes.set(name, value);
        },
    };
    let click;
    let changes = 0;
    let events = 0;
    const form = {
        elements: { "relationship:words": select },
        compositionOrder: [],
        querySelectorAll: () => [control],
        addEventListener(type, listener) {
            if (type === "click") click = listener;
        },
        dispatchEvent() {
            events += 1;
        },
    };
    const event = {
        target: {
            closest(selector) {
                return selector === "[data-library-tag-carousel-entry]"
                    ? control
                    : null;
            },
        },
    };

    bindComposerExtras(form, () => {
        changes += 1;
    });
    click(event);
    assert.equal(option.selected, true);
    assert.deepEqual(form.compositionOrder, [option.value]);
    assert.equal(classes.has("is-selected"), true);
    assert.equal(attributes.get("aria-pressed"), "true");

    click(event);
    assert.equal(option.selected, false);
    assert.deepEqual(form.compositionOrder, []);
    assert.equal(classes.has("is-selected"), false);
    assert.equal(attributes.get("aria-pressed"), "false");
    assert.equal(changes, 2);
    assert.equal(events, 2);
});
