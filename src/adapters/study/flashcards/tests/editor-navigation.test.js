import { loadTestModule } from "../../../../tooling/reuse/test-module.ts";
import { languageFlashcardsUrl } from "../../../../gateways/study/ui/reuse/explore.js";
import assert from "node:assert/strict";
import test from "node:test";
import vm from "node:vm";

test("deck save closes the protected editor before navigating to the refreshed browse page", async () => {
    let closed = false;
    let navigations = 0;
    const picker = { addEventListener() {} };
    const form = {
        elements: {
            name: { value: "Deck" },
            layer: { value: "", addEventListener() {} },
            query: { value: "", addEventListener() {} },
        },
        querySelector: () => picker,
        appendChild() {},
        reportValidity: () => true,
    };
    const context = vm.createContext({
        document: {
            documentElement: { lang: "en" },
            createElement: () => ({ dataset: {} }),
        },
        createFormBuilder: () => ({ render: () => "" }),
        escapeHtml: String,
        languageFlashcardsUrl,
        saveStudyDeck: async () => {},
        showToast() {},
        navigateTo: async (path) => {
            assert.equal(
                closed,
                true,
                "The editor must release its unsaved-change guard first",
            );
            assert.equal(path, "/study/flashcards");
            navigations++;
        },
        openPopup: async (options) => {
            options.onOpen({ querySelector: () => form });
            assert.equal(await options.onAction("save"), true);
            assert.equal(navigations, 0);
            closed = true;
            return "save";
        },
    });
    const { editDeck } = loadTestModule(
        new URL("../ui/app/deck-editor.js", import.meta.url),
        {
            "/static/gateways/study/reuse/explore.js": context,
            "/static/reuse/form-builder.js": context,
            "/static/reuse/popup.js": context,
            "/static/reuse/escape-html.js": context,
            "/static/reuse/toast.js": context,
            "/static/reuse/app-router.js": context,
            "../decks-client.js": context,
            "../anki.js": context,
        },
        context,
    );
    await editDeck(null, [], [], { t: (key) => key });
    assert.equal(navigations, 1);
});
