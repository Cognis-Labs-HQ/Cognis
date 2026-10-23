import { loadTestModule } from "../../../../tooling/reuse/test-module.ts";
import { randomIndex } from "../../../../gateways/study/ui/reuse/random.js";
import assert from "node:assert/strict";
import test from "node:test";
import vm from "node:vm";
import { readFileSync } from "node:fs";
import { entryExploreUrl } from "../../../../gateways/study/ui/reuse/explore.js";
import { uiCtx } from "../../../../ui/reuse/ui-ctx.js";
import { similarEntries } from "../../../../gateways/study/ui/reuse/similar-items.js";
import { drawingPattern } from "../../../../gateways/study/ui/reuse/drawing-pattern.js";
import { isCardDue } from "../ui/reuse/review.js";
import {
    readingAnswerKey,
    isCorrectReadingChoice,
} from "../ui/reuse/reading-answer.js";

const environment = vm.createContext({
    Date,
    randomIndex,
    uiCtx,
    similarEntries,
    drawingPattern,
    isCardDue,
    readingAnswerKey,
    escapeHtml: String,
});
Object.assign(
    environment,
    loadTestModule(
        new URL(
            "../../../../gateways/study/ui/reuse/pronunciation.js",
            import.meta.url,
        ),
        {},
        environment,
    ),
);
Object.assign(
    environment,
    loadTestModule(
        new URL("../ui/reuse/flashcard.js", import.meta.url),
        { "/static/gateways/study/reuse/pronunciation.js": environment },
        environment,
    ),
);
Object.assign(
    environment,
    loadTestModule(
        new URL(
            "../../../../gateways/study/ui/reuse/action-flows.js",
            import.meta.url,
        ),
        { "/static/reuse/ui-ctx.js": environment },
        environment,
    ),
);
Object.assign(
    environment,
    loadTestModule(
        new URL("../ui/app/actions.js", import.meta.url),
        { "/static/gateways/study/reuse/action-flows.js": environment },
        environment,
    ),
);
Object.assign(
    environment,
    loadTestModule(
        new URL("../ui/app/practice-model.js", import.meta.url),
        {
            "/static/gateways/study/reuse/random.js": environment,
            "/static/gateways/study/reuse/similar-items.js": environment,
            "/static/gateways/study/reuse/drawing-pattern.js": environment,
            "../reuse/flashcard.js": environment,
            "../reuse/review.js": environment,
            "../reuse/reading-answer.js": environment,
        },
        environment,
    ),
);

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
    const actions = environment.DECK_ACTIONS;
    for (const action of actions) {
        const stages = [];
        for (const stage of ["before", "after"])
            uiCtx.extendFlow(
                `study:decks:${action}`,
                stage,
                { id: `test:${action}:${stage}` },
                () => stages.push(stage),
            );
        const result = await environment.runDeckAction(action, () => {
            stages.push("execute");
            return 42;
        });
        assert.equal(result, 42);
        assert.deepEqual(stages, ["before", "execute", "after"]);
        const controller = new AbortController();
        controller.abort();
        let calls = 0;
        await environment.runDeckAction(
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
    await assert.rejects(environment.runDeckAction("unregistered", () => 1));
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
                    classes: new Set(),
                    classList: {
                        add(...values) {
                            values.forEach((value) =>
                                nodes.get(selector).classes.add(value),
                            );
                        },
                        remove(...values) {
                            values.forEach((value) =>
                                nodes.get(selector).classes.delete(value),
                            );
                        },
                    },
                    focus() {
                        this.focused = true;
                    },
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
        uiCtx: {
            capabilities: {
                get: () => ({
                    titleComposition: () => options.titlePieces ?? [],
                }),
            },
        },
        entryExploreUrl,
        document: { documentElement: { lang: "en" } },
        escapeHtml: String,
        formatTemplate: (source, values) =>
            source.replace(/\{(\w+)\}/g, (_, key) => values[key] ?? ""),
        renderFavourite: () => "",
        flashcardValues: environment.flashcardValues,
        renderFlashcard: environment.renderFlashcard,
        isCorrectReadingChoice,
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
        runDeckAction: environment.runDeckAction,
        showToast: (message, options) => toasts.push({ message, ...options }),
    });
    Object.assign(
        context,
        loadTestModule(
            new URL("../ui/app/practice.js", import.meta.url),
            {
                "/static/gateways/study/reuse/explore.js": context,
                "/static/gateways/study/reuse/pronunciation.js": context,
                "/static/reuse/toast.js": context,
                "/static/reuse/escape-html.js": context,
                "/static/reuse/format-template.js": context,
                "/static/reuse/popup.js": context,
                "/static/reuse/app-router.js": context,
                "/static/gateways/study/reuse/drawing.js": context,
                "/static/gateways/study/reuse/favourites.js": context,
                "../reuse/flashcard.js": context,
                "./practice-model.js": context,
                "./actions.js": context,
                "/static/reuse/ui-ctx.js": context,
                "../reuse/reading-answer.js": context,
            },
            context,
        ),
    );
    const controller = new AbortController();
    const grades = [];
    const dispose = context.mountPractice(target, {
        detail: { entry, references: [] },
        templates: {
            practice: template,
            "practice-hint": templateSource.match(
                /<template data-deck-template="practice-hint">([\s\S]*?)<\/template>/,
            )[1],
            "practice-navigation": templateSource.match(
                /<template data-deck-template="practice-navigation">([\s\S]*?)<\/template>/,
            )[1],
        },
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
                setAttribute(name, value) {
                    this[name] = value;
                },
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
    assert.equal(harness.drawing().suppressRetry, true);
    assert.ok(
        harness.target.innerHTML.indexOf("data-practice-previous") <
            harness.target.innerHTML.indexOf("data-practice-drawing"),
    );
    const drawing = harness.drawing();
    await harness.click("[data-practice-mode]", { practiceMode: "reading" });
    assert.equal(harness.drawing(), drawing);
    await harness.click("[data-reading-choice]", { readingChoice: "0" });
    assert.deepEqual(answers, []);
    drawing.onResult({ correct: false, assisted: true });
    await new Promise((resolve) => setImmediate(resolve));
    assert.deepEqual(answers, ["again"]);
    assert.equal(harness.nodes.get("[data-practice-answer]").hidden, true);
    await harness.click("[data-practice-next]", {});
    assert.deepEqual(harness.grades, ["again"]);
    harness.dispose();
});

