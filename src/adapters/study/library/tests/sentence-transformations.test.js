import { orderedReadingReferences } from "../ui/app/reference-readings.js";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";
import * as links from "../ui/app/composition-links.js";
import { referencedTransformation } from "../ui/app/transformations.js";
import {
    restoreCompositionTokens,
    compositionTokenEntryId,
    compositionTokenLabel,
    transformationTokenDetails,
    transformationCompositionToken,
    literalCompositionToken,
} from "../ui/app/composition-tokens.js";

const schema = {
    id: "test-language",
    layers: [
        { id: "words", semanticRole: "lexicalUnit" },
        { id: "particles", semanticRole: "particle" },
        {
            id: "sentences",
            semanticRole: "orderedLexicalSequence",
            fields: [{ id: "pronunciation", type: "stringList" }],
            relationships: [
                {
                    id: "words",
                    targetLayer: "words",
                    resolverRole: "composition",
                    presentationRole: "composition",
                    ordered: true,
                },
                {
                    id: "particles",
                    targetLayer: "particles",
                    resolverRole: "composition",
                    presentationRole: "composition",
                    ordered: true,
                },
            ],
            cardConstructor: { literal_carousels: [{ values: ["！", "、"] }] },
        },
    ],
    transformSets: [
        {
            id: "verb",
            matchTags: ["verb"],
            baseState: "base",
            rules: [
                {
                    id: "polite",
                    fromState: "base",
                    toState: "polite",
                    removeSuffix: "る",
                    append: "ります",
                    pronunciation: { removeSuffix: "る", append: "ります" },
                },
                {
                    id: "negative",
                    fromState: "base",
                    toState: "negative",
                    removeSuffix: "る",
                    append: "りません",
                    pronunciation: { removeSuffix: "る", append: "りません" },
                },
            ],
        },
    ],
};
const noun = {
    id: "water",
    schemaId: schema.id,
    layer: "words",
    label: "水",
    fields: { pronunciation: ["みず"] },
};
const particle = {
    id: "subject",
    schemaId: schema.id,
    layer: "particles",
    label: "は",
    fields: {},
};
const verb = {
    id: "exist",
    schemaId: schema.id,
    layer: "words",
    label: "ある",
    tags: ["verb"],
    fields: { pronunciation: ["ある"] },
};
const entries = [noun, particle, verb];
const descriptor = { setId: "verb", path: ["polite"] };
const sentence = {
    id: "sentence",
    schemaId: schema.id,
    layer: "sentences",
    label: "水はあります！",
    fields: { pronunciation: ["みずはあります"] },
    references: [
        { entryId: noun.id, relation: "words", position: 0 },
        { entryId: particle.id, relation: "particles", position: 1 },
        {
            entryId: verb.id,
            relation: "words",
            position: 2,
            transformation: descriptor,
        },
    ],
};
function load(relativePath, dependencies = {}) {
    const source = readFileSync(new URL(relativePath, import.meta.url), "utf8")
        .replace(/import[\s\S]*?from "[^"]+";\n/g, "")
        .replace(/\bexport /g, "");
    const context = { ...dependencies };
    vm.runInNewContext(source, context);
    return context;
}

test("sentence submission derives the selected transformed verb reading", () => {
    const composer = load("../ui/app/composer-contract.js", {
        referencedTransformation,
        layerForEntry: (schemas, entry) =>
            schemas
                .flatMap(({ layers }) => layers)
                .find(({ id }) => id === entry.layer),
        pronunciationValues: (entry) => entry.fields?.pronunciation ?? [],
    });
    const fields = { pronunciation: ["stale base reading"] };
    composer.applyDerivedPronunciation(
        fields,
        sentence.references,
        entries,
        schema,
        schema.layers[2],
        true,
    );
    assert.equal(fields.pronunciation[0], "みずはあります");
});

test("sentence titles retain transformed deep links around declared punctuation", () => {
    const presentation = load("../ui/app/presentation.js", {
        referencedTransformation,
        ...links,
        orderedReadingReferences,
    });
    const title = presentation.headingCompositionReferences(
        { entry: sentence, references: entries },
        [schema],
    );
    assert.deepEqual(
        Array.from(title, ({ label }) => label),
        ["水", "は", "あります", "！"],
    );
    assert.deepEqual(title[2].referenceTransformation, descriptor);
    const popup = load("../ui/app/popup-title.js");
    const items = popup.popupTitleItems(title);
    assert.equal(items[3].actionId, undefined);
    const target = JSON.parse(
        decodeURIComponent(items[2].actionId.split(":").slice(1).join(":")),
    );
    assert.equal(target.entryId, verb.id);
    assert.deepEqual(target.transformation, descriptor);
});

