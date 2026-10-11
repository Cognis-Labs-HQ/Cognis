import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
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
    const source = readFileSync(
        new URL("../ui/app/flashcards/index.js", import.meta.url),
        "utf8",
    );
    const editor = source.slice(
        source.indexOf("async function editDeck"),
        source.indexOf("let mountController"),
    );
    await vm.runInContext(
        editor + "\neditDeck(null, [], [], { t: (key) => key })",
        context,
    );
    assert.equal(navigations, 1);
});
