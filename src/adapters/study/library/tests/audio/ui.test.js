import { loadLibraryUiModule } from "../reuse/ui-module.ts";
import assert from "node:assert/strict";
import vm from "node:vm";
import test from "node:test";

const context = vm.createContext({
    escapeHtml: String,
    parseLanguageCode: (value) => value,
    document: { documentElement: { lang: "en" } },
});
Object.assign(
    context,
    loadLibraryUiModule("app/audio-media-session.js", context),
);
Object.assign(context, loadLibraryUiModule("app/presentation.js", context));
const audio = {
    id: "audio",
    type: "audio",
    metadata: { labels: { en: "Audio" } },
    audioLookupAvailable: true,
};
const layers = [
    { id: "words", semanticRole: "lexicalUnit", fields: [audio] },
    { id: "particles", semanticRole: "particle", fields: [audio] },
    {
        id: "sentences",
        semanticRole: "orderedLexicalSequence",
        fields: [audio],
    },
];
const schemas = [{ id: "test", layers }];

test("sentences request their authorized composite endpoint", () => {
    const words = [
        { id: "one", label: "I", schemaId: "test", layer: "words" },
        { id: "two", label: "run", schemaId: "test", layer: "words" },
        {
            id: "period",
            schemaId: "test",
            layer: "particles",
            tags: ["punctuation"],
        },
    ];
    const sentence = {
        id: "sentence",
        schemaId: "test",
        layer: "sentences",
        references: [
            { entryId: "one", position: 0 },
            { entryId: "two", position: 1 },
            { entryId: "period", position: 2 },
        ],
    };
    const html = context.renderAudio(
        sentence,
        layers[2],
        words,
        schemas,
        "Audio",
        "Missing audio",
    );
    assert.match(html, /data-library-audio-entry="sentence"/);
    assert.equal([...html.matchAll(/<audio /g)].length, 1);
});

test("provider audio is offered for words, and missing providers do not enable playback", () => {
    const entry = {
        scope: "global",
        id: "word",
        layer: "words",
        schemaId: "test",
        label: "dog",
    };
    assert.match(
        context.renderAudio(entry, layers[0]),
        /data-library-audio-entry="word"/,
    );
    const unavailable = {
        ...layers[0],
        fields: [
            {
                ...audio,
                audioLookupAvailable: false,
                metadata: { labels: { en: "Audio" } },
            },
        ],
    };
    assert.match(context.renderAudio(entry, unavailable), /disabled/);
});

test("opening a card is inert and playback lazily fetches ordered transformed constituents", async () => {
    const requests = [];
    const played = [];
    const handlers = new Map();
    const descriptor = { setId: "plural", path: ["plural"] };
    const audio = ["one", "two"].map((id) =>
        Object.assign(new EventTarget(), {
            dataset: {
                libraryAudioEntry: id,
                libraryAudioField: "audio",
                ...(id === "two"
                    ? { libraryAudioTransformation: JSON.stringify(descriptor) }
                    : {}),
            },
            isConnected: true,
            src: "",
            currentTime: 0,
            closest: () => null,
            play() {
                played.push(id);
                setImmediate(() => this.dispatchEvent(new Event("ended")));
                return Promise.resolve();
            },
        }),
    );
    const toggle = {
        disabled: false,
        addEventListener: (event, handler) => handlers.set(event, handler),
    };
    const group = {
        querySelectorAll: () => audio,
        querySelector: () => toggle,
    };
    context.fetchLibraryAudioUrl = async (id, field, options) => {
        requests.push({ id, field, options });
        return `blob:${id}`;
    };
    const urls = new Set();
    await context.loadLibraryAudio(
        { querySelectorAll: () => [group] },
        urls,
        undefined,
        "Audio failed",
    );
    assert.equal(requests.length, 0);
    await handlers.get("click")();
    assert.deepEqual(played, ["one", "two"]);
    assert.deepEqual(
        structuredClone(requests[1].options.transformation),
        descriptor,
    );
    assert.equal(urls.size, 2);
    await handlers.get("click")();
    assert.equal(requests.length, 2);
});

test("failed audio retrieval logs safely, shows a localized toast, and permits retry", async () => {
    const logs = [];
    const toasts = [];
    context.uiCtx = {
        capabilities: {
            get:
                () =>
                (...args) =>
                    logs.push(args),
        },
    };
    context.showToast = (...args) => toasts.push(args);
    context.fetchLibraryAudioUrl = async () => {
        throw new Error("network_failed");
    };
    let click;
    const toggle = {
        disabled: false,
        addEventListener: (_event, handler) => {
            click = handler;
        },
    };
    const audio = {
        dataset: { libraryAudioEntry: "one", libraryAudioField: "audio" },
        isConnected: true,
        src: "",
    };
    const group = {
        querySelectorAll: () => [audio],
        querySelector: () => toggle,
    };
    await context.loadLibraryAudio(
        { querySelectorAll: () => [group] },
        new Set(),
        undefined,
        "Localized audio failure",
    );
    await click();
    assert.equal(toasts[0][0], "Localized audio failure");
    assert.equal(logs[0][2].operation, "playAudio");
    assert.equal(toggle.disabled, false);
});

test("sentence audio fields request one host-generated recording and allow explicit replacements", () => {
    const layer = { ...layers[2], fields: [audio] };
    const sentence = {
        id: "sentence",
        label: "I run.",
        layer: "sentences",
        schemaId: "test",
        fields: {},
        references: [{ entryId: "one", relation: "words" }],
    };
    const html = context.renderAudio(
        sentence,
        layer,
        [],
        [{ id: "test", layers: [layer] }],
        "Audio",
    );
    assert.equal([...html.matchAll(/<audio /g)].length, 1);
    assert.match(html, /data-library-audio-entry="sentence"/);
    const kanji = { id: "kanji", label: "字", fields: {}, references: [] };
    const writing = {
        semanticRole: "compoundWritingUnit",
        fields: [audio],
        metadata: { audio: { requiresReading: true } },
    };
    assert.match(context.renderAudio(kanji, writing), /disabled/);
    kanji.fields.audio = "file:manual.audio";
    assert.doesNotMatch(context.renderAudio(kanji, writing), /disabled/);
});
