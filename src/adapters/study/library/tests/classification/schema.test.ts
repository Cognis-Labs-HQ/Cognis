import assert from "node:assert/strict";
import test from "node:test";
import { libraryFailure } from "../../routes/failures.js";
import { validateLibrarySchema } from "../../layers.js";
import { mockLanguageSchema } from "../fixtures/mock-language.js";

function classifiedSchema() {
    const schema = structuredClone(mockLanguageSchema);
    for (const layer of schema.layers.filter(({ id }) =>
        ["words", "sentences"].includes(id),
    )) {
        layer.fields = [
            ...(layer.fields ?? []),
            {
                id: "level",
                type: "string",
                metadata: { labels: { en: "Level" } },
                input: { control: "singleSelect" },
                detail: {
                    renderer: "badge",
                    filterable: true,
                    autoSelectSingle: false,
                },
                ...(layer.id === "sentences"
                    ? {
                          derivation: {
                              kind: "rankedReferences" as const,
                              relationships: ["words"],
                              values: ["basic", "advanced"],
                              requireAll: true,
                          },
                      }
                    : {}),
            },
        ];
    }
    schema.layers[1].detail = {
        tags: [{ value: "noun", metadata: { labels: { en: "Noun" } } }],
    };
    return schema;
}

test("ranked references and curated display tags survive schema validation", () => {
    const schema = classifiedSchema();
    assert.deepEqual(validateLibrarySchema(schema), schema);
});

test("classification schemas reject invalid ranks, foreign fields and unlocalized tags", () => {
    for (const mutation of [
        (schema: ReturnType<typeof classifiedSchema>) => {
            schema.layers[1].detail!.tags = [
                { value: "noun", metadata: { labels: {} } },
            ];
        },
        (schema: ReturnType<typeof classifiedSchema>) => {
            const field = schema.layers
                .find(({ id }) => id === "sentences")!
                .fields!.at(-1)!;
            field.derivation!.values = ["basic", "basic"];
        },
        (schema: ReturnType<typeof classifiedSchema>) => {
            const field = schema.layers
                .find(({ id }) => id === "sentences")!
                .fields!.at(-1)!;
            field.derivation!.relationships = ["missing"];
        },
        (schema: ReturnType<typeof classifiedSchema>) => {
            const field = schema.layers
                .find(({ id }) => id === "sentences")!
                .fields!.at(-1)!;
            field.derivation!.transformationValues = { unknown: "advanced" };
        },
    ]) {
        const schema = classifiedSchema();
        mutation(schema);
        assert.throws(
            () => validateLibrarySchema(schema),
            /display_tag_metadata_required|invalid_field_derivation/,
        );
    }
});

test("classification validation failures remain safe actionable client errors", () => {
    for (const code of [
        "invalid_display_tag",
        "display_tag_metadata_required",
        "invalid_filter_single_selection",
        "invalid_field_derivation",
    ]) {
        assert.deepEqual(libraryFailure(new Error(`${code}:private details`)), {
            code,
            status: 400,
        });
    }
});
