import assert from "node:assert/strict";
import test from "node:test";
import {
    generatedTransformationCard,
    transformationPathways,
    referencedTransformation,
} from "../ui/reuse/transformations.js";

function fixture() {
    const schema = {
        layers: [
            {
                id: "words",
                fields: [
                    { id: "audio", type: "audio" },
                    { id: "stroke", type: "strokePattern" },
                ],
            },
        ],
        transformSets: [
            {
                id: "verb",
                flag: "transform:verb",
                matchTags: ["verb"],
                baseState: "base",
                rules: [
                    {
                        id: "past",
                        fromState: "base",
                        toState: "past",
                        removeSuffix: "",
                        append: "ed",
                        forms: {
                            run: {
                                removeSuffix: "run",
                                append: "ran",
                                pronunciation: {
                                    removeSuffix: "/rʌn/",
                                    append: "/ræn/",
                                },
                            },
                        },
                    },
                    {
                        id: "continuous",
                        fromState: "base",
                        toState: "continuous",
                        removeSuffix: "",
                        append: "ing",
                        forms: {
                            run: {
                                removeSuffix: "run",
                                append: "running",
                                pronunciation: {
                                    removeSuffix: "/rʌn/",
                                    append: "/rʌnɪŋ/",
                                },
                            },
                        },
                    },
                    {
                        id: "desire",
                        fromState: "base",
                        toState: "desire",
                        removeSuffix: "",
                        append: "",
                        prepend: "want to ",
                        pronunciation: {
                            removeSuffix: "",
                            append: "",
                            removePrefix: "/",
                            prepend: "/wɒnt tə ",
                        },
                    },
                    {
                        id: "desire-past",
                        fromState: "desire",
                        toState: "desire-past",
                        removeSuffix: "",
                        append: "",
                        removePrefix: "want to ",
                        prepend: "wanted to ",
                        pronunciation: {
                            removeSuffix: "",
                            append: "",
                            removePrefix: "/wɒnt tə ",
                            prepend: "/wɒntɪd tə ",
                        },
                    },
                ],
            },
        ],
    };
    const entry = {
        id: "base",
        schemaId: "fixture",
        layer: "words",
        label: "run",
        tags: ["verb", "transform:verb"],
        fields: {
            pronunciation: ["/rʌn/"],
            audio: "file:root",
            stroke: { columns: 3 },
            images: ["image"],
        },
    };
    return { entry, schema };
}

test("the source flag alone enables chained multiword and irregular variants", () => {
    const { entry, schema } = fixture();
    assert.deepEqual(
        transformationPathways({ ...entry, tags: ["verb"] }, schema),
        [],
    );
    assert.deepEqual(
        transformationPathways(entry, schema)[0].nodes.map(
            ({ value }) => value,
        ),
        ["run", "ran", "running", "want to run", "wanted to run"],
    );
    assert.equal(
        referencedTransformation(entry, schema, {
            setId: "verb",
            path: ["desire", "desire-past"],
        }).node.pronunciation,
        "/wɒntɪd tə rʌn/",
    );
});

test("generated projections preserve source identity and images while clearing root media", () => {
    const { entry, schema } = fixture();
    const descriptor = { setId: "verb", path: ["continuous"] };
    const generated = generatedTransformationCard(entry, schema, descriptor);
    assert.equal(generated.id, entry.id);
    assert.equal(generated.label, "running");
    assert.deepEqual(generated.fields.pronunciation, ["/rʌnɪŋ/"]);
    assert.deepEqual(generated.referenceTransformation, descriptor);
    assert.deepEqual(generated.fields.images, ["image"]);
    assert.equal(generated.fields.audio, undefined);
    assert.equal(generated.fields.stroke, undefined);
    assert.equal(generated.canEdit, false);
    assert.equal(generated.canDelete, false);
    assert.equal(entry.fields.audio, "file:root");
    assert.throws(
        () =>
            generatedTransformationCard(
                { ...entry, tags: ["verb"] },
                schema,
                descriptor,
            ),
        /invalid_reference_transformation/,
    );
});

test("generic operations select spelling and reading suffixes without inheriting them into overrides", () => {
    const { entry, schema } = fixture();
    const rule = schema.transformSets[0].rules[0];
    rule.suffixes = [{ removeSuffix: "y", append: "ied" }];
    rule.prepend = "generic ";
    assert.equal(
        referencedTransformation(entry, schema, {
            setId: "verb",
            path: ["past"],
        }).node.value,
        "ran",
    );
    delete rule.prepend;
    assert.equal(
        referencedTransformation(
            { ...entry, label: "try", fields: { pronunciation: ["try"] } },
            schema,
            { setId: "verb", path: ["past"] },
        ).node.value,
        "tried",
    );
    assert.equal(
        referencedTransformation(
            {
                ...entry,
                label: "constructor",
                fields: { pronunciation: ["constructor"] },
            },
            schema,
            { setId: "verb", path: ["past"] },
        ).node.value,
        "constructored",
    );
});

test("definition interpolation leaves placeholders in inserted definitions opaque", async () => {
    const { transformedDefinition } =
        await import("../ui/reuse/transformations.js");
    const node = {
        rule: {
            definitionTransform: { template: "{{ definition }} / {{ stem }}" },
        },
    };
    assert.equal(
        transformedDefinition("{{ suffix }}", node, "en"),
        "{{ suffix }} / {{ suffix }}",
    );
});
