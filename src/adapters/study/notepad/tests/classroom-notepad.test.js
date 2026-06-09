import test from "node:test";
import assert from "node:assert/strict";

import { createClassroomNotepad } from "../ui/classroom-notepad.js";

function createMockElement(tagName) {
    return {
        tagName,
        className: "",
        textContent: "",
        value: "",
        attributes: {},
        children: [],
        listeners: new Map(),
        setAttribute(name, value) {
            this.attributes[name] = value;
        },
        appendChild(child) {
            this.children.push(child);
            return child;
        },
        addEventListener(type, listener) {
            this.listeners.set(type, listener);
        },
        focus() {
            this.focused = true;
        },
        querySelector(selector) {
            if (!selector.startsWith(".")) return null;
            const className = selector.slice(1);
            const queue = [...this.children];
            while (queue.length) {
                const candidate = queue.shift();
                const classes = String(candidate?.className ?? "")
                    .split(/\s+/)
                    .filter(Boolean);
                if (classes.includes(className)) {
                    return candidate;
                }
                if (Array.isArray(candidate?.children)) {
                    queue.push(...candidate.children);
                }
            }
            return null;
        },
    };
}

test("classroom notepad accepts the shared i18n object", () => {
    const originalDocument = global.document;
    const originalSessionStorage = global.sessionStorage;
    global.document = {
        createElement(tagName) {
            return createMockElement(tagName);
        },
        body: {
            appendChild() {},
            removeChild() {},
        },
    };
    global.sessionStorage = {
        getItem() {
            return null;
        },
        setItem() {},
        removeItem() {},
    };

    try {
        const i18n = {
            t(key) {
                return `translated:${key}`;
            },
        };
        const notepad = createClassroomNotepad({
            classId: "class-1",
            i18n,
        });
        const panel = notepad.getElement();
        const title = panel.querySelector(".classes-notepad-title");
        const downloadButton = panel.querySelector(
            ".classes-notepad-download-btn",
        );
        const clearButton = panel.querySelector(".classes-notepad-clear-btn");
        const textarea = panel.querySelector(".classes-notepad-textarea");

        assert.equal(
            panel.attributes["aria-label"],
            "translated:module.study.classes.notepad",
        );
        assert.equal(
            title?.textContent,
            "translated:module.study.classes.notepad",
        );
        assert.equal(
            downloadButton?.textContent,
            "translated:module.study.classes.notepad_download",
        );
        assert.equal(
            clearButton?.textContent,
            "translated:module.study.classes.notepad_clear",
        );
        assert.equal(
            textarea?.attributes["aria-label"],
            "translated:module.study.classes.notepad",
        );
    } finally {
        global.document = originalDocument;
        global.sessionStorage = originalSessionStorage;
    }
});
