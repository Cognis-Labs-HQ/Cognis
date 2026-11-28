import test from "node:test";
import assert from "node:assert/strict";
import { bindComposerPointerDrag } from "../../reuse/page-composer/pointer-drag.js";

function dragFixture(context) {
    const frames = new Map();
    let nextFrame = 0;
    const view = {
        innerHeight: 500,
        getComputedStyle: () => ({ overflowY: "auto" }),
        requestAnimationFrame(callback) {
            frames.set(++nextFrame, callback);
            return nextFrame;
        },
        cancelAnimationFrame(frame) {
            frames.delete(frame);
        },
    };
    const previous = globalThis.window;
    globalThis.window = view;
    context.after(() => {
        globalThis.window = previous;
    });
    const scroller = {
        scrollTop: 100,
        scrollHeight: 1200,
        clientHeight: 400,
        getBoundingClientRect: () => ({ top: 50, bottom: 450 }),
        parentElement: null,
    };
    const target = new EventTarget();
    let captured = false;
    Object.assign(target, {
        isConnected: true,
        parentElement: scroller,
        ownerDocument: { defaultView: view, elementFromPoint: () => null },
        setPointerCapture() {
            captured = true;
        },
        hasPointerCapture: () => captured,
        releasePointerCapture() {
            captured = false;
        },
    });
    const pointer = (type, pointerId = 7, clientY = 440) => {
        const event = new Event(type);
        Object.assign(event, { pointerId, clientX: 20, clientY });
        return event;
    };
    const moves = [];
    const endings = [];
    bindComposerPointerDrag(
        target,
        pointer("pointerdown", 7, 250),
        (event) => moves.push(event),
        (event) => endings.push(event),
    );
    return {
        target,
        scroller,
        moves,
        endings,
        frames,
        pointer,
        captured: () => captured,
        tick() {
            const callbacks = [...frames.values()];
            frames.clear();
            for (const callback of callbacks) callback(16);
        },
    };
}

test("only the captured pointer moves and completes a composer drag", (context) => {
    const fixture = dragFixture(context);
    fixture.target.dispatchEvent(fixture.pointer("pointermove", 8));
    fixture.target.dispatchEvent(fixture.pointer("pointerup", 8));
    assert.equal(fixture.moves.length, 0);
    assert.equal(fixture.endings.length, 0);
    fixture.target.dispatchEvent(fixture.pointer("pointermove"));
    fixture.tick();
    assert.ok(fixture.scroller.scrollTop > 100);
    assert.equal(
        fixture.moves.length,
        2,
        "Scrolling recomputes the held preview",
    );
    fixture.target.dispatchEvent(fixture.pointer("pointerup"));
    assert.equal(fixture.endings[0].type, "pointerup");
    assert.equal(fixture.frames.size, 0);
    assert.equal(fixture.captured(), false);
});

for (const reason of ["pointercancel", "lostpointercapture", "unmount"]) {
    test(`${reason} cancels scrolling and the pending drag`, (context) => {
        const fixture = dragFixture(context);
        fixture.target.dispatchEvent(fixture.pointer("pointermove"));
        fixture.tick();
        const offset = fixture.scroller.scrollTop;
        if (reason === "unmount") {
            fixture.target.isConnected = false;
            fixture.tick();
        } else fixture.target.dispatchEvent(fixture.pointer(reason));
        assert.equal(fixture.endings.length, 1);
        assert.equal(fixture.endings[0].type, "pointercancel");
        assert.equal(fixture.frames.size, 0);
        fixture.target.dispatchEvent(fixture.pointer("pointermove"));
        fixture.tick();
        assert.equal(fixture.scroller.scrollTop, offset);
    });
}

test("holding without movement leaves scrolling still", (context) => {
    const fixture = dragFixture(context);
    fixture.tick();
    assert.equal(fixture.scroller.scrollTop, 100);
    assert.equal(fixture.moves.length, 0);
    fixture.target.dispatchEvent(fixture.pointer("pointercancel"));
});
