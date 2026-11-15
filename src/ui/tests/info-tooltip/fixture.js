import assert from "node:assert/strict";
import { JSDOM, VirtualConsole } from "jsdom";
import { renderInfoTooltip } from "../../reuse/info-tooltip.js";

export function fixture(testContext) {
    const runtimeErrors = [];
    const virtualConsole = new VirtualConsole();
    virtualConsole.on("jsdomError", (error) => runtimeErrors.push(error));
    const dom = new JSDOM(
        '<!doctype html><body><main></main><button id="outside">Outside</button></body>',
        {
            url: "https://cognis.test/settings",
            pretendToBeVisual: true,
            virtualConsole,
        },
    );
    const globals = new Map();
    for (const name of [
        "window",
        "document",
        "Element",
        "HTMLElement",
        "HTMLButtonElement",
        "fetch",
    ]) {
        globals.set(name, Object.getOwnPropertyDescriptor(globalThis, name));
        Object.defineProperty(globalThis, name, {
            configurable: true,
            writable: true,
            value:
                name === "fetch"
                    ? async () =>
                          assert.fail(
                              "Tooltip must not issue transport requests",
                          )
                    : dom.window[name],
        });
    }
    testContext.after(async () => {
        dom.window.close();
        for (const [name, descriptor] of globals) {
            if (descriptor) Object.defineProperty(globalThis, name, descriptor);
            else delete globalThis[name];
        }
        await nextTask();
        assert.deepEqual(
            runtimeErrors,
            [],
            "Tooltip events and teardown must not emit runtime errors",
        );
    });
    const document = dom.window.document;
    const root = document.querySelector("main");
    const outside = document.querySelector("#outside");
    const render = (text = "First explanation", label = "First help", id) => {
        const wrapper = document.createElement("div");
        wrapper.innerHTML = renderInfoTooltip(text, label, id);
        root.append(wrapper);
        return wrapper.querySelector("button");
    };
    const first = render();
    const second = render("Second explanation", "Second help");
    const overlay = () => document.querySelector("#info-tooltip-overlay");
    const mouse = (target, type, relatedTarget = outside) =>
        target.dispatchEvent(
            new dom.window.MouseEvent(type, { bubbles: true, relatedTarget }),
        );
    const escape = () =>
        document.activeElement.dispatchEvent(
            new dom.window.KeyboardEvent("keydown", {
                key: "Escape",
                bubbles: true,
                cancelable: true,
            }),
        );
    const visible = (button = first, text = "First explanation") => {
        assert.equal(overlay().hidden, false);
        assert.equal(overlay().textContent, text);
        assert.ok(
            button
                .getAttribute("aria-describedby")
                .split(/\s+/)
                .includes(overlay().id),
        );
    };
    const hidden = () => {
        assert.equal(overlay().hidden, true);
        assert.equal(overlay().textContent, "");
    };
    return {
        window: dom.window,
        document,
        root,
        outside,
        first,
        second,
        overlay,
        render,
        mouse,
        escape,
        visible,
        hidden,
    };
}

export async function nextTask() {
    await new Promise((resolve) => setImmediate(resolve));
}
