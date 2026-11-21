import assert from "node:assert/strict";
import test from "node:test";
import { JSDOM } from "jsdom";
import { bindListDropzones } from "../dropzones.js";

function fixture(context) {
    const { window } = new JSDOM(
        "<main><ul data-list><li data-item><button data-handle>One</button></li></ul><ul data-list><li data-item><button data-handle>Two</button></li></ul></main>",
    );
    context.after(() => window.close());
    const root = window.document.querySelector("main");
    const [source, target] = root.querySelectorAll("li");
    const handle = source.firstElementChild;
    const captures = new Set();
    handle.setPointerCapture = (id) => captures.add(id);
    handle.hasPointerCapture = (id) => captures.has(id);
    handle.releasePointerCapture = (id) => captures.delete(id);
    for (const [index, zone] of [...root.children].entries()) {
        zone.getBoundingClientRect = () => ({
            left: index * 200,
            right: index * 200 + 150,
            top: 0,
            bottom: 100,
        });
        zone.firstElementChild.getBoundingClientRect = () => ({
            top: 0,
            bottom: 40,
            height: 40,
        });
    }
    const drops = [];
    const abort = new window.AbortController();
    const options = {
        root,
        signal: abort.signal,
        zoneSelector: "[data-list]",
        rowSelector: "[data-item]",
        handleSelector: "[data-handle]",
        draggingClass: "language-row-dragging",
        canDrag: () => true,
        canDrop: () => true,
        onDrop: (value) => drops.push(value),
    };
    const owner = bindListDropzones(options);
    context.after(() => owner.dispose());
    function pointer(type, node = handle, extra = {}) {
        const event = new window.Event(type, {
            bubbles: true,
            cancelable: true,
        });
        Object.assign(event, {
            pointerId: 1,
            pointerType: "touch",
            isPrimary: true,
            button: 0,
            clientX: 250,
            clientY: 30,
            ...extra,
        });
        node.dispatchEvent(event);
    }
    return {
        window,
        root,
        source,
        target,
        handle,
        captures,
        drops,
        abort,
        options,
        owner,
        pointer,
    };
}

test("settings list gestures emit one source destination and position and release capture", (context) => {
    const { pointer, source, target, drops, captures } = fixture(context);
    pointer("pointerdown");
    assert.equal(captures.size, 1);
    pointer("pointermove");
    assert.equal(target.className, "drop-target-after");
    pointer("pointerup");
    pointer("pointerup");
    assert.deepEqual(drops, [
        { source, zone: target.parentElement, row: target, after: true },
    ]);
    assert.equal(captures.size, 0);
    assert.equal(target.className, "");
});

test("replacing an owner cancels old capture and stale disposer cannot remove new owner", (context) => {
    const { pointer, owner, options, drops, captures } = fixture(context);
    pointer("pointerdown");
    const next = bindListDropzones(options);
    context.after(() => next.dispose());
    assert.equal(captures.size, 0);
    owner.dispose();
    pointer("pointerup");
    assert.equal(drops.length, 0);
    pointer("pointerdown");
    pointer("pointerup");
    assert.equal(drops.length, 1);
});

test("abort removes capture and all gesture listeners", (context) => {
    const { pointer, abort, drops, captures } = fixture(context);
    pointer("pointerdown");
    abort.abort();
    pointer("pointerup");
    pointer("pointerdown");
    pointer("pointerup");
    assert.equal(drops.length, 0);
    assert.equal(captures.size, 0);
});

test("eligibility is rechecked before completing a captured gesture", (context) => {
    const { pointer, owner, options, drops, captures } = fixture(context);
    owner.dispose();
    let allowed = true;
    const next = bindListDropzones({ ...options, canDrop: () => allowed });
    context.after(() => next.dispose());
    pointer("pointerdown");
    allowed = false;
    pointer("pointerup");
    assert.equal(drops.length, 0);
    assert.equal(captures.size, 0);
});

test("mouse pointer and secondary touch do not capture or mutate list items", (context) => {
    const { pointer, drops, captures } = fixture(context);
    pointer("pointerdown", undefined, { pointerType: "mouse" });
    pointer("pointerup");
    pointer("pointerdown", undefined, { isPrimary: false });
    pointer("pointerup");
    assert.equal(drops.length, 0);
    assert.equal(captures.size, 0);
});

test("removed source and foreign targets cannot emit a drop", (context) => {
    const { pointer, source, handle, drops, root } = fixture(context);
    pointer("pointerdown");
    source.remove();
    pointer("pointerup", handle);
    assert.equal(drops.length, 0);
    pointer("dragstart", root);
    pointer("drop", root);
    assert.equal(drops.length, 0);
});

