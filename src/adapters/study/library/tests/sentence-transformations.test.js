import * as entryGraph from "../ui/reuse/entry-graph.js";
import * as offlineState from "../../../../ui/reuse/offline-state.js";
import { loadLibraryUiModule } from "./reuse/ui-module.ts";
import { loadTestModule } from "../../../../tooling/reuse/test-module.ts";
import { orderedReadingReferences } from "../ui/app/reference-readings.js";
import assert from "node:assert/strict";
import test from "node:test";
import vm from "node:vm";
import * as links from "../ui/app/composition-links.js";
import { referencedTransformation } from "../ui/reuse/transformations.js";
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
            flag: "verb",
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
    const imports = {
        "../ui/app/composer-contract.js": {
            "./reuse/readings.js": dependencies,
            "./presentation.js": dependencies,
            "../reuse/transformations.js": dependencies,
        },
        "../ui/app/presentation.js": {
            "./audio-media-session.js": dependencies,
            "/static/reuse/toast.js": dependencies,
            "/static/reuse/ui-ctx.js": dependencies,
            "/static/reuse/escape-html.js": dependencies,
            "/static/reuse/group-by.js": dependencies,
            "/static/gateways/study/library-client.js": dependencies,
            "/static/gateways/study/language.js": dependencies,
            "../reuse/transformations.js": dependencies,
            "./composition-links.js": dependencies,
        },
        "../ui/app/popup-title.js": {
            "./reuse/readings.js": dependencies,
            "./presentation.js": dependencies,
            "./composition-links.js": dependencies,
            "./title-definition.js": dependencies,
            "./popup-spellings.js": dependencies,
            "./variant-placement.js": dependencies,
            "./reference-readings.js": dependencies,
        },
    };
    return loadTestModule(
        new URL(relativePath, import.meta.url),
        {
            ...imports[relativePath],
            "../reuse/entry-graph.js": entryGraph,
            "/static/reuse/offline-state.js": offlineState,
        },
        dependencies,
    );
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
    const context = { compositionTokenEntryId, transformationTokenDetails };
    Object.assign(
        context,
        loadLibraryUiModule("app/admin-interactions/editor-body.js", context),
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

test("editing retains transformed text when rebuilding the label from selected root cards", async () => {
    const context = {
        AbortController,
        structuredClone,
        compositionTokenEntryId,
        compositionTokenLabel,
        resolveComposerContract: () => ({
            layer: schema.layers[2],
            constructor: {},
            inputCarouselIds: new Set(["words", "particles"]),
        }),
        editorBody: () => ({ html: "", builder: { attach: () => ({}) } }),
        renderComposerExtras: () => "",
        pronunciationRelationshipsFor: () => [],
        restoreCompositionTokens: () => form.compositionOrder,
        bindDefinitionRemoval() {},
        bindComposerExtras() {},
        mountEditableRelationshipCarousels() {},
        LIBRARY_COMPOSER_LIMITS: { tags: 12 },
        bindTabbedFormValidation: () => ({}),
        bindTransformationOptIns() {},
        bindAudioUploads() {},
        bindReferenceImageUploads() {},
        bindAudioEditor() {},
        renderStrokePatternPreviews() {},
        openPopup: async (options) => {
            options.onOpen({ querySelector: () => form });
            return "cancel";
        },
    };
    Object.assign(
        context,
        loadTestModule(
            new URL("../ui/app/admin-interactions/index.js", import.meta.url),
            {
                "../reference-images.js": context,
                "../audio-upload.js": context,
                "../audio-editor.js": context,
                "../transformation-opt-ins.js": context,
                "../reuse/definition-actions.js": context,
                "../composition-activation.js": context,
                "/static/reuse/escape-html.js": context,
                "/static/reuse/popup.js": context,
                "/static/reuse/toast.js": context,
                "/static/reuse/form-builder.js": context,
                "/static/reuse/horizontal-carousel.js": context,
                "/static/reuse/composition-input.js": context,
                "/static/reuse/ui-ctx.js": context,
                "/static/reuse/error-reporting.js": context,
                "/static/gateways/study/library-client.js": context,
                "../presentation.js": context,
                "../editability.js": context,
                "../pronunciation-editor.js": context,
                "../composer-contract.js": context,
                "../composer-limits.js": context,
                "../composer-extras.js": context,
                "../composition-tokens.js": context,
                "../field-input.js": context,
                "../../reuse/transformations.js": context,
                "./editor-body.js": context,
            },
            context,
        ),
    );
    const polite = referencedTransformation(verb, schema, descriptor);
    const token = transformationCompositionToken(
        verb.id,
        polite.set.id,
        polite.node,
    );
    const form = {
        querySelectorAll: () => [],
        querySelector: () => null,
        addEventListener() {},
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
    await context.openLibraryEntryEditor({
        entry: sentence,
        entries,
        schemas: [schema],
        i18n: { t: (key) => key },
    });
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

test("spaced sentence titles preserve canonical word, punctuation, and transformation links", () => {
    const englishSchema = {
        ...schema,
        transformSets: [
            {
                id: "noun-number",
                flag: "plural",
                matchTags: ["plural"],
                baseState: "singular",
                rules: [
                    {
                        id: "plural",
                        fromState: "singular",
                        toState: "plural",
                        removeSuffix: "dog",
                        append: "dogs",
                    },
                ],
            },
        ],
    };
    const words = [
        { id: "subject", schemaId: schema.id, layer: "words", label: "I" },
        { id: "verb", schemaId: schema.id, layer: "words", label: "like" },
        {
            id: "noun",
            schemaId: schema.id,
            layer: "words",
            label: "dog",
            tags: ["plural"],
        },
        { id: "period", schemaId: schema.id, layer: "particles", label: "." },
    ];
    const plural = { setId: "noun-number", path: ["plural"] };
    const record = {
        id: "english-sentence",
        schemaId: schema.id,
        layer: "sentences",
        label: "I like dogs.",
        references: words.map((entry, position) => ({
            entryId: entry.id,
            relation: entry.layer,
            position,
            ...(entry.id === "noun" ? { transformation: plural } : {}),
        })),
    };
    const presentation = load("../ui/app/presentation.js", {
        referencedTransformation,
        ...links,
        orderedReadingReferences,
    });
    const title = presentation.headingCompositionReferences(
        { entry: record, references: words },
        [englishSchema],
    );
    assert.equal(
        Array.from(title, ({ label }) => label).join(""),
        record.label,
    );
    assert.deepEqual(
        Array.from(title)
            .filter(({ id }) => id)
            .map(({ id }) => id),
        words.map(({ id }) => id),
    );
    const popup = load("../ui/app/popup-title.js");
    const items = popup.popupTitleItems(title);
    const dog = items.find(({ label }) => label === "dogs");
    const target = JSON.parse(
        decodeURIComponent(dog.actionId.split(":").slice(1).join(":")),
    );
    assert.equal(target.entryId, "noun");
    assert.deepEqual(target.transformation, plural);
    assert.ok(
        items
            .filter(({ label }) => label === " ")
            .every(({ actionId }) => actionId === undefined),
    );
    assert.deepEqual(
        Array.from(
            presentation.headingCompositionReferences(
                {
                    entry: { ...record, label: "I really like dogs." },
                    references: words,
                },
                [englishSchema],
            ),
        ),
        [],
    );
});

test("explicit unresolved forms reject editing and reading instead of substituting roots", () => {
    const broken = structuredClone(sentence);
    broken.references[2].transformation.path = ["unknown"];
    assert.throws(
        () =>
            orderedReadingReferences({ entry: broken, references: entries }, [
                schema,
            ]),
        /invalid_reference_transformation/,
    );
    assert.throws(
        () =>
            restoreCompositionTokens(
                broken,
                entries,
                schema.layers[2].cardConstructor,
                new Set(["words", "particles"]),
                schema,
            ),
        /invalid_reference_transformation/,
    );
});
