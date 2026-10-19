import assert from "node:assert/strict";
import test from "node:test";
import vm from "node:vm";
import { readFileSync } from "node:fs";
import { entryExploreUrl } from "../../../../gateways/study/ui/reuse/explore.js";
import { uiCtx } from "../../../../ui/reuse/ui-ctx.js";
import { similarEntries } from "../../../../gateways/study/ui/reuse/similar-items.js";
import { drawingPattern } from "../../../../gateways/study/ui/reuse/drawing-pattern.js";
import { isCardDue } from "../ui/reuse/review.js";

function loadModule(path, context) {
    const source = readFileSync(new URL(path, import.meta.url), "utf8")
        .replace(/^import[\s\S]*?;\n/gm, "")
        .replace(/export (async )?function/g, "$1function")
        .replaceAll("export const", "const");
    vm.runInContext(source, context);
}

const environment = vm.createContext({
    Date,
    crypto: globalThis.crypto,
    uiCtx,
    similarEntries,
    drawingPattern,
    isCardDue,
    escapeHtml: String,
});
loadModule("../../../../gateways/study/ui/reuse/pronunciation.js", environment);
loadModule("../ui/reuse/flashcard.js", environment);
loadModule("../../../../gateways/study/ui/reuse/action-flows.js", environment);
loadModule("../ui/app/flashcards/actions.js", environment);
loadModule("../ui/app/flashcards/practice-model.js", environment);

const cards = ["new", "overdue", "scheduled", "invalid"].map((id) => ({
    entry: { id },
}));
const progress = {
    overdue: { due: "2026-10-10" },
    scheduled: { due: "2026-10-12" },
    invalid: { due: "invalid" },
};
const now = Date.parse("2026-10-11");

test("practice summary partitions new, due, and done without counting new cards as due", () => {
    assert.deepEqual(
        JSON.parse(
            JSON.stringify(environment.practiceSummary(cards, progress, now)),
        ),
        { total: 4, done: 1, due: 2, new: 1 },
    );
    for (const [filter, expected] of Object.entries({
        total: 4,
        new: 1,
        due: 2,
        done: 1,
    }))
        assert.equal(
            environment.practiceQueue(cards, progress, filter, now).length,
            expected,
        );
});

test("every supported browser deck action executes registered ctx stages and respects cancellation", async () => {
    const actions = vm.runInContext("DECK_ACTIONS", environment);
    for (const action of actions) {
        const stages = [];
        for (const stage of ["before", "after"])
            uiCtx.extendFlow(
                `study:decks:${action}`,
                stage,
                { id: `test:${action}:${stage}` },
                () => stages.push(stage),
            );
        const result = await vm.runInContext("runDeckAction", environment)(
            action,
            () => {
                stages.push("execute");
                return 42;
            },
        );
        assert.equal(result, 42);
        assert.deepEqual(stages, ["before", "execute", "after"]);
        const controller = new AbortController();
        controller.abort();
        let calls = 0;
        await vm.runInContext("runDeckAction", environment)(
            action,
            () => calls++,
            controller.signal,
        );
        assert.equal(calls, 0);
        for (const stage of ["before", "after"])
            uiCtx.removeFlowHook(
                `study:decks:${action}`,
                stage,
                `test:${action}:${stage}`,
            );
    }
    await assert.rejects(
        vm.runInContext("runDeckAction", environment)("unregistered", () => 1),
    );
});

test("reading choices resolve localized definitions by Library ID and reflect edited meanings", () => {
    const schemas = [
        {
            id: "ja",
            layers: [
                { id: "words", semanticRole: "lexicalUnit" },
                {
                    id: "meanings",
                    semanticRole: "definition",
                    fields: [{ id: "text", type: "localizedText" }],
                },
            ],
        },
    ];
    const meanings = ["word", "water", "school", "cat", "word"].map(
        (text, index) => ({
            id: `meaning-${index}`,
            schemaId: "ja",
            layer: "meanings",
            fields: { text: { en: text, de: `de-${text}` } },
        }),
    );
    const words = meanings.map((meaning, index) => ({
        id: `word-${index}`,
        label: `言葉${index}`,
        schemaId: "ja",
        layer: "words",
        language: "ja",
        fields: { pronunciation: ["ことば"] },
        references: [{ entryId: meaning.id }],
    }));
    const detail = { entry: words[0], references: [meanings[0]] };
    const entries = [...words, ...meanings];
    const choices = environment.readingChoices(detail, entries, schemas, "en");
    assert.equal(choices.length, 4);
    assert.equal(new Set(choices.map(({ text }) => text)).size, 4);
    assert.equal(choices.filter(({ correct }) => correct).length, 1);
    assert.equal(choices.find(({ correct }) => correct).text, "word");
    assert.equal(choices.find(({ correct }) => correct).entryId, words[0].id);
    meanings[0].fields.text.de = "Wort";
    assert.equal(
        environment
            .readingChoices(detail, entries, schemas, "de")
            .find(({ correct }) => correct).text,
        "Wort",
    );
    assert.equal(
        environment.readingChoices(detail, words.slice(0, 2), schemas, "en")
            .length,
        0,
    );
});

