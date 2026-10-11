import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";

function source(file) {
    return readFileSync(new URL(file, import.meta.url), "utf8")
        .replace(/import[\s\S]*?from "[^"]+";\n/g, "")
        .replace(/\bexport /g, "")
        .replace("await mountWhenDirect(mount);", "");
}
const schema = {
    id: "test",
    layers: [
        {
            id: "words",
            fields: [
                {
                    id: "pronunciation",
                    metadata: { labels: { en: "Pronunciation" } },
                },
            ],
        },
    ],
};

async function searchPage(lookup) {
    const target = { outerHTML: "" };
    const root = { querySelector: () => target, addEventListener() {} };
    const context = vm.createContext({
        URLSearchParams,
        location: {
            search: "?providerId=dictionary&schemaId=test&query=greeting",
            pathname: "/study/library/search",
        },
        document: { documentElement: { lang: "en" } },
        createI18n: async () => ({ t: (key) => key }),
        applyDocumentTitle() {},
        loadStudySubNavigationModel: async () => ({
            selectedLanguageCode: "ja",
            dictionaryProviders: [{ id: "dictionary", schemaId: "test" }],
        }),
        fetchLibrarySchemas: async () => [schema],
        searchLibraryDictionary: lookup,
        loadDictionaryReferences: async () => [],
        resolveLookupReferences: (suggestion) => ({ suggestion }),
        escapeHtml: (text) => String(text),
        renderCardContents: (entry) => `<strong>${entry.label}</strong>`,
        layerForEntry: () => schema.layers[0],
        isMeaningLayer: () => false,
        localizedTextValue: (translations) => translations.en || "",
        renderMetadataPills: () => "",
        visibleDetailFields: (layer) => layer.fields,
        renderDetailFields: (fields) =>
            Object.entries(fields)
                .map(([label, value]) => `<p>${label}:${value}</p>`)
                .join(""),
        canCreateLayerEntries: () => true,
        showToast() {},
        formatDateTime: (value) => value,
        createPageComposer: (_root, config) => ({
            init: async () => {
                target.outerHTML = config.elements[0].render();
            },
        }),
        bindStudySubNavigation() {},
        mountWhenDirect: async () => {},
    });
    await vm.runInContext(
        source("../ui/app/search/index.js") + "\nmount(root)",
        vm.createContext({ ...context, root }),
    );
    return target.outerHTML;
}

test("dictionary details separate meanings from absent pronunciation fields", async () => {
    const html = await searchPage(async () => ({
        results: [
            {
                schemaId: "test",
                layer: "words",
                label: "greeting",
                fields: { pronunciation: [] },
                definitions: [{ translations: { en: "hello" } }],
            },
        ],
    }));
    assert.match(
        html,
        /<h4>gateway.study.library_definitions<\/h4>\s*<ul><li>en: hello<\/li>/,
    );
    assert.equal((html.match(/Pronunciation:/g) || []).length, 0);
    assert.match(html, /<strong>greeting<\/strong>/);
});

test("failed searches render a retryable error state rather than successful results", async () => {
    const html = await searchPage(async () => {
        throw new Error("offline");
    });
    assert.match(html, /role="alert">gateway.study.library_dictionary_error/);
    assert.equal((html.match(/data-dictionary-create/g) || []).length, 0);
});

test("My Requests shows every submitted status read-only while Pending exposes authorized actions", () => {
    const context = vm.createContext({
        localStorage: { getItem: () => "me" },
        uiCtx: { capabilities: { get: () => null } },
        escapeHtml: String,
        formatDateTime: String,
        renderScope: () => "",
    });
    vm.runInContext(source("../ui/app/requests.js"), context);
    const requests = ["pending", "approved", "rejected"].map((status) => ({
        id: status,
        status,
        requestedBy: "me",
        destination: { scope: "global" },
        canReview: true,
        canWithdraw: true,
    }));
    requests.push({
        id: "other",
        status: "pending",
        requestedBy: "other",
        destination: { scope: "global" },
        canReview: true,
    });
    const i18n = { t: (key) => key };
    const mine = context.renderLibraryRequests(requests, i18n, "mine");
    assert.equal((mine.match(/<article/g) || []).length, 3);
    assert.equal((mine.match(/<button/g) || []).length, 0);
    const pending = context.renderLibraryRequests(requests, i18n, "pending");
    assert.equal((pending.match(/<article/g) || []).length, 2);
    assert.equal(
        (pending.match(/data-library-review="approved"/g) || []).length,
        2,
    );
});

test("relocation directions disable conflicts and resume when a conflicting card is deselected", () => {
    const context = vm.createContext({});
    vm.runInContext(source("../ui/app/selection.js"), context);
    const personal = { id: "personal", scope: "user", canDelete: true };
    const shared = { id: "shared", scope: "global", canDelete: true };
    const conflict = context.relocationState([personal, shared], "class");
    assert.equal(conflict.disabled, true);
    assert.equal(context.relocationState([shared], "class").disabled, false);
    assert.equal(context.relocationState([shared], "class").downgrade, true);
    assert.equal(
        context.relocationState([personal], "global").downgrade,
        false,
    );
    assert.equal(
        context.relocationState(
            [personal, { ...personal, id: "second" }],
            "global",
        ).disabled,
        false,
    );
    assert.equal(
        context.relocationState([personal, shared], "global").disabled,
        true,
    );
});

test("request headers show linked identities and decision time on the status pill", () => {
    const context = vm.createContext({
        localStorage: { getItem: () => "me" },
        uiCtx: {
            capabilities: {
                get: () => ({
                    buildMarkup: ({ profileHandle }) =>
                        `<a href="/profile/${profileHandle}" class="avatar">avatar</a>`,
                }),
            },
        },
        escapeHtml: String,
        formatDateTime: () => "Decision time",
        renderScope: () => "",
    });
    vm.runInContext(source("../ui/app/requests.js"), context);
    const html = context.renderLibraryRequests(
        [
            {
                id: "done",
                requestedBy: "me",
                reviewedBy: "reviewer",
                status: "approved",
                reviewedAt: "2026-10-09T00:00:00Z",
                destination: { scope: "global" },
            },
        ],
        { t: (key) => key },
        "mine",
        {
            profiles: new Map([
                ["me", { handle: "me", displayName: "Requester" }],
                ["reviewer", { handle: "reviewer", displayName: "Reviewer" }],
            ]),
        },
    );
    assert.match(
        html,
        /library-request-header[\s\S]*href="\/profile\/me"[\s\S]*href="\/profile\/reviewer"/,
    );
    assert.match(
        html,
        /library-metadata-pill" title="Decision time" tabindex="0"/,
    );
});
