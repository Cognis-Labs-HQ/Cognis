import assert from "node:assert/strict";
import test from "node:test";
import { uiCtx } from "../ui-ctx.js";

test("host navbar contributions survive shell redraws and release only their own links", async (context) => {
    const previous = {
        document: globalThis.document,
        window: globalThis.window,
        CSS: globalThis.CSS,
    };
    context.after(() => Object.assign(globalThis, previous));
    const roots = [];
    const createNavbar = () => {
        const navbar = {
            children: [],
            append(element) {
                this.children.push(element);
                element.parent = this;
            },
            querySelector(selector) {
                return this.children.find((element) =>
                    selector.includes(element.dataset.navbarContribution),
                );
            },
        };
        roots.push(navbar);
        return navbar;
    };
    let current = createNavbar();
    globalThis.window = new EventTarget();
    globalThis.CSS = { escape: (value) => value };
    globalThis.document = {
        querySelector: () => current,
        querySelectorAll: (selector) =>
            roots.flatMap((root) =>
                root.children.filter((element) =>
                    selector.includes(element.dataset.navbarContribution),
                ),
            ),
        createElement() {
            return {
                dataset: {},
                attributes: {},
                setAttribute(name, value) {
                    this.attributes[name] = value;
                },
                removeAttribute(name) {
                    delete this.attributes[name];
                    delete this[name];
                },
                remove() {
                    this.parent.children.splice(
                        this.parent.children.indexOf(this),
                        1,
                    );
                },
            };
        },
    };
    await import("../navbar-contributions.js");
    const navbar = uiCtx.capabilities.get("ui:navbarLinks");
    const release = navbar.contribute("test:link", {
        href: "/example",
        label: "Example",
    });
    assert.equal(current.children[0].href, "/example");
    assert.equal(current.children[0].textContent, "Example");
    current = createNavbar();
    window.dispatchEvent(new Event("cognis:navbar-refresh"));
    assert.equal(current.children.length, 1);
    release();
    assert.equal(roots.flatMap((root) => root.children).length, 0);
    const nextRelease = navbar.contribute("test:link", {
        href: "/next",
        label: "Next",
    });
    release();
    assert.equal(current.children[0].href, "/next");
    nextRelease();
    const releaseDisabled = navbar.contribute("test:disabled", {
        href: "/disabled",
        label: "Disabled",
        disabled: true,
        title: "Unavailable",
    });
    assert.equal(current.children[0].href, undefined);
    assert.equal(current.children[0].attributes["aria-disabled"], "true");
    assert.equal(current.children[0].attributes.title, "Unavailable");
    releaseDisabled();
});
