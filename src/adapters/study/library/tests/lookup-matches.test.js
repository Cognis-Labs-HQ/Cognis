import assert from "node:assert/strict";
import test from "node:test";
import { groupLookupSuggestions } from "../ui/app/create-entry/lookup-matches.js";

const layer = {
    relationships: [{ id: "readings", presentationRole: "pronunciation" }],
};
const match = (reading, confidence = 1) => ({
    label: "年",
    confidence,
    fields: { pronunciation: [reading], dictionary_data: reading },
    referenceGroups: {
        readings: [[{ entryId: "reading", relation: "readings" }]],
    },
    linkedEntries: [
        {
            key: "reading",
            entry: {
                hidden: true,
                layer: "words",
                label: reading,
                referenceGroups: {
                    kana: [[{ entryId: reading, relation: "kana" }]],
                },
            },
        },
    ],
    definitions: [{ translations: { en: reading } }],
});
test("combined readings retain separate hidden aliases and canonical Kana links", () => {
    const inputs = [match("とし", 0.9), match("ねん", 1), match("ねん", 0.8)];
    const before = structuredClone(inputs);
    const [result] = groupLookupSuggestions(inputs, layer);
    assert.deepEqual(inputs, before);
    assert.deepEqual(result.fields.pronunciation, ["ねん", "とし"]);
    assert.equal(result.referenceGroups.readings.length, 2);
    assert.equal(result.linkedEntries.length, 2);
    const nodes = new Map(
        result.linkedEntries.map(({ key, entry }) => [key, entry]),
    );
    assert.deepEqual(
        result.referenceGroups.readings.map(
            ([reference]) => nodes.get(reference.entryId).label,
        ),
        ["ねん", "とし"],
    );
    assert.equal(result.definitions.length, 2);
    assert.equal(JSON.parse(result.fields.dictionary_data).records.length, 3);
});
