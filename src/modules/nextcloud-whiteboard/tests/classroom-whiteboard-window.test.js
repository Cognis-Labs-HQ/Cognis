import test from "node:test";
import assert from "node:assert/strict";

import { createClassroomWhiteboardWindow } from "../ui/classroom-whiteboard-window.js";

function createMockElement(tagName) {
    return {
        tagName,
        className: "",
        hidden: false,
        textContent: "",
        attributes: {},
        children: [],
        src: "",
        setAttribute(name, value) {
            this.attributes[name] = value;
        },
        appendChild(child) {
            this.children.push(child);
            return child;
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

function createMockRoot() {
    const activeClasses = new Set();
    return {
        children: [],
        addEventListener() {},
        appendChild(child) {
            this.children.push(child);
            return child;
        },
        querySelector() {
            return null;
        },
        classList: {
            add(className) {
                activeClasses.add(className);
            },
            remove(className) {
                activeClasses.delete(className);
            },
            contains(className) {
                return activeClasses.has(className);
            },
        },
    };
}

test("classroom whiteboard window accepts the shared i18n object", () => {
    const originalDocument = global.document;
    global.document = {
        createElement(tagName) {
            return createMockElement(tagName);
        },
    };

    try {
        const root = createMockRoot();
        const i18n = {
            t(key) {
                return `translated:${key}`;
            },
        };
        const whiteboardWindow = createClassroomWhiteboardWindow({
            root,
            i18n,
        });

        const panel = whiteboardWindow.getElement();
        const title = panel.querySelector(".classes-whiteboard-title");
        const closeButton = panel.querySelector(
            ".classes-whiteboard-close-btn",
        );

        assert.equal(
            panel.attributes["aria-label"],
            "translated:module.study.classes.whiteboard",
        );
        assert.equal(
            title?.textContent,
            "translated:module.study.classes.whiteboard",
        );
        assert.equal(
            closeButton?.attributes["aria-label"],
            "translated:ui.reuse.close",
        );

        whiteboardWindow.openBoard({
            boardId: "board-1",
            boardName: "",
            embedUrl: "https://example.com/board-1",
        });

        assert.equal(
            title?.textContent,
            "translated:module.study.classes.whiteboard",
        );
        assert.equal(panel.hidden, false);
        assert.equal(
            root.classList.contains("classes-whiteboard-active"),
            true,
        );
    } finally {
        global.document = originalDocument;
    }
});
