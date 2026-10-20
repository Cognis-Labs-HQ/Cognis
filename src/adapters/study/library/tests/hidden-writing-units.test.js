import { escapeHtml } from "../../../../ui/reuse/escape-html.js";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";

function source(path) {
    return readFileSync(new URL(path, import.meta.url), "utf8")
        .replace(/^import[\s\S]*?;\n/gm, "")
        .replace(/^export \{[^}]+\} from[^;]+;\n/gm, "")
        .replace(/export (async )?function/g, "$1function");
}

function context(extra = {}) {
    const environment = vm.createContext(extra);
    vm.runInContext(source("../ui/app/presentation.js"), environment);
    vm.runInContext(source("../ui/app/composer-contract.js"), environment);
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
    vm.runInContext(
        source("../ui/app/create-entry/composition.js"),
        environment,
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
    vm.runInContext(
        source("../ui/app/admin-interactions/editor-body.js"),
        environment,
    );
    const html = environment.relationshipEditor(
        { id: "spelling", targetLayer: "characters" },
        { schemaId: "ja", label: "こっち", fields: {} },
        characters,
        schema,
        "en",
        { carousel: true },
    );
    assert.ok(rendered[0].items.some((item) => item.value === "small-tsu"));
    assert.match(html, /<option value="small-tsu">っ<\/option>/);
});
