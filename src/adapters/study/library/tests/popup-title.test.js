import assert from "node:assert/strict";
import test from "node:test";
import {
    orderedDefinitionDisplay,
    titleDefinitionForRole,
    visibleTitleDefinition,
} from "../ui/app/title-definition.js";

test("vocabulary uses its own localized definition before its source", () => {
    assert.equal(
        titleDefinitionForRole("lexicalUnit", "specific meaning", "general"),
        "specific meaning",
    );
});

test("a definition matching the card title is hidden", () => {
    assert.equal(
        visibleTitleDefinition("person", "lexicalUnit", "person", ""),
        "",
    );
});

test("the first definition is prominent and later definitions are additional", () => {
    assert.deepEqual(
        orderedDefinitionDisplay(["person", "counter for people", "character"]),
        {
            titleDefinition: "person",
            additionalDefinitions: ["counter for people", "character"],
        },
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
