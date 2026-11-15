import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { JSDOM } from "jsdom";
import { renderStructuredContent } from "../../reuse/structured-content.js";

const styles = ["buttons", "structured-content"]
    .map((name) =>
        readFileSync(
            new URL(`../../styles/reuse/${name}.css`, import.meta.url),
            "utf8",
        ),
    )
    .join("\n");

function coarsePointerTargetRule(document) {
    const mediaRule = [...document.styleSheets[0].cssRules].find((rule) =>
        rule.conditionText?.includes("any-pointer: coarse"),
    );
    return [...mediaRule.cssRules].find(
        (rule) => rule.style.getPropertyValue("min-height") === "44px",
    );
}

function fixture(items) {
    const dom = new JSDOM("<!doctype html><style></style><main></main>");
    dom.window.document.querySelector("style").textContent = styles;
    dom.window.document.querySelector("main").innerHTML =
        renderStructuredContent([{ id: "synthetic-contribution", items }]);
    return {
        dom,
        document: dom.window.document,
        button: dom.window.document.querySelector("button"),
    };
}

for (const [name, variant] of [
    ["default", undefined],
    ["explicit neutral", "neutral"],
]) {
    test(`${name} structured button has the canonical neutral consequence class`, () => {
        const { dom, button } = fixture([
            { type: "button", text: "Inspect", variant },
        ]);
        try {
            assert.equal(button.classList.contains("btn-neutral"), true);
        } finally {
            dom.window.close();
        }
    });
    test(`${name} structured button receives shared layout and padding like its adjacent confirm peer`, () => {
        const { dom, document } = fixture([
            { type: "button", text: "Inspect", variant },
            { type: "button", text: "Create", variant: "confirm" },
        ]);
        try {
            const [neutral, confirm] = [
                ...document.querySelectorAll("button"),
            ].map((button) => dom.window.getComputedStyle(button));
            assert.equal(confirm.display, "inline-flex");
            assert.equal(confirm.padding, "8px 18px");
            assert.equal(neutral.display, confirm.display);
            assert.equal(neutral.padding, confirm.padding);
        } finally {
            dom.window.close();
        }
    });
}

for (const [variant, expected] of [
    ["confirm", "btn-confirm"],
    ["danger", "btn-cancel"],
]) {
    test(`${variant} preserves native button and sole consequence class`, () => {
        const { dom, button } = fixture([
            { type: "button", text: "Action", variant },
        ]);
        try {
            assert.equal(button.tagName, "BUTTON");
            assert.equal(button.type, "button");
            assert.deepEqual(
                [...button.classList].filter((value) =>
                    ["btn-confirm", "btn-cancel", "btn-neutral"].includes(
                        value,
                    ),
                ),
                [expected],
            );
            assert.equal(
                dom.window.getComputedStyle(button).display,
                "inline-flex",
            );
            assert.equal(
                dom.window.getComputedStyle(button).padding,
                "8px 18px",
            );
        } finally {
            dom.window.close();
        }
    });
}

test("native disabled, identity, accessible label and opaque text survive rendering", () => {
    const { dom, button } = fixture([
        {
            type: "button",
            text: "<not markup>",
            id: "inspect",
            name: "inspect-name",
            disabled: true,
            ariaLabel: "Inspect safely",
        },
    ]);
    try {
        assert.equal(button.disabled, true);
        assert.equal(button.id, "inspect");
        assert.equal(button.name, "inspect-name");
        assert.equal(button.getAttribute("aria-label"), "Inspect safely");
        assert.equal(button.textContent, "<not markup>");
        assert.equal(button.children.length, 0);
    } finally {
        dom.window.close();
    }
});

test("rendering does not invoke a contributed operation or submit an enclosing form", () => {
    const { dom, button } = fixture([{ type: "button", text: "Inspect" }]);
    try {
        const form = dom.window.document.createElement("form");
        dom.window.document.body.append(form);
        form.append(button);
        let submits = 0;
        form.addEventListener("submit", (event) => {
            event.preventDefault();
            submits += 1;
        });
        button.click();
        assert.equal(submits, 0);
    } finally {
        dom.window.close();
    }
});

