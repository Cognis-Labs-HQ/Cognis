import { loadLibraryUiModule } from "./reuse/ui-module.ts";
import { loadTestModule } from "../../../../tooling/reuse/test-module.ts";
import { escapeHtml } from "../../../../ui/reuse/escape-html.js";
import assert from "node:assert/strict";
import test from "node:test";
import vm from "node:vm";

function context(extra = {}) {
    const environment = vm.createContext(extra);
    Object.assign(
        environment,
        loadLibraryUiModule("app/presentation.js", environment),
    );
    Object.assign(
        environment,
        loadTestModule(
            new URL("../ui/app/composer-contract.js", import.meta.url),
            {
                "./reuse/readings.js": environment,
                "./presentation.js": environment,
                "../reuse/transformations.js": environment,
            },
            environment,
        ),
    );
    return environment;
}

const characters = [
    { id: "ko", schemaId: "ja", layer: "characters", label: "こ" },
    {
        id: "small-tsu",
        schemaId: "ja",
        layer: "characters",
        label: "っ",
        hidden: true,
    },
    { id: "chi", schemaId: "ja", layer: "characters", label: "ち" },
];
const schema = {
    id: "ja",
    version: 1,
    layers: [{ id: "characters", semanticRole: "atomicWritingUnit" }],
};

test("manual composition resolves a complete small-kana sequence and activates every occurrence", () => {
    const listeners = new Map();
    const outputListeners = new Map();
    const options = characters.map((entry) => ({
        value: entry.id,
        selected: false,
        textContent: entry.label,
    }));
    const activated = [];
    const input = {
        value: "っち",
        setCustomValidity() {},
        addEventListener: (kind, callback) =>
            listeners.set(`input:${kind}`, callback),
    };
    const output = {
        innerHTML: "",
        addEventListener: (kind, callback) =>
            outputListeners.set(kind, callback),
    };
    const select = { options, selectedOptions: [], append() {} };
    const form = {
        compositionOrder: [],
        elements: { label: { value: "" }, "relationship:spelling": select },
        querySelector(selector) {
            if (selector === "[data-library-composer-text]") return input;
            if (selector === "[data-composition-suggestions]") return output;
            if (selector === "[data-library-composition-blocks]") return {};
            if (selector.startsWith("[data-horizontal-carousel="))
                return {
                    querySelector: (item) => ({
                        click() {
                            const entry = characters.find((entry) =>
                                item.includes(`"${entry.id}"`),
                            );
                            activated.push(entry.id);
                            form.compositionOrder.push(entry.id);
                            options.find(
                                (option) => option.value === entry.id,
                            ).selected = true;
                        },
                    }),
                };
            return null;
        },
        addEventListener: (kind, callback) => listeners.set(kind, callback),
    };
    const environment = context({
        CSS: { escape: String },
        escapeHtml,
        transformationPathways: () => [],
        entryDefinition: () => "",
        compositionTokenEntryId: (value) => value,
        compositionTokenLabel: (token) =>
            characters.find((entry) => entry.id === token)?.label,
    });
    environment.escapeHtml = escapeHtml;
    Object.assign(
        environment,
        loadTestModule(
            new URL("../ui/app/create-entry/composition.js", import.meta.url),
            {
                "../presentation.js": environment,
                "./pronunciation-draft.js": environment,
                "/static/reuse/escape-html.js": environment,
                "../composer-contract.js": environment,
                "../composition-tokens.js": environment,
                "../../reuse/transformations.js": environment,
                "./definitions.js": environment,
            },
            environment,
        ),
    );
    environment.bindTextComposition(
        form,
        characters,
        {
            semanticRole: "lexicalUnit",
            relationships: [{ id: "spelling", targetLayer: "characters" }],
        },
        schema,
        { t: (key) => key },
        new Set(["spelling"]),
    );
    const sequence = output.innerHTML.match(
        /data-library-suggestion-sequence="([^"]+)"/,
    );
    assert.ok(sequence);
    outputListeners.get("click")({
        target: {
            closest: (selector) =>
                selector === "[data-library-suggestion-sequence]"
                    ? {
                          dataset: {
                              librarySuggestionSequence: sequence[1].replaceAll(
                                  "&quot;",
                                  '\"',
                              ),
                          },
                      }
                    : null,
        },
    });
    assert.deepEqual(activated, ["small-tsu", "chi"]);
    assert.equal(input.value, "");
    assert.equal(form.elements.label.value, "っち");
});

test("character carousels retain hidden writing units as selectable references", () => {
    const rendered = [];
    const environment = context({
        document: { documentElement: { lang: "en" } },
        cardPreview: () => "",
        renderHorizontalCarousel: (options) => {
            rendered.push(options);
            return "";
        },
    });
    environment.escapeHtml = escapeHtml;
    environment.localizedLabel = () => "Characters";
    Object.assign(
        environment,
        loadLibraryUiModule(
            "app/admin-interactions/editor-body.js",
            environment,
        ),
    );
    environment.renderCompositionInput = () => "";
    environment.pronunciationRelationshipsFor = () => [];
    environment.canCreateLayerEntries = () => false;
    environment.inputForField = () => "";
    environment.createFormBuilder = (_i18n, options) => ({
        render: () => options.trustedContentHtml,
    });
    environment.renderComposerExtras = () => "";
    environment.renderTransformationOptIns = () => "";
    environment.renderAudioEditor = () => "";
    const wordLayer = {
        id: "words",
        relationships: [{ id: "spelling", targetLayer: "characters" }],
        fields: [],
    };
    const { html } = environment.editorBody(
        { schemaId: "ja", layer: "words", label: "こっち", fields: {} },
        [{ ...schema, layers: [...schema.layers, wordLayer] }],
        characters,
        { t: (key) => key },
        "",
        {
            relationshipCarousels: true,
            inputCarouselIds: new Set(["spelling"]),
        },
    );
    assert.ok(rendered[0].items.some((item) => item.value === "small-tsu"));
    assert.match(html, /<option value="small-tsu">っ<\/option>/);
});
