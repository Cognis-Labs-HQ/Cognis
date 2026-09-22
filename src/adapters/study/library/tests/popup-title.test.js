import assert from "node:assert/strict";
import test from "node:test";
import { titleDefinitionForRole } from "../ui/app/title-definition.js";

test("vocabulary uses its own localized definition before its source", () => {
    assert.equal(
        titleDefinitionForRole("lexicalUnit", "specific meaning", "general"),
        "specific meaning",
    );
});

test("vocabulary inherits the source definition only when it has none", () => {
    assert.equal(
        titleDefinitionForRole("lexicalUnit", "", "general"),
        "general",
    );
});

test("non-vocabulary cards never inherit a navigation-source definition", () => {
    assert.equal(
        titleDefinitionForRole("compoundWritingUnit", "", "general"),
        "",
    );
});
