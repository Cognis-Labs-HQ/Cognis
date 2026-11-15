import test from "node:test";
import assert from "node:assert/strict";
import { JSDOM } from "jsdom";
import { makeFloatingWindow } from "../../floating-window.js";
import { uiCtx } from "../../ui-ctx.js";

function fixture({ defaultHandle = false, captureMode } = {}) {
    const closeCalls = [];
    const dom = new JSDOM(
        "<!doctype html><main><section><header>Window</header><button>Action</button></section></main>",
        { url: "https://fixture.invalid/" },
    );
    const { window } = dom;
    const previous = new Map();
    for (const name of [
        "window",
        "document",
        "HTMLElement",
        "Element",
        "AbortController",
        "MutationObserver",
    ]) {
        previous.set(name, globalThis[name]);
        globalThis[name] = name === "window" ? window : window[name];
    }
    Object.defineProperties(window, {
        innerWidth: { value: 1000, configurable: true },
        innerHeight: { value: 700, configurable: true },
    });
    const panel = window.document.querySelector("section");
    const handle = panel.querySelector("header");
    const captured = new Map();
    const released = [];
    window.Element.prototype.setPointerCapture = function (pointerId) {
        captured.set(pointerId, this);
    };
    window.Element.prototype.hasPointerCapture = function (pointerId) {
        return captured.get(pointerId) === this;
    };
    window.Element.prototype.releasePointerCapture = function (pointerId) {
        if (captured.get(pointerId) !== this) return;
        captured.delete(pointerId);
        released.push(pointerId);
        pointer(this, "lostpointercapture", { pointerId });
    };
    panel.getBoundingClientRect = () => ({
        left: parseFloat(panel.style.left) || 100,
        top: parseFloat(panel.style.top) || 100,
        width: parseFloat(panel.style.width) || 280,
        height: parseFloat(panel.style.height) || 220,
    });
    function pointer(target, type, properties = {}) {
        const event = new window.Event(type, {
            bubbles: true,
            cancelable: true,
        });
        Object.assign(
            event,
            {
                pointerId: 1,
                button: 0,
                buttons: ["pointerdown", "pointermove"].includes(type) ? 1 : 0,
                clientX: 110,
                clientY: 110,
                pointerType: "touch",
                isPrimary: true,
            },
            properties,
        );
        target.dispatchEvent(event);
    }
    const controller = new window.AbortController();
    if (captureMode === "absent") {
        delete window.Element.prototype.setPointerCapture;
        delete window.Element.prototype.hasPointerCapture;
        delete window.Element.prototype.releasePointerCapture;
    }
    if (captureMode === "throw")
        window.Element.prototype.setPointerCapture = () => {
            throw new window.DOMException("capture failed", "NotFoundError");
        };
    const options = {
        ...(defaultHandle ? {} : { handle }),
        signal: controller.signal,
        portal: false,
        topLayer: false,
        width: "280px",
        height: "220px",
        closeButton: {
            label: "Close fixture",
            onClose() {
                closeCalls.push("close");
            },
        },
    };
    const release = makeFloatingWindow(panel, options);
    const resize = panel.querySelector('[data-resize-edge="bottom-right"]');
    return {
        window,
        panel,
        handle,
        resize,
        release,
        controller,
        pointer,
        captured,
        released,
        closeCalls,
        options,
        close() {
            release();
            dom.window.close();
            for (const [name, value] of previous) {
                if (value === undefined) delete globalThis[name];
                else globalThis[name] = value;
            }
        },
    };
}
function check(name, run, options) {
    test(name, () => {
        const setup = fixture(options);
        try {
            run(setup);
        } finally {
            setup.close();
        }
    });
}

