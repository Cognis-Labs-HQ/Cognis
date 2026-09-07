import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createAnchoredPopup } from "../reuse/popup.js";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");

test("popup skips custom maxWidth on mobile viewports", () => {
    const source = readFileSync(resolve(ROOT, "src/ui/reuse/popup.js"), "utf8");

    assert.match(source, /maxWidth &&/);
    assert.match(source, /matchMedia\("\(max-width: 640px\)"\)\.matches/);
    assert.match(source, /style\.maxWidth = maxWidth;/);
});

test("popup locks page scrolling while preserving popup overflow", () => {
    const popupSource = readFileSync(
        resolve(ROOT, "src/ui/reuse/popup.js"),
        "utf8",
    );
    const stylesSource = readFileSync(
        resolve(ROOT, "src/ui/styles/popup.css"),
        "utf8",
    );

    assert.match(popupSource, /function lockPageScroll\(\)/);
    assert.match(popupSource, /document\.querySelectorAll\("main"\)/);
    assert.match(popupSource, /element\.style\.overflow = "hidden";/);
    assert.match(popupSource, /function unlockPageScroll\(\)/);
    assert.match(stylesSource, /\.popup-overlay \{[\s\S]*overflow-y: auto;/);
    assert.match(
        stylesSource,
        /@media \(max-width: 640px\) \{[\s\S]*\.popup-overlay \{[\s\S]*align-items: flex-start;[\s\S]*padding: 12px;/,
    );
});

test("popup close protection uses the silent dirty tracker before warning", () => {
    const source = readFileSync(resolve(ROOT, "src/ui/reuse/popup.js"), "utf8");

    assert.equal(source.includes("createFormDirtyTracker"), true);
    assert.equal(
        source.includes("closeProtectionTracker = createFormDirtyTracker"),
        true,
    );
    assert.equal(source.includes("quiet: true"), true);
    assert.equal(
        source.includes("closeProtectionTracker?.isAnyDirty() ??"),
        true,
    );
    assert.equal(source.includes("hasUnsavedFormChanges(overlay)"), true);
});

test("createAnchoredPopup creates, positions, and tears down anchored popups", () => {
    class FakeHTMLElement {
        constructor(tagName = "div") {
            this.tagName = tagName;
            this.style = {};
            this.hidden = false;
            this.className = "";
            this.innerHTML = "";
            this.attributes = {};
            this.children = [];
            this.removed = false;
            this.rect = {
                left: 100,
                top: 80,
                bottom: 100,
                width: 20,
                height: 20,
            };
        }

        setAttribute(name, value) {
            this.attributes[name] = value;
        }

        appendChild(child) {
            this.children.push(child);
            child.parentNode = this;
            return child;
        }

        addEventListener() {}

        remove() {
            this.removed = true;
        }

        getBoundingClientRect() {
            return this.rect;
        }
    }

    const originalHTMLElement = globalThis.HTMLElement;
    const originalDocument = globalThis.document;
    const originalWindow = globalThis.window;
    const body = new FakeHTMLElement("body");
    const head = new FakeHTMLElement("head");

    globalThis.HTMLElement = FakeHTMLElement;
    globalThis.document = {
        querySelector() {
            return null;
        },
        createElement(tagName) {
            return new FakeHTMLElement(tagName);
        },
        body,
        head,
    };
    globalThis.window = {
        innerWidth: 1280,
        innerHeight: 720,
    };

    try {
        const anchoredPopup = createAnchoredPopup({
            className: "test-anchored-popup",
        });
        const anchor = new FakeHTMLElement("button");

        anchoredPopup.show(anchor, "<strong>Hello</strong>");
        const popup = body.children[0];

        assert.ok(popup instanceof FakeHTMLElement);
        assert.equal(popup.className, "test-anchored-popup");
        assert.equal(popup.attributes.role, "tooltip");
        assert.equal(popup.hidden, false);
        assert.equal(popup.innerHTML, "<strong>Hello</strong>");
        assert.match(String(popup.style.left), /\d+px/);
        assert.match(String(popup.style.top), /\d+px/);

        anchor.rect = {
            left: 160,
            top: 140,
            bottom: 160,
            width: 24,
            height: 20,
        };
        anchoredPopup.reposition();
        assert.match(String(popup.style.left), /\d+px/);
        assert.match(String(popup.style.top), /\d+px/);

        anchoredPopup.hide();
        assert.equal(popup.hidden, true);
        assert.equal(popup.innerHTML, "");

        anchoredPopup.destroy();
        assert.equal(popup.removed, true);
    } finally {
        globalThis.HTMLElement = originalHTMLElement;
        globalThis.document = originalDocument;
        globalThis.window = originalWindow;
    }
});

test("config form popup keeps known 400 field errors open", () => {
    const source = readFileSync(resolve(ROOT, "src/ui/reuse/popup.js"), "utf8");
    assert.match(source, /export function markPopupFieldInvalid\(/);
    assert.match(source, /form-builder-floating-alert/);
    assert.match(source, /form-builder-criterion-item--unmet/);
    assert.match(source, /saveResponse\.status === 400/);
    assert.match(source, /return false;/);
    assert.doesNotMatch(source, /setCustomValidity/);
});

test("adapter config popup uses shared field-level 400 handling", () => {
    const source = readFileSync(
        resolve(ROOT, "src/ui/app/administration/adapter-config-popup.js"),
        "utf8",
    );
    assert.match(source, /resolveFieldErrorId/);
    assert.match(source, /markPopupFieldInvalid/);
    assert.match(source, /saveResponse\.status === 400/);
});
