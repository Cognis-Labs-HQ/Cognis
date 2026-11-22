import test from "node:test";
import assert from "node:assert/strict";
import { loadTestModule } from "../../../tooling/reuse/test-module.ts";

const { createPageElement } = loadTestModule(
    new URL("../ui/classes-dashboard-element.js", import.meta.url),
    {
        "/static/reuse/escape-html.js": {
            escapeHtml: (value) => String(value).replaceAll("<", "&lt;"),
        },
    },
);

for (const role of ["user", "teacher"]) {
    test(`${role} dashboard contribution uses a compact default without changing resize limits`, () => {
        const element = createPageElement({ i18n: { t: (key) => key }, role });
        assert.deepEqual(Array.from(element.gridSize.default), [5, 2]);
        assert.deepEqual(Array.from(element.gridSize.min), [3, 2]);
        assert.match(element.render(), /<h3>/);
        if (role === "user")
            assert.match(element.render(), /href="\/my-classes"/);
        else assert.match(element.render(), /teacher_classes.empty/);
    });
}

test("unrelated roles do not receive the classes dashboard contribution", () => {
    assert.equal(
        createPageElement({ i18n: { t: (key) => key }, role: "admin" }),
        null,
    );
});