check(
    "control: current owning pointer moves the real window",
    ({ pointer, handle, panel }) => {
        assert.equal(
            uiCtx.capabilities.get("ui:makeFloatingWindow"),
            makeFloatingWindow,
        );
        pointer(handle, "pointerdown");
        pointer(handle, "pointermove", { clientX: 160 });
        assert.equal(panel.style.left, "150px");
    },
);
for (const ending of ["pointerup", "pointercancel"]) {
    check(`control: ${ending} ends dragging`, ({ pointer, handle, panel }) => {
        pointer(handle, "pointerdown");
        pointer(handle, "pointermove", { clientX: 160 });
        pointer(handle, ending);
        pointer(handle, "pointermove", { clientX: 210 });
        assert.equal(panel.style.left, "150px");
    });
}
check(
    "drag capture loss must end movement before later hover events",
    ({ pointer, handle, panel, captured }) => {
        pointer(handle, "pointerdown", { pointerType: "mouse" });
        pointer(handle, "pointermove", { clientX: 160, pointerType: "mouse" });
        captured.delete(1);
        pointer(handle, "lostpointercapture", { pointerType: "mouse" });
        pointer(handle, "pointermove", {
            clientX: 210,
            buttons: 0,
            pointerType: "mouse",
        });
        assert.equal(panel.style.left, "150px");
    },
);
check(
    "control: resize capture loss ends resizing",
    ({ pointer, resize, panel, captured }) => {
        pointer(resize, "pointerdown");
        pointer(resize, "pointermove", { clientX: 160, clientY: 160 });
        const width = panel.style.width;
        captured.delete(1);
        pointer(resize, "lostpointercapture");
        pointer(resize, "pointermove", {
            clientX: 210,
            clientY: 210,
            buttons: 0,
        });
        assert.equal(panel.style.width, width);
    },
);
check(
    "a second touch must not steal an active move gesture",
    ({ pointer, handle, panel }) => {
        pointer(handle, "pointerdown");
        pointer(handle, "pointermove", { clientX: 160 });
        pointer(handle, "pointerdown", {
            pointerId: 2,
            isPrimary: false,
            clientX: 170,
        });
        pointer(handle, "pointermove", { clientX: 210 });
        assert.equal(panel.style.left, "200px");
    },
);
check(
    "a second touch must not steal an active resize gesture",
    ({ pointer, resize, panel }) => {
        pointer(resize, "pointerdown");
        pointer(resize, "pointerdown", { pointerId: 2, isPrimary: false });
        pointer(resize, "pointermove", { clientX: 160, clientY: 160 });
        assert.equal(panel.style.width, "330px");
    },
);
check(
    "release must relinquish active capture on the retained caller handle",
    ({ pointer, handle, release, captured }) => {
        pointer(handle, "pointerdown");
        assert.equal(captured.get(1), handle);
        release();
        assert.equal(captured.has(1), false);
    },
);
check(
    "control: abort prevents later motion and restores caller styles",
    ({ pointer, handle, panel, controller }) => {
        pointer(handle, "pointerdown");
        pointer(handle, "pointermove", { clientX: 160 });
        controller.abort();
        assert.equal(panel.style.left, "");
        pointer(handle, "pointermove", { clientX: 210 });
        assert.equal(panel.style.left, "");
    },
);
check(
    "control: unrelated pointer movement does not move the window",
    ({ pointer, handle, panel }) => {
        pointer(handle, "pointerdown");
        pointer(handle, "pointermove", { pointerId: 2, clientX: 210 });
        assert.equal(panel.style.left, "100px");
    },
);

check(
    "control: release only undoes floating behavior and never closes owner content",
    ({ release, panel, closeCalls }) => {
        release();
        release();
        assert.equal(panel.isConnected, true);
        assert.equal(panel.classList.contains("floating-window"), false);
        assert.deepEqual(closeCalls, []);
    },
);
check(
    "control: explicit host close notifies owner separately from release",
    ({ panel, closeCalls }) => {
        panel.querySelector(".floating-window-close").click();
        assert.equal(panel.isConnected, true);
        assert.equal(panel.classList.contains("floating-window"), false);
        assert.deepEqual(closeCalls, ["close"]);
    },
);
check(
    "control: route notification does not retire an intentionally persistent window",
    ({ window, panel, pointer, handle, closeCalls }) => {
        window.dispatchEvent(new window.Event("cognis:route-will-change"));
        assert.equal(panel.classList.contains("floating-window"), true);
        pointer(handle, "pointerdown");
        pointer(handle, "pointermove", { clientX: 160 });
        assert.equal(panel.style.left, "150px");
        assert.deepEqual(closeCalls, []);
    },
);

