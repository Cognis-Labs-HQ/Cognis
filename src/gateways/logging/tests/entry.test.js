import test from "node:test";
import assert from "node:assert/strict";
import { normalizeDiagnostic } from "../ui/entry.js";

test("bare failures retain safe context and diagnostic identity without raw error text", () => {
    assert.deepEqual(
        normalizeDiagnostic({
            level: "error",
            message: new TypeError("private response"),
        }),
        {
            level: "error",
            message: "browser_diagnostic",
            meta: {
                component: "browser",
                operation: "diagnostic",
                error: { errorName: "TypeError" },
            },
        },
    );
    assert.equal(
        normalizeDiagnostic({ level: "unsupported", message: "failed" }),
        null,
    );
});

test("multiple logging arguments preserve their context through gateway normalization", () => {
    const entry = normalizeDiagnostic({
        level: "warn",
        message: "request_failed",
        meta: "retrying",
        details: [
            {
                component: "example",
                operation: "refresh",
                accessToken: "private",
                status: 503,
            },
            new Error("private response"),
        ],
    });
    assert.deepEqual(entry, {
        level: "warn",
        message: "request_failed retrying",
        meta: {
            component: "example",
            operation: "refresh",
            status: 503,
            error: { errorName: "Error" },
        },
    });
});
