import { pronunciationClass } from "../../../../gateways/study/ui/reuse/pronunciation.js";
import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import { escapeHtml } from "../../../../ui/reuse/escape-html.js";

const context = { escapeHtml, pronunciationClass };
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

test("practice answers escape imported text", () => {
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
        "en",
        (_entry, text) => escapeHtml(text),
    );
    assert.match(html, /&lt;script&gt;/);
    assert.match(html, /&lt;img onerror=/);
});

test("both deck surfaces preserve imported note identity and answer context", () => {
    const notes = [
        {
            id: "one",
            front: "Question",
            back: "Answer",
            pronunciation: "Reading",
        },
    ];
    const [detail] = context.noteDetails(notes);
    assert.equal(detail.entry.id, "one");
    const values = context.flashcardValues(detail);
    assert.equal(values.front, "Question");
    assert.equal(values.back, "Answer");
    assert.equal(values.pronunciation, "Reading");
    detail.entry.fields.definition = "Changed";
    assert.equal(notes[0].back, "Answer");
});

test("the front contains the question while the flipside owns pronunciation and meaning", () => {
    const detail = {
        entry: {
            id: "word",
            label: "dog",
            schemaId: "language",
            layer: "word",
            fields: { pronunciation: ["/dɒɡ/"], definition: "a canine" },
        },
        references: [],
    };
    const link = (_entry, label) => label;
    const front = context.renderFlashcard(detail, schemas, "en", link, "front");
    assert.ok(front.includes("dog"));
    assert.ok(!front.includes("/dɒɡ/"));
    assert.ok(!front.includes("a canine"));
    const back = context.renderFlashcard(detail, schemas, "en", link, "back");
    assert.ok(back.includes("/dɒɡ/"));
    assert.ok(back.includes("a canine"));
});