for (const method of ["canDrag", "canDrop"]) {
    for (const mode of ["pointer", "native"]) {
        test(`${method} failure cancels ${mode} completion before another event can commit`, (context) => {
            const {
                window,
                pointer,
                owner,
                options,
                drops,
                captures,
                root,
                target,
            } = fixture(context);
            owner.dispose();
            let failing = false;
            const errors = [];
            window.addEventListener("error", (event) => {
                errors.push(event.error);
                event.preventDefault();
            });
            const next = bindListDropzones({
                ...options,
                [method]: () => {
                    if (failing) throw new Error("eligibility_failed");
                    return true;
                },
            });
            context.after(() => next.dispose());
            pointer(mode === "pointer" ? "pointerdown" : "dragstart");
            failing = true;
            pointer(
                mode === "pointer" ? "pointerup" : "drop",
                mode === "native" ? target : undefined,
            );
            assert.equal(errors.length, 1);
            assert.equal(errors[0].message, "eligibility_failed");
            assert.equal(captures.size, 0);
            assert.equal(
                root.querySelector(
                    ".language-row-dragging, .drop-target-after",
                ),
                null,
            );
            failing = false;
            pointer(
                mode === "pointer" ? "pointerup" : "drop",
                mode === "native" ? target : undefined,
            );
            assert.equal(drops.length, 0);
            pointer(mode === "pointer" ? "pointerdown" : "dragstart");
            pointer(
                mode === "pointer" ? "pointerup" : "drop",
                mode === "native" ? target : undefined,
            );
            assert.equal(drops.length, 1);
        });
    }
}

for (const action of [
    "abort",
    "dispose",
    "replace",
    "remove-source",
    "move-source",
    "remove-target",
    "remove-zone",
    "cancel",
    "deny",
]) {
    test(`capture release cannot commit after ${action}`, (context) => {
        const {
            window,
            pointer,
            owner,
            options,
            drops,
            captures,
            root,
            source,
            target,
            handle,
            abort,
        } = fixture(context);
        owner.dispose();
        let allowed = true;
        const next = bindListDropzones({ ...options, canDrop: () => allowed });
        context.after(() => next.dispose());
        handle.releasePointerCapture = (id) => {
            captures.delete(id);
            handle.dispatchEvent(new window.Event("lostpointercapture"));
        };
        handle.addEventListener(
            "lostpointercapture",
            () => {
                if (action === "abort") abort.abort();
                if (action === "dispose") next.dispose();
                if (action === "cancel") next.cancel();
                if (action === "remove-source") source.remove();
                if (action === "move-source")
                    target.parentElement.append(source);
                if (action === "remove-target") target.remove();
                if (action === "remove-zone") target.parentElement.remove();
                if (action === "deny") allowed = false;
                if (action === "replace") {
                    const replacement = bindListDropzones(options);
                    context.after(() => replacement.dispose());
                }
            },
            { once: true },
        );
        pointer("pointerdown");
        pointer("pointerup");
        assert.equal(drops.length, 0);
        assert.equal(captures.size, 0);
        assert.equal(
            root.querySelector(".language-row-dragging, .drop-target-after"),
            null,
        );
        pointer("pointerup");
        assert.equal(drops.length, 0);
    });
}

test("a failing mutation callback leaves no gesture available for duplicate completion", (context) => {
    const { window, pointer, owner, options, captures, root } =
        fixture(context);
    owner.dispose();
    let calls = 0;
    const errors = [];
    window.addEventListener("error", (event) => {
        errors.push(event.error);
        event.preventDefault();
    });
    const next = bindListDropzones({
        ...options,
        onDrop: () => {
            calls++;
            throw new Error("mutation_failed");
        },
    });
    context.after(() => next.dispose());
    pointer("pointerdown");
    pointer("pointerup");
    pointer("pointerup");
    assert.equal(calls, 1);
    assert.equal(errors.length, 1);
    assert.equal(captures.size, 0);
    assert.equal(root.querySelector(".language-row-dragging"), null);
});

test("reentrant binding during replacement retains only the newest tracked owner", (context) => {
    const { window, pointer, options, captures, handle, root } =
        fixture(context);
    pointer("pointerdown");
    handle.releasePointerCapture = (id) => {
        captures.delete(id);
        handle.dispatchEvent(new window.Event("lostpointercapture"));
    };
    let nested;
    handle.addEventListener(
        "lostpointercapture",
        () => {
            nested = bindListDropzones(options);
            context.after(() => nested.dispose());
        },
        { once: true },
    );
    const outer = bindListDropzones(options);
    context.after(() => outer.dispose());
    assert.equal(captures.size, 0);
    pointer("pointerdown");
    assert.equal(captures.size, 1);
    outer.dispose();
    assert.equal(captures.size, 1);
    const newest = bindListDropzones(options);
    context.after(() => newest.dispose());
    assert.equal(captures.size, 0);
    assert.equal(root.querySelector(".language-row-dragging"), null);
    newest.dispose();
    pointer("pointerdown");
    assert.equal(captures.size, 0);
    assert.equal(root.querySelector(".language-row-dragging"), null);
});
