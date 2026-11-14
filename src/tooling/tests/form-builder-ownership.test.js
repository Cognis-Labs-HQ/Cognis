import test from "node:test";
import assert from "node:assert/strict";
import { resolve } from "node:path";
import { hasOwnedFormSubmission } from "../scripts/form-builder-ownership.mjs";

const hostReuseRoot = resolve("src/ui/reuse");
const fixtureRoot = resolve("src/tooling/tests/form-ownership/owner");
const hasOwnership = (name) =>
    hasOwnedFormSubmission({
        filePath: resolve(fixtureRoot, `${name}.js`),
        hostReuseRoot,
    });

test("delegated form ownership follows the real Profile post form", () => {
    assert.equal(
        hasOwnedFormSubmission({
            filePath: resolve("src/adapters/social/profile/ui/app.js"),
            hostReuseRoot,
        }),
        true,
    );
});

test("delegated form ownership accepts aliased imported and private helpers", () => {
    assert.equal(hasOwnership("positive"), true);
});

for (const name of [
    "bypassed",
    "discarded",
    "shadowed-parameter",
    "shadowed-local",
    "shadowed-var",
    "fake",
    "cycle",
    "reassigned-helper",
    "branch-return",
    "missing",
    "missing-export",
    "owner-escape",
    "unused",
    "late-attach",
    "nested-attach",
    "conditional-attach",
    "logical-attach",
    "wrong-form",
    "reassigned-form",
    "reassigned-builder",
    "changed-attach",
    "destructured-attach",
    "deleted-attach",
    "aliased-attach",
    "assigned-attach",
    "escaped-form",
    "aliased-form",
    "mixed-forms",
    "shadowed-entry",
    "mixed-submission",
    "global-submission",
]) {
    test(`delegated form ownership rejects ${name}`, () => {
        assert.equal(hasOwnership(name), false);
    });
}
