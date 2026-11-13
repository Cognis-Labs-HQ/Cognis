import test from "node:test";
import assert from "node:assert/strict";
import { replaceMountScope, isMountSignal } from "../mount-scope.js";

test("replaceMountScope aborts prior interactions", () => {
    const previous = new AbortController();
    const next = replaceMountScope(previous);

    assert.equal(previous.signal.aborted, true);
    assert.equal(next.signal.aborted, false);
});

test("replaceMountScope links the replacement to the router signal", () => {
    const router = new AbortController();
    const next = replaceMountScope(null, router.signal);

    router.abort();

    assert.equal(next.signal.aborted, true);
});

test("replaceMountScope preserves cancellation that happened before mounting", () => {
    const router = new AbortController();
    router.abort();
    const previous = new AbortController();
    const next = replaceMountScope(previous, router.signal);
    assert.equal(previous.signal.aborted, true);
    assert.equal(next.signal.aborted, true);
});

test("mount signal ancestry accepts child scopes but rejects unrelated routes", () => {
    const router = new AbortController();
    const child = replaceMountScope(null, router.signal);
    const nested = replaceMountScope(null, child.signal);
    assert.equal(isMountSignal(router.signal, router.signal), true);
    assert.equal(isMountSignal(nested.signal, router.signal), true);
    assert.equal(
        isMountSignal(new AbortController().signal, router.signal),
        false,
    );
});
