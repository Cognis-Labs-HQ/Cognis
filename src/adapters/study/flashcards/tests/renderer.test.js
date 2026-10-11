import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import { escapeHtml } from "../../../../ui/reuse/escape-html.js";

const context = { escapeHtml };
vm.createContext(context);
vm.runInContext(
    readFileSync(new URL("../ui/reuse/flashcard.js", import.meta.url), "utf8")
        .replace(/^import.*;$/gm, "")
        .replaceAll("export function", "function"),
    context,
);
const schemas = [
    {
        id: "language",
        layers: [
            { id: "word" },
            {
                id: "meaning",
                semanticRole: "definition",
                definitionLocalization: { translationsField: "translations" },
            },
        ],
    },
];

test("flashcards render both related definitions and definition-layer cards in the viewer language", () => {
    const definition = {
        id: "meaning",
        schemaId: "language",
        layer: "meaning",
        label: "room",
        fields: { translations: { en: "room", de: "Zimmer" } },
    };
    assert.equal(
        context.flashcardValues(
            { entry: definition, references: [] },
            schemas,
            "de",
        ).back,
        "Zimmer",
    );
    const word = {
        id: "word",
        schemaId: "language",
        layer: "word",
        label: "室",
        fields: { pronunciation: ["しつ"] },
    };
    const values = context.flashcardValues(
        { entry: word, references: [definition] },
        schemas,
        "de",
    );
    assert.equal(values.back, "Zimmer");
    assert.equal(values.pronunciation, "しつ");
});

test("flashcards escape imported text and keep recall grading disabled until reveal", () => {
    const html = context.renderFlashcard(
        {
            entry: {
                id: "note",
                label: "<script>bad()</script>",
                fields: { definition: '<img onerror="bad()">' },
            },
            references: [],
        },
        [],
        [],
        { t: (key) => key },
        "en",
    );
    assert.match(html, /&lt;script&gt;/);
    assert.match(html, /disabled data-flashcard-grade="good"/);
    assert.match(html, /aria-pressed="false"/);
});
