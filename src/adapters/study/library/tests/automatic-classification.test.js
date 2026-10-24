import { loadTestModule } from "../../../../tooling/reuse/test-module.ts";
import assert from "node:assert/strict";
import test from "node:test";
import vm from "node:vm";

function fixture(lookup, entries = []) {
    const form = {
        elements: {
            label: { value: "食べる" },
            tags: { value: "personal" },
            class: { value: "" },
        },
        setLibraryTags(tags) {
            this.elements.tags.value = tags.join("\u001f");
        },
        addEventListener() {},
    };
    const controller = new AbortController();
    const context = vm.createContext({
        fetchLibraryLookupSuggestions: lookup,
        LIBRARY_COMPOSER_LIMITS: { tags: 10 },
        showToast: () => assert.fail("Unexpected classification failure"),
        reportClientError: () =>
            assert.fail("Unexpected classification failure"),
    });
    Object.assign(
        context,
        loadTestModule(
            new URL(
                "../ui/app/create-entry/classification.js",
                import.meta.url,
            ),
            {
                "/static/gateways/study/library-client.js": context,
                "/static/reuse/toast.js": context,
                "/static/reuse/error-reporting.js": context,
                "../composer-limits.js": context,
            },
            context,
        ),
    );
    context.bindAutomaticClassification(
        form,
        {},
        {
            schema: { id: "ja" },
            layer: { id: "words", semanticRole: "lexicalUnit" },
            entries,
            providers: [{ id: "dictionary", capabilities: ["dictionary"] }],
            i18n: { t: String },
            signal: controller.signal,
        },
    );
    return { form, controller };
}

test("new cards detect dictionary verb paradigms and adverbs, preserving authored tags and removing stale inference", async () => {
    const { form } = fixture(async (_id, { label }) => [
        {
            label,
            class: label === "食べる" ? "lexical:verb" : "lexical:adverb",
            tags: label === "食べる" ? ["verb", "ichidan"] : ["adverb"],
        },
    ]);
    await form.detectLibraryClassification();
    assert.equal(form.elements.class.value, "lexical:verb");
    assert.equal(form.elements.tags.value, "personal\u001fverb\u001fichidan");
    form.elements.label.value = "ゆっくり";
    await form.detectLibraryClassification();
    assert.equal(form.elements.class.value, "lexical:adverb");
    assert.equal(form.elements.tags.value, "personal\u001fadverb");
    form.elements.label.value = "";
    await form.detectLibraryClassification();
    assert.equal(form.elements.tags.value, "personal");
});

test("ambiguous dictionary classes are left for the learner to choose", async () => {
    const { form } = fixture(async (_id, { label }) => [
        { label, class: "lexical:verb", tags: ["verb", "ichidan"] },
        { label, class: "lexical:noun", tags: ["noun"] },
    ]);
    await form.detectLibraryClassification();
    assert.equal(form.elements.class.value, "");
    assert.equal(form.elements.tags.value, "personal");
});

test("hidden pronunciation cards do not make an existing visible verb ambiguous", async () => {
    const entries = [
        {
            schemaId: "ja",
            layer: "words",
            label: "食べる",
            class: "lexical:verb",
            tags: ["verb", "ichidan"],
        },
        {
            schemaId: "ja",
            layer: "words",
            label: "食べる",
            class: "reading:word",
            hidden: true,
            tags: [],
        },
    ];
    const { form } = fixture(
        () => assert.fail("Existing vocabulary needs no remote lookup"),
        entries,
    );
    await form.detectLibraryClassification();
    assert.equal(form.elements.class.value, "lexical:verb");
    assert.ok(form.elements.tags.value.includes("ichidan"));
});