function practiceHarness(filter, status = "due", options = {}) {
    const nodes = new Map();
    const target = {
        innerHTML: "",
        querySelector(selector) {
            if (!nodes.has(selector))
                nodes.set(selector, {
                    dataset: {},
                    hidden: selector === "[data-practice-back]",
                    disabled: false,
                    setAttribute(name, value) {
                        this[name] = value;
                    },
                });
            return nodes.get(selector);
        },
        querySelectorAll: () => [],
        addEventListener(event, handler) {
            if (event === "click") this.click = handler;
        },
    };
    const templateSource = readFileSync(
        new URL("../ui/templates/gallery.html", import.meta.url),
        "utf8",
    );
    const template = templateSource.match(
        /<template data-deck-template="practice">([\s\S]*?)<\/template>/,
    )[1];
    const entry = {
        id: "one",
        label: "学",
        schemaId: "ja",
        layer: "kanji",
        fields: { pronunciation: ["がく"] },
    };
    const schemas = [
        {
            id: "ja",
            language: "ja",
            layers: [{ id: "kanji", navigationSlug: "kanji" }],
        },
    ];
    const departures = [];
    const toasts = [];
    let decision = "cancel";
    let drawing;
    const context = vm.createContext({
        AbortController,
        entryExploreUrl,
        document: { documentElement: { lang: "en" } },
        escapeHtml: String,
        formatTemplate: (source, values) =>
            source.replace(/\{(\w+)\}/g, (_, key) => values[key] ?? ""),
        renderFavourite: () => "",
        flashcardValues: environment.flashcardValues,
        renderFlashcard: environment.renderFlashcard,
        pronunciationClass: environment.pronunciationClass,
        cardStatus: () => status,
        readingChoices: () =>
            options.choices ??
            [true, false, false, false].map((correct, index) => ({
                correct,
                entry: { ...entry, id: `choice-${index}` },
                text: `reading-${index}`,
            })),
        writingPattern: () => ({ strokes: [{ points: [] }] }),
        openDrawingPad: async (options) => {
            drawing = options;
            return { close() {} };
        },
        openPopup: async () => decision,
        navigateTo: async (url, options) => departures.push({ url, options }),
        runDeckAction: vm.runInContext("runDeckAction", environment),
        showToast: (message, options) => toasts.push({ message, ...options }),
    });
    loadModule("../ui/app/flashcards/practice.js", context);
    const controller = new AbortController();
    const grades = [];
    const dispose = context.mountPractice(target, {
        detail: { entry, references: [] },
        templates: { practice: template },
        entries: [],
        schemas,
        progress: {},
        filter,
        mode: "reading",
        i18n: { t: (key) => key },
        signal: controller.signal,
        onNext: async (grade) => grades.push(grade),
        ...options,
    });
    return {
        context,
        target,
        nodes,
        grades,
        departures,
        toasts,
        dispose,
        decision: (value) => {
            decision = value;
        },
        drawing: () => drawing,
        click: async (selector, dataset, modifiers = {}) => {
            let prevented = false;
            const control = {
                dataset,
                classList: { add() {}, remove() {} },
                getAttribute: () =>
                    `/study/explore/ja/kanji/${dataset.entryId}`,
            };
            await target.click({
                ...modifiers,
                target: {
                    closest: (query) => (query === selector ? control : null),
                },
                preventDefault() {
                    prevented = true;
                },
            });
            return { control, prevented };
        },
    };
}

test("reading success keeps complete answers hidden while a mistake reveals them", async () => {
    for (const correct of [true, false]) {
        const harness = practiceHarness("due");
        assert.equal(harness.nodes.get("[data-practice-answer]").hidden, true);
        assert.equal(harness.nodes.get("[data-practice-next]").disabled, true);
        await harness.click("[data-reading-choice]", {
            readingChoice: correct ? "0" : "1",
        });
        assert.equal(
            harness.nodes.get("[data-practice-answer]").hidden,
            correct,
        );
        await harness.click("[data-practice-next]", {});
        assert.deepEqual(harness.grades, [correct ? "good" : "again"]);
        harness.dispose();
    }
});