for (const pointerType of ["mouse", "touch", "pen"]) {
    for (const selector of [
        "header",
        ".floating-window-toolbar",
        '[data-resize-edge="top-left"]',
        '[data-resize-edge="bottom-right"]',
    ]) {
        for (const ending of [
            "pointerup",
            "pointercancel",
            "lostpointercapture",
        ]) {
            check(
                `${pointerType} ${selector}: ${ending} preserves geometry and permits another gesture`,
                ({ panel, pointer, captured, closeCalls }) => {
                    const target = panel.querySelector(selector);
                    for (const pointerId of [1, 2]) {
                        const before = panel.style.cssText;
                        pointer(target, "pointerdown", {
                            pointerId,
                            pointerType,
                        });
                        pointer(target, "pointermove", {
                            pointerId,
                            pointerType,
                            clientX: 90,
                            clientY: 90,
                        });
                        const geometry = panel.style.cssText;
                        assert.notEqual(geometry, before);
                        if (ending === "lostpointercapture")
                            captured.delete(pointerId);
                        pointer(target, ending, { pointerId, pointerType });
                        pointer(target, "pointermove", {
                            pointerId,
                            pointerType,
                            clientX: 210,
                            clientY: 210,
                            buttons: 0,
                        });
                        assert.equal(panel.style.cssText, geometry);
                        assert.equal(captured.has(pointerId), false);
                    }
                    assert.deepEqual(closeCalls, []);
                    assert.equal(panel.isConnected, true);
                },
            );
        }
    }
}

for (const defaultHandle of [false, true]) {
    check(
        `toolbar bubbling retains one capture owner, default handle ${defaultHandle}`,
        ({ panel, pointer, captured, release, released }) => {
            const toolbar = panel.querySelector(".floating-window-toolbar");
            pointer(toolbar, "pointerdown");
            assert.equal(captured.get(1), toolbar);
            pointer(toolbar, "pointermove", { clientX: 160 });
            assert.equal(panel.style.left, "150px");
            release();
            assert.deepEqual(released, [1]);
        },
        { defaultHandle },
    );
}

check(
    "default element handle ignores a descendant capture loss and stale loss after reacquisition",
    ({ panel, pointer, captured }) => {
        pointer(panel, "pointerdown");
        pointer(panel.querySelector("header"), "lostpointercapture");
        pointer(panel, "pointermove", { clientX: 160 });
        assert.equal(panel.style.left, "150px");
        pointer(panel, "lostpointercapture");
        pointer(panel, "pointermove", { clientX: 180 });
        assert.equal(panel.style.left, "170px");
        captured.delete(1);
        pointer(panel, "lostpointercapture");
        pointer(panel, "pointermove", { clientX: 200 });
        assert.equal(panel.style.left, "170px");
    },
    { defaultHandle: true },
);

for (const startsWithResize of [false, true]) {
    check(
        `move and resize cannot compete, resize first ${startsWithResize}`,
        ({ pointer, handle, resize, panel, captured }) => {
            const owner = startsWithResize ? resize : handle;
            const rival = startsWithResize ? handle : resize;
            pointer(owner, "pointerdown");
            pointer(rival, "pointerdown", { pointerId: 2 });
            for (const ending of [
                "pointerup",
                "pointercancel",
                "lostpointercapture",
            ])
                pointer(rival, ending, { pointerId: 2 });
            pointer(owner, "pointermove", { clientX: 160 });
            assert.equal(captured.get(1), owner);
            assert.equal(captured.has(2), false);
            assert.equal(
                panel.style.left,
                startsWithResize ? "100px" : "150px",
            );
            assert.equal(
                panel.style.width,
                startsWithResize ? "330px" : "280px",
            );
        },
    );
}

check(
    "transfer to another owner cancels without releasing that owner capture",
    ({ pointer, handle, panel, captured, release, released }) => {
        pointer(handle, "pointerdown");
        const other = panel.querySelector("button");
        other.setPointerCapture(1);
        pointer(handle, "lostpointercapture");
        pointer(handle, "pointermove", { clientX: 210 });
        assert.equal(panel.style.left, "100px");
        release();
        assert.equal(captured.get(1), other);
        assert.deepEqual(released, []);
    },
);

check(
    "cleanup after transfer before loss delivery never releases another owner",
    ({ pointer, handle, panel, captured, release, released }) => {
        pointer(handle, "pointerdown");
        const other = panel.querySelector("button");
        other.setPointerCapture(1);
        release();
        assert.equal(captured.get(1), other);
        assert.deepEqual(released, []);
    },
);

