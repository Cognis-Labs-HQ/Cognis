import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import { pronunciationClass } from "../../../../gateways/study/ui/reuse/pronunciation.js";

const context = { pronunciationClass };
vm.createContext(context);
vm.runInContext(
    readFileSync(new URL("../ui/app/detail-layout.js", import.meta.url), "utf8")
        .replace(/^import.*;$/gm, "")
        .replace("export function", "function"),
    context,
);
const { bindDetailLayout } = context;

test("related cards scroll only beyond five rows and release their resize observer", () => {
    let resized;
    let disconnected = false;
    context.ResizeObserver = class {
        constructor(callback) {
            resized = callback;
        }

        observe() {}

        disconnect() {
            disconnected = true;
        }
    };
    const classes = new Set();
    const group = {
        children: [0, 20, 40, 60, 80].map((offsetTop) => ({ offsetTop })),
        classList: {
            remove: (name) => classes.delete(name),
            toggle: (name, enabled) =>
                enabled ? classes.add(name) : classes.delete(name),
        },
    };
    const reading = {
        textContent: "/ˈlæŋɡwɪdʒ/",
        classList: { add: (name) => classes.add(name) },
    };
    const root = {
        querySelector: () => null,
        classList: { add() {} },
        querySelectorAll: (selector) =>
            selector === ".library-related-entries" ? [group] : [reading],
    };
    const controller = new AbortController();
    bindDetailLayout(root, controller.signal);
    assert.ok(classes.has("study-ipa"));
    assert.ok(!classes.has("library-related-entries--scrolling"));
    group.children.push({ offsetTop: 100 });
    resized([{ target: group, contentRect: { width: 300 } }]);
    assert.ok(classes.has("library-related-entries--scrolling"));
    group.children[5].offsetTop = 80;
    resized([{ target: group, contentRect: { width: 600 } }]);
    assert.ok(!classes.has("library-related-entries--scrolling"));
    controller.abort();
    assert.ok(disconnected);
});