test("repeated rendering preserves classes, group boundaries and caller data", () => {
    const input = [
        {
            id: "first",
            items: [
                { type: "button", text: "Create", variant: "confirm" },
                { type: "button", text: "Inspect" },
            ],
        },
        {
            id: "second",
            items: [{ type: "button", text: "Remove", variant: "danger" }],
        },
    ];
    const original = structuredClone(input);
    const first = renderStructuredContent(input);
    assert.equal(renderStructuredContent(input), first);
    assert.deepEqual(input, original);
    assert.equal((first.match(/structured-content__divider/g) ?? []).length, 1);
});

test("shared CSS gives canonical button variants the coarse-pointer target contract", () => {
    const { dom, document } = fixture([
        { type: "button", text: "Create", variant: "confirm" },
        { type: "button", text: "Remove", variant: "danger" },
    ]);
    try {
        const targetRule = coarsePointerTargetRule(document);
        assert.equal(targetRule.style.getPropertyValue("min-width"), "44px");
        assert.equal(
            [...document.querySelectorAll("button")].every((button) =>
                button.matches(targetRule.selectorText),
            ),
            true,
        );
    } finally {
        dom.window.close();
    }
});

test("default structured button participates in the actual coarse-pointer target selector", () => {
    const { dom, document, button } = fixture([
        { type: "button", text: "Inspect" },
    ]);
    try {
        const targetRule = coarsePointerTargetRule(document);
        assert.equal(button.matches(targetRule.selectorText), true);
    } finally {
        dom.window.close();
    }
});

test("disabled state can be restored without changing consequence classes", () => {
    const { dom, button } = fixture([
        { type: "button", text: "Create", variant: "confirm", disabled: true },
    ]);
    try {
        const className = button.className;
        let clicks = 0;
        button.addEventListener("click", () => {
            clicks += 1;
        });
        button.click();
        assert.equal(clicks, 0);
        button.disabled = false;
        button.click();
        assert.equal(clicks, 1);
        assert.equal(button.className, className);
    } finally {
        dom.window.close();
    }
});

test("a neighboring ordinary link retains native navigation semantics and caller classes", () => {
    const { dom, document } = fixture([{ type: "button", text: "Inspect" }]);
    try {
        const link = document.createElement("a");
        link.href = "/synthetic-destination";
        link.className = "caller-link btn-neutral";
        document.querySelector("main").append(link);
        renderStructuredContent([
            { items: [{ type: "button", text: "Another" }] },
        ]);
        assert.equal(link.getAttribute("href"), "/synthetic-destination");
        assert.equal(link.className, "caller-link btn-neutral");
        assert.equal(link.tagName, "A");
    } finally {
        dom.window.close();
    }
});

for (const variant of [undefined, "neutral", "unknown", null, "", false]) {
    test(`ordinary variant ${String(variant)} retains exactly one neutral class`, () => {
        const { dom, button } = fixture([
            { type: "button", text: "Save", id: "delete", variant },
        ]);
        try {
            assert.deepEqual(
                [...button.classList].filter((value) =>
                    ["btn-confirm", "btn-cancel", "btn-neutral"].includes(
                        value,
                    ),
                ),
                ["btn-neutral"],
            );
            assert.equal(
                button.classList.contains("structured-content__button"),
                true,
            );
            assert.equal(button.classList.contains("btn-animated"), true);
            assert.equal(button.type, "button");
        } finally {
            dom.window.close();
        }
    });
}

test("escaped attributes and entity-like text remain opaque caller data", () => {
    const text = '<img src=x> &lt; & "';
    const identity = 'inspect" data-injected="true';
    const { dom, button } = fixture([
        { type: "button", text, id: identity, name: identity, ariaLabel: text },
    ]);
    try {
        assert.equal(button.textContent, text);
        assert.equal(button.id, identity);
        assert.equal(button.name, identity);
        assert.equal(button.getAttribute("aria-label"), text);
        assert.equal(button.hasAttribute("data-injected"), false);
        assert.equal(button.children.length, 0);
    } finally {
        dom.window.close();
    }
});
