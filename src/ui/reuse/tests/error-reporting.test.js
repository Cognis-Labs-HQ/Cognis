import assert from "node:assert/strict";
import test from "node:test";
import { reportClientError } from "../error-reporting.js";
import { subscribeDiagnostics } from "../../../tooling/reuse/diagnostic-fixture.ts";

test("client failures and early callbacks reach gateway diagnostics with safe context", async (t) => {
    const entries = [];
    const release = subscribeDiagnostics(async (entry) => {
        entries.push(entry);
        return true;
    });
    t.after(release);
    assert.equal(
        await reportClientError({
            component: "public-page",
            operation: "load",
        }),
        true,
    );
    assert.deepEqual(entries[0], {
        level: "error",
        message: "client_error",
        meta: { component: "public-page", operation: "load" },
    });
    assert.equal(
        await reportClientError(new TypeError("private response")),
        true,
    );
    assert.deepEqual(entries[1].meta, {
        component: "ui",
        operation: "runtime",
        errorName: "TypeError",
    });
});