test("New cards keep answers hidden; Explore departures require confirmation and preserve card identity", async () => {
    for (const filter of ["new", "total"]) {
        const harness = practiceHarness(filter, "new");
        assert.equal(harness.nodes.get("[data-practice-answer]").hidden, true);
        await harness.click("[data-practice-link]", { entryId: "one" });
        assert.equal(harness.departures.length, 0);
        harness.decision("leave");
        await harness.click("[data-practice-link]", { entryId: "one" });
        assert.equal(harness.departures[0].url, "/study/explore/ja/kanji/one");
        assert.equal(harness.departures[0].options.state.studyEntryId, "one");
        harness.dispose();
    }
});

test("Writing passes the complete card into the shared embedded pad and preserves mistakes in the recorded result", async () => {
    const harness = practiceHarness("due", "due", { mode: "writing" });
    await new Promise((resolve) => setImmediate(resolve));
    assert.equal(
        harness.drawing().container,
        harness.nodes.get("[data-practice-drawing]"),
    );
    assert.equal(harness.drawing().card.id, "one");
    harness.drawing().onResult({ correct: false });
    await new Promise((resolve) => setImmediate(resolve));
    assert.equal(harness.nodes.get("[data-practice-answer]").hidden, true);
    harness.drawing().onResult({ correct: true });
    await new Promise((resolve) => setImmediate(resolve));
    await harness.click("[data-practice-next]", {});
    assert.deepEqual(harness.grades, ["again"]);
    harness.dispose();
});

test("full answers group canonical reading and meaning links without duplicating reference rows", () => {
    const harness = practiceHarness("new");
    const detail = {
        entry: {
            id: "word",
            schemaId: "ja",
            layer: "words",
            label: "学",
            fields: { pronunciation: ["がく"] },
        },
        references: [
            { id: "reading", schemaId: "ja", layer: "words", label: "がく" },
            {
                id: "meaning",
                schemaId: "ja",
                layer: "definitions",
                label: "learning",
                fields: { translations: { en: "learning" } },
            },
            { id: "kana", schemaId: "ja", layer: "characters", label: "が" },
        ],
    };
    const schemas = [
        {
            id: "ja",
            language: "ja",
            layers: [
                {
                    id: "words",
                    semanticRole: "lexicalUnit",
                    navigationSlug: "vocabulary",
                },
                { id: "definitions", semanticRole: "definition" },
                { id: "particles", semanticRole: "particle" },
                {
                    id: "characters",
                    semanticRole: "writingUnit",
                    navigationSlug: "kana",
                },
            ],
        },
    ];
    const html = harness.context.renderFlashcard(
        detail,
        schemas,
        "en",
        (entry, text) => `<a data-id="${entry.id}">${text}</a>`,
    );
    for (const id of ["word", "reading", "meaning", "kana"])
        assert.equal(html.split(`data-id="${id}"`).length - 1, 1);
    for (const layer of ["definitions", "particles"])
        assert.equal(
            entryExploreUrl({ id: "entry", schemaId: "ja", layer }, schemas),
            "/study/explore/ja/vocabulary/entry",
        );
});

test("Writing masks the character until an explicit reveal, grades hints as Again and cannot change mode", async () => {
    const answers = [];
    const harness = practiceHarness("new", "new", {
        mode: "writing",
        onAnswer: (grade) => answers.push(grade),
    });
    await new Promise((resolve) => setImmediate(resolve));
    assert.equal(harness.nodes.get("[data-practice-answer]").hidden, true);
    assert.match(
        harness.target.innerHTML,
        /study-practice-concealed[^>]*>.*漢/,
    );
    const drawing = harness.drawing();
    await harness.click("[data-practice-mode]", { practiceMode: "reading" });
    assert.equal(harness.drawing(), drawing);
    await harness.click("[data-reading-choice]", { readingChoice: "0" });
    assert.deepEqual(answers, []);
    await harness.click("[data-practice-reveal]", {});
    assert.deepEqual(answers, ["again"]);
    assert.match(
        harness.nodes.get("[data-practice-reveal]").outerHTML,
        /data-practice-link[^>]*>学<\/a>/,
    );
    assert.equal(harness.nodes.get("[data-practice-answer]").hidden, false);
    await harness.click("[data-practice-next]", {});
    assert.deepEqual(harness.grades, ["again"]);
    harness.dispose();
});

