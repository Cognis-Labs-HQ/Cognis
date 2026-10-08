import { orderedReadingReferences } from "../ui/app/reference-readings.js";
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

test("compound reading links follow canonical character groups after unlinked and duplicate readings", async () => {
    const { readFileSync } = await import("node:fs");
    const { default: vm } = await import("node:vm");
    const links = await import("../ui/app/composition-links.js");
    const source = readFileSync(
        new URL("../ui/app/popup-title.js", import.meta.url),
        "utf8",
    )
        .replace(/import[\s\S]*?from "[^"]+";\n/g, "")
        .replace(/\bexport /g, "");
    const context = {
        ...links,
        orderedReadingReferences,
        referencedTransformation: () => null,
        layerForEntry: (schemas, entry) =>
            schemas
                .find(({ id }) => id === entry.schemaId)
                ?.layers.find(({ id }) => id === entry.layer),
        pronunciationValues: (entry) => entry.fields?.pronunciation ?? [],
        secondarySpellingGroups: () => [],
        visibleTitleDefinition: () => "",
        variantPlacement: () => null,
    };
    vm.runInNewContext(
        source + "\nglobalThis.detailItems = popupTitleDetailItems;",
        context,
    );
    const characters = ["a", "b"].map((label) => ({
        id: `character-${label}`,
        label,
        schemaId: "mock",
        layer: "characters",
        language: "x-mock",
    }));
    const schemas = [
        {
            id: "mock",
            layers: [
                { id: "characters", semanticRole: "atomicWritingUnit" },
                {
                    id: "symbols",
                    semanticRole: "compoundWritingUnit",
                    fields: [{ id: "pronunciation" }],
                    relationships: [
                        { id: "readings", presentationRole: "pronunciation" },
                    ],
                },
            ],
        },
    ];
    const detail = {
        entry: {
            id: "symbol",
            label: "Symbol",
            schemaId: "mock",
            layer: "symbols",
            language: "x-mock",
            fields: { pronunciation: ["unlinked", "ab", "ab"] },
            referenceGroups: {
                readings: [
                    [
                        { entryId: "character-a", position: 0 },
                        { entryId: "character-b", position: 1 },
                    ],
                ],
            },
        },
        references: characters,
    };
    let items = context.detailItems(detail, schemas, "", "", [], characters);
    assert.deepEqual(
        Array.from(
            items.filter((item) => item.actionId),
            (item) => item.actionId,
        ),
        [
            `open-title-reference:${encodeURIComponent(JSON.stringify({ entryId: "character-a" }))}`,
            `open-title-reference:${encodeURIComponent(JSON.stringify({ entryId: "character-b" }))}`,
        ],
    );
    detail.entry.referenceGroups = {};
    detail.references = [];
    items = context.detailItems(detail, schemas, "", "", [], characters);
    assert.deepEqual(
        Array.from(
            items.filter((item) => item.actionId),
            (item) => item.actionId,
        ),
        [
            `open-title-reference:${encodeURIComponent(JSON.stringify({ entryId: "character-a" }))}`,
            `open-title-reference:${encodeURIComponent(JSON.stringify({ entryId: "character-b" }))}`,
        ],
    );
});
