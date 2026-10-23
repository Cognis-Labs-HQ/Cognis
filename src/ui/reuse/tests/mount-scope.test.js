import test from "node:test";
import assert from "node:assert/strict";
import { replaceMountScope } from "../mount-scope.js";

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