test("a correctly answered previous card shows its full answer without repeating practice", async () => {
    let previous = 0;
    const harness = practiceHarness("due", "done", {
        answeredGrade: "good",
        onPrevious: () => previous++,
    });
    assert.equal(harness.nodes.get("[data-practice-answer]").hidden, false);
    assert.equal(harness.drawing(), undefined);
    await harness.click("[data-practice-previous]", {});
    assert.equal(previous, 1);
    assert.match(harness.target.innerHTML, /がく/);
    assert.deepEqual(harness.grades, []);
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

test("punctuation-equivalent choices receive a successful grade before progress is submitted", async () => {
    const answers = [];
    const harness = practiceHarness("total", "new", {
        choices: [
            { text: "I am a student.", correct: true },
            { text: "I am a student", correct: false },
            { text: "I am not a student.", correct: false },
        ],
        onAnswer: (grade) => answers.push(grade),
    });
    const { control } = await harness.click("[data-reading-choice]", {
        readingChoice: "1",
    });
    assert.deepEqual(answers, ["good"]);
    assert.equal(control.dataset.readingResult, "correct");
    assert.equal(
        harness.nodes.get("[data-practice-feedback]").dataset.result,
        "correct",
    );
    assert.equal(harness.nodes.get("[data-practice-answer]").hidden, true);
    await harness.click("[data-practice-next]", {});
    assert.deepEqual(harness.grades, ["good"]);
    harness.dispose();
});

test("answer choices exclude punctuation equivalents and use the available distinct meanings", () => {
    const schema = {
        id: "sentences",
        layers: [{ id: "sentences", semanticRole: "orderedLexicalSequence" }],
    };
    const entries = [
        "I am a student.",
        "I am a student",
        "I am a student！",
        " I AM  a student ",
        "I go to school.",
    ].map((definition, index) => ({
        id: `sentence-${index}`,
        schemaId: schema.id,
        layer: "sentences",
        label: `Sentence ${index}`,
        fields: { definition },
    }));
    const detail = { entry: entries[0], references: [] };
    const choices = environment.readingChoices(detail, entries, [schema], "en");
    assert.equal(choices.length, 2);
    assert.equal(choices.filter(({ correct }) => correct).length, 1);
    assert.equal(choices.find(({ correct }) => correct).entryId, entries[0].id);
    assert.equal(
        choices.find(({ correct }) => !correct).entryId,
        entries[4].id,
    );
    assert.equal(
        new Set(choices.map(({ text }) => readingAnswerKey(text))).size,
        choices.length,
    );
    assert.equal(
        environment.readingChoices(detail, entries.slice(0, 4), [schema], "en")
            .length,
        0,
    );
});

test("card heading actions confirm departure even with modifier keys and preserve deck navigation", async () => {
    const departures = [];
    const harness = practiceHarness("due", "due", {
        onDeparture: (grade) => departures.push(grade),
        navigationEntryIds: ["one", "two"],
    });
    assert.match(
        harness.target.innerHTML,
        /<button type="button" class="study-entry-link btn-neutral" data-practice-link data-entry-id="one">学<\/button>/,
    );
    assert.equal(
        (harness.target.innerHTML.match(/data-reading-choice=/g) ?? []).length,
        4,
    );
    for (const modifier of ["ctrlKey", "metaKey", "shiftKey"]) {
        const { prevented } = await harness.click(
            "[data-practice-link]",
            { entryId: "one" },
            { [modifier]: true },
        );
        assert.equal(prevented, true);
    }
    assert.deepEqual(departures, []);
    harness.decision("leave");
    await harness.click("[data-practice-link]", { entryId: "one" });
    assert.deepEqual(departures, ["again"]);
    assert.deepEqual(
        Array.from(harness.departures[0].options.state.studyEntryIds),
        ["one", "two"],
    );
    harness.dispose();
});

test("composed headings box each canonical item and preserve the selected transformation on departure", async () => {
    const base = { schemaId: "ja", layer: "kanji" };
    const transformation = { setId: "verb", path: ["past"] };
    const titlePieces = [
        { ...base, id: "person", label: "私" },
        { ...base, id: "particle", label: "は" },
        { label: " " },
        {
            ...base,
            id: "verb",
            label: "学んだ",
            referenceTransformation: transformation,
        },
        { label: "。" },
    ];
    const harness = practiceHarness("due", "due", { titlePieces });
    const heading = harness.target.innerHTML.split("study-practice-modes")[0];
    for (const index of [0, 1, 3]) {
        assert.ok(heading.includes(`data-practice-piece="${index}"`));
        assert.ok(heading.includes(`data-entry-id="${titlePieces[index].id}"`));
        assert.ok(heading.includes(`>${titlePieces[index].label}</button>`));
    }
    assert.equal((heading.match(/study-practice-piece"/g) ?? []).length, 3);
    assert.ok(heading.includes("。</span>"));
    await harness.click("[data-practice-link]", {
        entryId: "person",
        practicePiece: "0",
    });
    assert.deepEqual(harness.departures, []);
    harness.decision("leave");
    await harness.click("[data-practice-link]", {
        entryId: "verb",
        practicePiece: "3",
    });
    assert.equal(harness.departures[0].options.state.studyEntryId, "verb");
    assert.deepEqual(
        harness.departures[0].options.state.studyEntryTransformation,
        transformation,
    );
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

test("writing heading navigation settles the assisted answer and retains deck order", async () => {
    const departures = [];
    const harness = practiceHarness("new", "new", {
        mode: "writing",
        navigationEntryIds: ["one", "two"],
        onDeparture: (grade) => departures.push(grade),
    });
    await new Promise((resolve) => setImmediate(resolve));
    harness.drawing().onResult({ correct: false, assisted: true });
    await new Promise((resolve) => setImmediate(resolve));
    await harness.drawing().onNavigate(harness.drawing().card);
    assert.deepEqual(departures, ["again"]);
    assert.equal(harness.departures[0].url, "/study/explore/ja/kanji/one");
    assert.deepEqual(
        Array.from(harness.departures[0].options.state.studyEntryIds),
        ["one", "two"],
    );
    harness.dispose();
});

test("reading prompts show only a distinct primary pronunciation", () => {
    for (const [label, readings, expected] of [
        ["学", ["がく", "まなぶ"], "がく"],
        ["がく", ["がく", "まなぶ"], null],
        ["ｷ", ["キ"], null],
        ["学", [], null],
    ]) {
        const harness = practiceHarness("total", "new", {
            detail: {
                entry: {
                    id: "one",
                    label,
                    schemaId: "ja",
                    layer: "kanji",
                    fields: { pronunciation: readings },
                },
                references: [],
            },
        });
        const heading = harness.target.innerHTML.split(
            'class="study-practice-modes"',
        )[0];
        if (expected) {
            assert.match(heading, /study-practice-pronunciation/);
            assert.ok(heading.includes(expected));
            assert.ok(!heading.includes("まなぶ"));
        } else assert.doesNotMatch(heading, /study-practice-pronunciation/);
        harness.dispose();
    }
});

test("reading hints highlight the actual correct option and keep assisted results Again", async () => {
    const answers = [];
    const harness = practiceHarness("total", "new", {
        choices: [false, false, true, false].map((correct, index) => ({
            correct,
            text: `answer-${index}`,
        })),
        onAnswer: (grade) => answers.push(grade),
    });
    assert.match(harness.target.innerHTML, /data-reading-hint/);
    const { control } = await harness.click("[data-reading-hint]", {});
    const highlighted = harness.nodes.get('[data-reading-choice="2"]');
    assert.ok(highlighted.classes.has("study-reading-hinted"));
    assert.equal(highlighted.focused, true);
    assert.equal(control.disabled, true);
    assert.deepEqual(answers, ["again"]);
    assert.equal(harness.nodes.get("[data-practice-next]").disabled, true);
    await harness.click("[data-reading-hint]", {});
    assert.deepEqual(answers, ["again"]);
    await harness.click("[data-reading-choice]", { readingChoice: "2" });
    assert.equal(harness.nodes.get("[data-practice-next]").disabled, false);
    await harness.click("[data-practice-next]", {});
    assert.deepEqual(harness.grades, ["again"]);
    harness.dispose();
});

test("sentence-only decks disable Writing while drawable decks retain their saved mode", () => {
    const schemas = [
        {
            id: "ja",
            layers: [
                { id: "sentences", semanticRole: "orderedLexicalSequence" },
                {
                    id: "characters",
                    semanticRole: "compoundWritingUnit",
                    fields: [{ id: "strokes", type: "strokePattern" }],
                },
            ],
        },
    ];
    const character = {
        id: "character",
        schemaId: "ja",
        layer: "characters",
        label: "学",
        fields: { strokes: { strokes: [{ points: [] }] } },
    };
    const sentence = {
        entry: { schemaId: "ja", layer: "sentences", label: "学" },
        references: [character],
    };
    assert.equal(
        environment.supportsDeckWriting([sentence], [character], schemas),
        false,
    );
    assert.equal(
        environment.supportsDeckWriting(
            [sentence, { entry: character }],
            [character],
            schemas,
        ),
        true,
    );
});
