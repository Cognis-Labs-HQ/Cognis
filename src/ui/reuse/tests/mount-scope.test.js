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