for (const action of ["release", "abort"]) {
    check(
        `${action} clears capture with synchronous loss and remount remains usable`,
        ({
            panel,
            handle,
            pointer,
            captured,
            release,
            controller,
            options,
        }) => {
            pointer(handle, "pointerdown");
            if (action === "abort") controller.abort();
            else release();
            release();
            assert.equal(captured.size, 0);
            const remount = makeFloatingWindow(panel, {
                ...options,
                signal: undefined,
            });
            try {
                pointer(handle, "lostpointercapture");
                pointer(handle, "pointerdown");
                pointer(handle, "pointermove", { clientX: 160 });
                assert.equal(panel.style.left, "150px");
            } finally {
                remount();
            }
            assert.equal(captured.size, 0);
        },
    );
}

check(
    "absent capture API supports local motion and matching cancellation",
    ({ pointer, handle, panel }) => {
        pointer(handle, "pointerdown");
        pointer(handle, "pointermove", { clientX: 160 });
        assert.equal(panel.style.left, "150px");
        pointer(handle, "pointercancel");
        pointer(handle, "pointermove", { clientX: 210 });
        assert.equal(panel.style.left, "150px");
    },
    { captureMode: "absent" },
);

check(
    "throwing capture cannot leave a gesture armed",
    ({ pointer, handle, panel, window }) => {
        pointer(handle, "pointerdown");
        pointer(handle, "pointermove", { clientX: 160 });
        assert.equal(panel.style.left, "100px");
        delete window.Element.prototype.setPointerCapture;
        pointer(handle, "pointerdown");
        pointer(handle, "pointermove", { clientX: 160 });
        assert.equal(panel.style.left, "150px");
    },
    { captureMode: "throw" },
);

check(
    "throwing capture release still retires the owner and restores content",
    ({ pointer, handle, release, panel }) => {
        pointer(handle, "pointerdown");
        handle.releasePointerCapture = () => {
            throw new Error("release failed");
        };
        release();
        pointer(handle, "pointermove", { clientX: 210 });
        assert.equal(panel.style.left, "");
        assert.equal(panel.isConnected, true);
    },
);

for (const selector of [
    "header",
    ".floating-window-toolbar",
    '[data-resize-edge="top-left"]',
    '[data-resize-edge="bottom-right"]',
]) {
    for (const ending of ["pointerup", "pointercancel"]) {
        check(
            `window ${ending} terminates only the owning ${selector} pointer`,
            ({ window, panel, pointer, captured }) => {
                const target = panel.querySelector(selector);
                pointer(target, "pointerdown");
                pointer(window, ending, { pointerId: 2 });
                assert.equal(captured.get(1), target);
                pointer(target, "pointermove", { clientX: 90, clientY: 90 });
                const geometry = panel.style.cssText;
                pointer(window, ending);
                assert.equal(captured.size, 0);
                pointer(target, "pointermove", { clientX: 210, clientY: 210 });
                assert.equal(panel.style.cssText, geometry);
            },
        );
    }
    for (const action of ["release", "abort"]) {
        check(
            `${action} releases capture held by ${selector}`,
            ({ panel, pointer, captured, release, controller, closeCalls }) => {
                const target = panel.querySelector(selector);
                pointer(target, "pointerdown");
                assert.equal(captured.get(1), target);
                if (action === "abort") controller.abort();
                else release();
                assert.equal(captured.size, 0);
                assert.equal(panel.isConnected, true);
                assert.deepEqual(closeCalls, []);
            },
        );
    }
}

check(
    "failing capture inspection cancels motion without releasing an unknown owner",
    ({ pointer, handle, panel, released }) => {
        pointer(handle, "pointerdown");
        handle.hasPointerCapture = () => {
            throw new Error("inspection failed");
        };
        pointer(handle, "lostpointercapture");
        pointer(handle, "pointermove", { clientX: 210 });
        assert.equal(panel.style.left, "100px");
        assert.deepEqual(released, []);
    },
);

check(
    "termination clears motion before release can reenter listeners",
    ({ pointer, handle, panel }) => {
        const releaseCapture = handle.releasePointerCapture;
        pointer(handle, "pointerdown");
        pointer(handle, "pointermove", { clientX: 160 });
        handle.releasePointerCapture = function (pointerId) {
            pointer(handle, "pointermove", { clientX: 210 });
            assert.equal(panel.style.left, "150px");
            releaseCapture.call(this, pointerId);
        };
        pointer(handle, "pointerup");
        assert.equal(panel.style.left, "150px");
    },
);
