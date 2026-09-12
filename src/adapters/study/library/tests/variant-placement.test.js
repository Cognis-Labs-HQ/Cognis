import assert from "node:assert/strict";
import test from "node:test";
import {
    assignVariantPlacements,
    isSameLibraryRecord,
    variantPlacement,
} from "../ui/app/variant-placement.js";

const layer = {
    id: "characters",
    relationships: [
        {
            id: "variant-of",
            targetLayer: "characters",
            variant: true,
            child: true,
        },
    ],
};
const schema = { id: "japanese", layers: [layer] };

function entry(id, overrides = {}) {
    return {
        id,
        schemaId: "japanese",
        layer: "characters",
        language: "ja",
        label: "い",
        fields: { pronunciation: "i" },
        references: [],
        ...overrides,
    };
}

test("duplicate representations cannot become variants of themselves", () => {
    const parent = entry("canonical-i", { sourceRecordId: "i" });
    const duplicate = entry("duplicate-i", {
        references: [{ entryId: parent.id, relation: "variant-of" }],
    });
    assert.equal(isSameLibraryRecord(duplicate, parent), true);
    assert.equal(
        variantPlacement(duplicate, schema, [parent, duplicate]),
        null,
    );
    assert.equal(
        assignVariantPlacements([parent, duplicate], schema, layer).size,
        0,
    );
});

test("genuine variants retain placement when their content differs", () => {
    const parent = entry("canonical-i", { sourceRecordId: "i" });
    const child = entry("small-i", {
        label: "ぃ",
        fields: { pronunciation: "xi" },
        references: [{ entryId: parent.id, relation: "variant-of" }],
    });
    assert.deepEqual(variantPlacement(child, schema, [parent, child]), {
        parentId: parent.id,
    });
    assert.equal(
        assignVariantPlacements([parent, child], schema, layer).has(child.id),
        true,
    );
});

test("orphaned variant references do not create phantom children", () => {
    const orphan = entry("orphan", {
        references: [{ entryId: "missing", relation: "variant-of" }],
    });
    assert.equal(variantPlacement(orphan, schema, [orphan]), null);
});

test("variants do not become child cards unless the schema opts in", () => {
    const parent = entry("canonical-i", { sourceRecordId: "i" });
    const alternative = entry("alternative-i", {
        label: "ぃ",
        references: [{ entryId: parent.id, relation: "variant-of" }],
    });
    const withoutChildren = {
        ...schema,
        layers: [
            {
                ...layer,
                relationships: layer.relationships.map((relationship) => ({
                    ...relationship,
                    child: false,
                })),
            },
        ],
    };
    assert.equal(
        variantPlacement(alternative, withoutChildren, [parent, alternative]),
        null,
    );
});

test("variant branches choose a direction with visible room for descendants", () => {
    const parent = entry("parent", { sourceRecordId: "parent" });
    const child = entry("child", {
        label: "child",
        references: [{ entryId: parent.id, relation: "variant-of" }],
    });
    const grandchild = entry("grandchild", {
        label: "grandchild",
        references: [{ entryId: child.id, relation: "variant-of" }],
    });
    const gridLayer = {
        ...layer,
        grid: {
            rowSize: 5,
            items: [
                null,
                null,
                null,
                null,
                null,
                null,
                "parent",
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                null,
            ],
        },
    };
    const placements = assignVariantPlacements(
        [parent, child, grandchild],
        { ...schema, layers: [gridLayer] },
        gridLayer,
    );
    assert.equal(placements.get(child.id)?.direction, "right");
    assert.equal(placements.get(grandchild.id)?.direction, "right");
    assert.deepEqual(placements.get(grandchild.id)?.offset, {
        column: 2,
        row: 0,
    });
});

test("nested branches can reuse a pruned alternate branch slot", () => {
    const parent = entry("parent", { sourceRecordId: "parent" });
    const firstChild = entry("first-child", {
        label: "first child",
        references: [{ entryId: parent.id, relation: "variant-of" }],
    });
    const alternateChildren = Array.from({ length: 4 }, (_, index) =>
        entry(`alternate-child-${index}`, {
            label: `alternate child ${index}`,
            references: [{ entryId: parent.id, relation: "variant-of" }],
        }),
    );
    const grandchild = entry("grandchild", {
        label: "grandchild",
        references: [{ entryId: firstChild.id, relation: "variant-of" }],
    });
    const gridLayer = {
        ...layer,
        grid: {
            rowSize: 3,
            items: [null, null, null, null, "parent", null, null, null, null],
        },
    };
    const placements = assignVariantPlacements(
        [parent, firstChild, ...alternateChildren, grandchild],
        { ...schema, layers: [gridLayer] },
        gridLayer,
    );

    assert.equal(placements.get(firstChild.id)?.direction, "up");
    assert.deepEqual(placements.get(grandchild.id)?.offset, {
        column: -1,
        row: -1,
    });
    assert.deepEqual(
        placements.get(grandchild.id)?.offset,
        placements.get(alternateChildren[3].id)?.offset,
    );
});