test("sentence pronunciation links show the reading and open the selected verb form", () => {
    const presentation = load("../ui/app/presentation.js", {
        referencedTransformation,
        ...links,
        orderedReadingReferences,
    });
    const popup = load("../ui/app/popup-title.js", {
        ...links,
        orderedReadingReferences,
        referencedTransformation,
        layerForEntry: presentation.layerForEntry,
        pronunciationValues: presentation.pronunciationValues,
        secondarySpellingGroups: () => [],
        visibleTitleDefinition: () => "",
    });
    const items = popup.popupTitleDetailItems(
        { entry: sentence, references: entries },
        [schema],
        "",
        "",
        [],
        entries,
    );
    assert.equal(items.map(({ label }) => label).join(""), "みずはあります");
    const target = JSON.parse(
        decodeURIComponent(items.at(-1).actionId.split(":").slice(1).join(":")),
    );
    assert.equal(target.entryId, verb.id);
    assert.deepEqual(target.transformation, descriptor);
});

test("ordered sentence references preserve repeated verbs with different transformations", () => {
    const source = readFileSync(
        new URL("../ui/app/admin-interactions/editor-body.js", import.meta.url),
        "utf8",
    );
    const start = source.indexOf("export function readReferences(");
    const end = source.indexOf("export function readReferenceGroups", start);
    const context = { compositionTokenEntryId, transformationTokenDetails };
    vm.runInNewContext(
        source.slice(start, end).replace(/\bexport /g, ""),
        context,
    );
    const polite = referencedTransformation(verb, schema, descriptor);
    const negative = referencedTransformation(verb, schema, {
        setId: "verb",
        path: ["negative"],
    });
    const tokens = [
        transformationCompositionToken(verb.id, polite.set.id, polite.node),
        literalCompositionToken("、"),
        transformationCompositionToken(verb.id, negative.set.id, negative.node),
    ];
    const references = context.readReferences(
        {
            elements: {
                "relationship:words": { selectedOptions: [{ value: verb.id }] },
            },
        },
        schema.layers[2],
        tokens,
    );
    assert.equal(references.length, 2);
    assert.deepEqual(
        Array.from(references, ({ position }) => position),
        [0, 2],
    );
    assert.deepEqual(
        Array.from(references, ({ transformation }) =>
            Array.from(transformation.path),
        ),
        [["polite"], ["negative"]],
    );
});

test("editing retains transformed text when rebuilding the label from selected root cards", () => {
    const source = readFileSync(
        new URL("../ui/app/admin-interactions/index.js", import.meta.url),
        "utf8",
    );
    const start = source.indexOf("function syncGeneratedCardLabel(");
    const end = source.indexOf(
        "async function createRelationshipDependency",
        start,
    );
    const context = { compositionTokenEntryId, compositionTokenLabel };
    vm.runInNewContext(source.slice(start, end), context);
    const polite = referencedTransformation(verb, schema, descriptor);
    const token = transformationCompositionToken(
        verb.id,
        polite.set.id,
        polite.node,
    );
    const form = {
        compositionOrder: [
            noun.id,
            particle.id,
            token,
            literalCompositionToken("！"),
        ],
        elements: {
            label: { value: "" },
            "relationship:words": {
                selectedOptions: [{ value: noun.id }, { value: verb.id }],
            },
            "relationship:particles": {
                selectedOptions: [{ value: particle.id }],
            },
        },
    };
    context.syncGeneratedCardLabel(
        form,
        new Set(["words", "particles"]),
        entries,
    );
    assert.equal(form.elements.label.value, "水はあります！");
});

test("editing restores literal separators between two transformations of one verb", () => {
    const entry = {
        label: "水はあります、ありません！",
        references: [
            { entryId: noun.id, relation: "words", position: 0 },
            { entryId: particle.id, relation: "particles", position: 1 },
            {
                entryId: verb.id,
                relation: "words",
                position: 2,
                transformation: { setId: "verb", path: ["polite"] },
            },
            {
                entryId: verb.id,
                relation: "words",
                position: 4,
                transformation: { setId: "verb", path: ["negative"] },
            },
        ],
    };
    const tokens = restoreCompositionTokens(
        entry,
        entries,
        schema.layers[2].cardConstructor,
        new Set(["words", "particles"]),
        schema,
    );
    assert.equal(
        tokens.map((token) => compositionTokenLabel(token, entries)).join(""),
        entry.label,
    );
    assert.equal(tokens[3], literalCompositionToken("、"));
});
