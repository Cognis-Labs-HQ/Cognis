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
        { id: "variant-of", targetLayer: "characters", variant: true },
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
