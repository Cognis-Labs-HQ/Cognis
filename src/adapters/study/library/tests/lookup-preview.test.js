import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";

const source = readFileSync(
    new URL("../ui/app/create-entry/lookup-preview.js", import.meta.url),
    "utf8",
)
    .replace(/import[\s\S]*?from "[^"]+";\n/g, "")
    .replace(/\bexport /g, "");

test("dictionary preview fills missing definition languages before accepting data without mutating the provider result", async () => {
    const suggestions = [
        {
            label: "教室",
            fields: {
                pronunciation: ["きょうしつ"],
                dictionary_data: '{"slug":"教室"}',
            },
            sourceUrl: "https://jisho.org/word/教室",
            definitions: [
                { translations: { en: "classroom", de: "Klassenzimmer" } },
            ],
        },
    ];
    let articles = [];
    let translationsRequested = 0;
    let translate;
    const panel = {
        set innerHTML(value) {
            articles = [
                ...value.matchAll(
                    /<article[^>]*data-lookup-definition="(\d+)"[\s\S]*?<\/article>/g,
                ),
            ].map(([html, index]) => {
                const values = Object.fromEntries(
                    [
                        ...html.matchAll(
                            /data-lookup-language="([^"]+)"[^>]*>([^<]*)<\/textarea>/g,
                        ),
                    ].map(([, language, text]) => [language, { value: text }]),
                );
                return {
                    dataset: { lookupDefinition: index },
                    querySelector: (selector) =>
                        selector === "[data-lookup-include]"
                            ? {
                                  checked: html.includes(
                                      "data-lookup-include checked",
                                  ),
                              }
                            : values[
                                  /data-lookup-language="([^"]+)"/.exec(
                                      selector,
                                  )[1]
                              ],
                };
            });
        },
        querySelectorAll: () => articles,
    };
    const button = {
        hidden: false,
        disabled: false,
        addEventListener: (_kind, handler) => {
            translate = handler;
        },
    };
    const context = {
        URL,
        structuredClone,
        escapeHtml: (value) => String(value),
        DEFINITION_LANGUAGES: ["de", "en", "id", "ja"],
        LIBRARY_COMPOSER_LIMITS: { definitions: 10 },
        showToast() {},
        localizeLibraryDefinition: async (translations, languages) => {
            translationsRequested += 1;
            assert.deepEqual(languages, ["de", "en", "id", "ja"]);
            return {
                translations: {
                    ...translations,
                    id: "ruang kelas",
                    ja: "教室",
                },
                missingLanguages: [],
            };
        },
        openPopup: async (options) => {
            options.onOpen({
                querySelector: (selector) =>
                    selector === "[data-lookup-preview]"
                        ? panel
                        : selector === "[data-lookup-translate]"
                          ? button
                          : null,
            });
            await translate();
            assert.equal(options.onAction("apply"), true);
            return "apply";
        },
    };
    vm.runInNewContext(source, context);
    const accepted = await context.chooseLookupSuggestion(suggestions, {
        t: (key) => key,
    });
    assert.equal(translationsRequested, 1);
    assert.deepEqual(
        JSON.parse(JSON.stringify(accepted.definitions[0].translations)),
        { en: "classroom", de: "Klassenzimmer", id: "ruang kelas", ja: "教室" },
    );
    assert.deepEqual(accepted.fields, suggestions[0].fields);
    assert.deepEqual(suggestions[0].definitions[0].translations, {
        en: "classroom",
        de: "Klassenzimmer",
    });
    assert.equal(context.lookupSourceUrl("javascript:alert(1)"), "");
    assert.equal(
        context.lookupSourceUrl("https://jisho.org/word/教室"),
        "https://jisho.org/word/%E6%95%99%E5%AE%A4",
    );
});
