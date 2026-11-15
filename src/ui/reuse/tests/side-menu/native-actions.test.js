import assert from "node:assert/strict";
import test from "node:test";
import { createSideMenu, sideMenu } from "../../side-menu.js";
import { uiCtx } from "../../ui-ctx.js";
import { fixture } from "./fixture.js";

for (const collapsible of [true, false]) {
    test(`contract: ${collapsible ? "collapsible" : "fixed"} group actions explicitly use non-submit type`, () => {
        const state = fixture({ collapsible });
        try {
            for (const button of state.buttons) {
                assert.equal(button.tagName, "BUTTON");
                assert.equal(button.getAttribute("type"), "button");
                assert.equal(button.type, "button");
            }
        } finally {
            state.dom.window.close();
        }
    });

    test(`contract: ${collapsible ? "collapsible" : "fixed"} selection cannot submit an enclosing form`, () => {
        const state = fixture({ collapsible });
        try {
            state.buttons[1].click();
            assert.deepEqual(state.selections, ["next"]);
            assert.equal(state.submissions.length, 0);
        } finally {
            state.dom.window.close();
        }
    });
}

test("control: exported capability is the actual registered implementation", () => {
    assert.equal(uiCtx.capabilities.get("ui:sideMenu"), sideMenu);
    assert.equal(sideMenu.createSideMenu, createSideMenu);
});

test("control: ordinary selection changes active item once and preserves URL", () => {
    const state = fixture({ insideForm: false });
    try {
        state.buttons[1].click();
        assert.deepEqual(state.selections, ["next"]);
        assert.equal(state.buttons[1].getAttribute("aria-current"), "page");
        assert.equal(state.buttons[1].classList.contains("active"), true);
        assert.equal(state.buttons[0].hasAttribute("aria-current"), false);
        assert.equal(
            state.dom.window.location.href,
            "https://fixture.invalid/docs",
        );
    } finally {
        state.dom.window.close();
    }
});

test("control: explicit target scrolling and repeated selection retain existing behavior", () => {
    const state = fixture({ insideForm: false });
    try {
        state.buttons[0].click();
        state.buttons[0].click();
        assert.deepEqual(state.selections, ["overview", "overview"]);
        assert.deepEqual(state.scrolls, [
            { behavior: "smooth", block: "start" },
            { behavior: "smooth", block: "start" },
        ]);
    } finally {
        state.dom.window.close();
    }
});

test("control: aborted owner stops selection and scrolling", () => {
    const state = fixture({ insideForm: false });
    try {
        state.signal.abort();
        state.buttons[0].click();
        state.buttons[1].click();
        assert.deepEqual(state.selections, []);
        assert.deepEqual(state.scrolls, []);
    } finally {
        state.dom.window.close();
    }
});

test("control: escaped labels and fixed-group rendering survive rerender", () => {
    const state = fixture({ collapsible: false, insideForm: false });
    try {
        state.menu.setActive("next");
        state.root.innerHTML = state.menu.render();
        assert.equal(state.root.querySelectorAll("details").length, 0);
        assert.equal(
            state.root.querySelector('[data-side-menu-item="overview"]')
                .textContent,
            "Overview <Current>",
        );
        assert.equal(
            state.root.querySelector('[aria-current="page"]').dataset
                .sideMenuItem,
            "next",
        );
    } finally {
        state.dom.window.close();
    }
});

test("negative controls: jsdom models submit and explicit non-submit native defaults", () => {
    const state = fixture();
    try {
        const form = state.main.querySelector("form");
        const submit = state.dom.window.document.createElement("button");
        submit.type = "submit";
        const ordinary = state.dom.window.document.createElement("button");
        ordinary.type = "button";
        form.append(submit, ordinary);
        ordinary.click();
        assert.equal(state.submissions.length, 0);
        submit.click();
        assert.deepEqual(state.submissions, [submit]);
    } finally {
        state.dom.window.close();
    }
});
