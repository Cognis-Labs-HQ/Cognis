import assert from "node:assert/strict";
import test from "node:test";
import { reportClientError } from "../error-reporting.js";

test("client error reporting uses the provided local logger", () => {
    const calls = [];
    const metadata = {
        component: "public-page",
        operation: "load",
        error: "Request rejected.",
    };

    reportClientError(metadata, (entry) => calls.push(entry));

    assert.deepEqual(calls, [metadata]);
});