test("a correctly answered previous card uses its front preview and can flip without repeating practice", async () => {
    let previous = 0;
    const harness = practiceHarness("due", "done", {
        answeredGrade: "good",
        onPrevious: () => previous++,
    });
    assert.equal(harness.nodes.get("[data-practice-answer]").hidden, false);
    assert.equal(harness.drawing(), undefined);
    await harness.click("[data-practice-previous]", {});
    assert.equal(previous, 1);
    await harness.click("[data-practice-flip]", {});
    harness.dispose();
});

test("cards without reading distractors can reveal their answer without switching modes or earning an unaided grade", async () => {
    const harness = practiceHarness("new", "new", { choices: [] });
    assert.match(harness.target.innerHTML, /data-practice-reveal/);
    assert.equal(harness.nodes.get("[data-practice-answer]").hidden, true);
    await harness.click("[data-practice-reveal]", {});
    assert.equal(harness.nodes.get("[data-practice-answer]").hidden, false);
    await harness.click("[data-practice-next]", {});
    assert.deepEqual(harness.grades, ["again"]);
    harness.dispose();
});

test("Reading submissions acknowledge the result in the view and animate the submitted option", async () => {
    for (const correct of [true, false]) {
        const harness = practiceHarness("due");
        const { control } = await harness.click("[data-reading-choice]", {
            readingChoice: correct ? "0" : "1",
        });
        assert.equal(
            control.dataset.readingResult,
            correct ? "correct" : "incorrect",
        );
        const feedback = harness.nodes.get("[data-practice-feedback]");
        assert.equal(feedback.hidden, false);
        assert.equal(
            feedback.dataset.result,
            correct ? "correct" : "incorrect",
        );
        assert.equal(
            feedback.textContent,
            `adapter.study.flashcards.practice_${correct ? "correct" : "incorrect"}`,
        );
        assert.equal(harness.toasts.length, 0);
        await harness.click("[data-reading-choice]", { readingChoice: "0" });
        assert.equal(harness.toasts.length, 0);
        harness.dispose();
    }
});

test("option links carry shareable card identity and preserve native modified clicks", async () => {
    const departures = [];
    const harness = practiceHarness("due", "due", {
        onDeparture: (grade) => departures.push(grade),
    });
    assert.match(
        harness.target.innerHTML,
        /href="\/study\/explore\/ja\/kanji\/choice-0"/,
    );
    for (const modifier of ["ctrlKey", "metaKey", "shiftKey"]) {
        const { prevented } = await harness.click(
            "[data-practice-link]",
            { entryId: "choice-0" },
            { [modifier]: true },
        );
        assert.equal(prevented, false);
    }
    assert.deepEqual(departures, ["again", "again", "again"]);
    assert.equal(harness.departures.length, 0);
    await harness.click("[data-reading-choice]", { readingChoice: "0" });
    await harness.click("[data-practice-next]", {});
    assert.deepEqual(harness.grades, ["again"]);
    harness.dispose();
});

test("writing-unit Reading questions use their sound while sentences resolve localized meaning references", () => {
    const schemas = [
        {
            id: "ja",
            layers: [
                { id: "kana", semanticRole: "atomicWritingUnit" },
                { id: "sentences", semanticRole: "orderedLexicalSequence" },
                {
                    id: "meanings",
                    semanticRole: "definition",
                    fields: [{ id: "text", type: "localizedText" }],
                },
            ],
        },
    ];
    const kana = {
        id: "a",
        label: "あ",
        schemaId: "ja",
        layer: "kana",
        fields: { pronunciation: ["a"] },
    };
    assert.equal(
        environment.flashcardValues({ entry: kana }, schemas, "en").back,
        "a",
    );
    const meaning = {
        id: "meaning",
        schemaId: "ja",
        layer: "meanings",
        fields: { text: { en: "I drink water", de: "Ich trinke Wasser" } },
    };
    const sentence = {
        id: "sentence",
        label: "私は水を飲む",
        schemaId: "ja",
        layer: "sentences",
        fields: { pronunciation: ["わたしはみずをのむ"] },
        references: [{ entryId: "meaning" }],
    };
    assert.equal(
        environment.flashcardValues(
            { entry: sentence, references: [meaning] },
            schemas,
            "en",
        ).back,
        "I drink water",
    );
    assert.equal(
        environment.flashcardValues(
            { entry: sentence, references: [meaning] },
            schemas,
            "de",
        ).back,
        "Ich trinke Wasser",
    );
});
