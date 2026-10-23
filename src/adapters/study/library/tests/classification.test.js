import test from "node:test";
import assert from "node:assert/strict";
import {
    createClassificationResolver,
    learnerTagMetadata,
} from "../ui/reuse/classification.js";

const values = ["N5", "N4", "N3", "N2", "N1"];
const schema = {
    id: "language",
    layers: [
        { id: "words", fields: [{ id: "level", type: "string" }] },
        {
            id: "sentences",
            fields: [
                {
                    id: "level",
                    type: "string",
                    derivation: {
                        kind: "rankedReferences",
                        relationships: ["words"],
                        values,
                        requireAll: true,
                        transformationValues: { conditional: "N4" },
                    },
                },
            ],
        },
    ],
    transformSets: [
        {
            id: "verb",
            rules: [
                {
                    id: "conditional",
                    metadata: {
                        labels: { en: "Conditional" },
                    },
                },
            ],
        },
    ],
};
const word = (id, level) => ({
    id,
    schemaId: schema.id,
    layer: "words",
    fields: { level },
});
const sentence = (references, fields = {}) => ({
    id: "sentence",
    schemaId: schema.id,
    layer: "sentences",
    fields,
    references: references.map((reference) =>
        typeof reference === "string"
            ? { entryId: reference, relation: "words" }
            : reference,
    ),
});

function level(entry, words = []) {
    return createClassificationResolver([schema], [...words, entry]).project(
        entry,
    ).fields.level;
}

test("mixed sentences match exactly their hardest required level", () => {
    const words = [
        word("easy", "N5"),
        word("medium", "N4"),
        word("hard", "N3"),
    ];
    assert.equal(level(sentence(["easy", "medium"]), words), "N4");
    assert.equal(level(sentence(["easy", "easy"]), words), "N5");
    assert.equal(level(sentence(["easy", "hard"]), words), "N3");
    assert.equal(level(sentence(["easy"], { level: "N2" }), words), "N2");
});

test("unknown, missing, foreign and cyclic constituents cannot produce deceptively easy matches", () => {
    assert.equal(
        level(sentence(["known", "unknown"]), [
            word("known", "N5"),
            word("unknown"),
        ]),
        undefined,
    );
    assert.equal(level(sentence(["missing"], { level: "N5" })), undefined);
    assert.equal(
        level(sentence(["foreign"]), [
            { ...word("foreign", "N5"), schemaId: "other" },
        ]),
        undefined,
    );
    assert.equal(level(sentence(["sentence"])), undefined);
    assert.equal(level(sentence([])), undefined);
    assert.equal(level(sentence([], { level: "N4" })), undefined);
    assert.equal(
        level(sentence(["easy"], { level: "invalid" }), [word("easy", "N5")]),
        undefined,
    );
});

test("transformed grammar raises the level without materializing cards or mutating base content", () => {
    const source = word("verb", "N5");
    const entry = sentence([
        {
            entryId: "verb",
            relation: "words",
            transformation: { setId: "verb", path: ["conditional"] },
        },
    ]);
    const before = structuredClone([source, entry]);
    assert.equal(level(entry, [source]), "N4");
    assert.deepEqual([source, entry], before);
    source.fields.level = "N3";
    assert.equal(level(entry, [source]), "N3");
    entry.references[0].transformation.path = ["unknown"];
    assert.equal(level(entry, [source]), undefined);
});

test("only explicitly approved tags become localized learner pills", () => {
    const adjective = { labels: { en: "Adjective", ja: "形容詞" } };
    const layer = {
        detail: { tags: [{ value: "adjective", metadata: adjective }] },
    };
    const entry = {
        tags: [
            "adjective",
            "length-form-long",
            "transform:adjective",
            "jlpt-n5",
        ],
    };
    assert.deepEqual(learnerTagMetadata(entry, layer), [adjective]);
    assert.deepEqual(learnerTagMetadata(entry, {}), []);
    assert.deepEqual(entry.tags, [
        "adjective",
        "length-form-long",
        "transform:adjective",
        "jlpt-n5",
    ]);
});
