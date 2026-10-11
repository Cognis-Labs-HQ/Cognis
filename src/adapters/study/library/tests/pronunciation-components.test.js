import assert from "node:assert/strict";
import test from "node:test";
import { pronunciationComponents } from "../ui/app/pronunciation-components.js";
const schema = {
    layers: [
        { id: "kana", semanticRole: "atomicWritingUnit" },
        {
            id: "words",
            relationships: [
                {
                    id: "kana",
                    targetLayer: "kana",
                    presentationRole: "pronunciation",
                },
            ],
        },
    ],
};
const kana = [
    { id: "ne", layer: "kana", label: "ね" },
    { id: "n", layer: "kana", label: "ん" },
];
const reading = {
    layer: "words",
    label: "ねん",
    referenceGroups: { kana: [[{ entryId: "ne" }, { entryId: "n" }]] },
};
for (const draft of [true, false]) {
    test(`${draft ? "proposed" : "committed"} hidden readings expose their individual Kana components`, () => {
        const form = {
            referenceGroups: { readings: [[{ entryId: "reading" }]] },
            libraryLinkedEntries: draft
                ? [{ key: "reading", entry: reading }]
                : [],
        };
        const entries = draft ? kana : [...kana, { ...reading, id: "reading" }];
        assert.deepEqual(
            pronunciationComponents(form, "ねん", 0, entries, schema),
            [
                { id: "ne", label: "ね" },
                { id: "n", label: "ん" },
            ],
        );
        assert.deepEqual(
            pronunciationComponents(form, "ね", 0, entries, schema),
            [],
        );
    });
}
test("unknown or cyclic hidden readings cannot create guessed pronunciation links", () => {
    const form = { referenceGroups: { readings: [[{ entryId: "cycle" }]] } };
    const cyclicSchema = {
        layers: [
            {
                id: "words",
                relationships: [
                    { id: "readings", presentationRole: "pronunciation" },
                ],
            },
        ],
    };
    const entries = [
        {
            id: "cycle",
            layer: "words",
            references: [{ entryId: "cycle", relation: "readings" }],
        },
    ];
    assert.deepEqual(
        pronunciationComponents(form, "ねん", 0, entries, cyclicSchema),
        [],
    );
});
