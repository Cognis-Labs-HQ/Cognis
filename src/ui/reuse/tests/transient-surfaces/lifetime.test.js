import test from "node:test";
import assert from "node:assert/strict";
import { transientSurfaces } from "../../transient-surfaces.js";

test("surface lifetimes close only the matching owned registration", () => {
    const element = {},
        group = new AbortController(),
        owner = new AbortController();
    let closed = 0;
    transientSurfaces.register(
        element,
        () => {
            closed++;
            owner.abort();
        },
        owner.signal,
    );
    assert.equal(transientSurfaces.attachLifetime(element, group.signal), true);
    group.abort();
    assert.equal(closed, 1);
    assert.equal(
        transientSurfaces.attachLifetime(element, new AbortController().signal),
        false,
    );
});

test("replacement surfaces and unrelated panels survive an obsolete consumer", () => {
    const element = {},
        other = {},
        oldGroup = new AbortController();
    const oldOwner = new AbortController(),
        nextOwner = new AbortController();
    let oldClosed = 0,
        nextClosed = 0,
        otherClosed = 0;
    transientSurfaces.register(element, () => oldClosed++, oldOwner.signal);
    transientSurfaces.attachLifetime(element, oldGroup.signal);
    transientSurfaces.register(element, () => nextClosed++, nextOwner.signal);
    transientSurfaces.register(
        other,
        () => otherClosed++,
        new AbortController().signal,
    );
    oldGroup.abort();
    oldOwner.abort();
    assert.equal(oldClosed, 0);
    assert.equal(nextClosed, 0);
    assert.equal(otherClosed, 0);
    const nextGroup = new AbortController();
    assert.equal(
        transientSurfaces.attachLifetime(element, nextGroup.signal),
        true,
    );
    nextGroup.abort();
    assert.equal(nextClosed, 1);
});
