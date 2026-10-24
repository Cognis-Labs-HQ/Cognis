import { loadLibraryUiModule } from "../reuse/ui-module.ts";
import {
    loadTestModule,
    importTestModule,
} from "../../../../../tooling/reuse/test-module.ts";
import { replaceMountScope } from "../../../../../ui/reuse/mount-scope.js";
import assert from "node:assert/strict";
import test from "node:test";
import vm from "node:vm";

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

async function searchPage(lookup, selectedIndex) {
    const target = { outerHTML: "" };
    let click;
    const root = {
        querySelector: (selector) =>
            selector === ".library-dictionary-cards" ? null : target,
        addEventListener(type, handler) {
            if (type === "click") click = handler;
        },
    };
    const context = vm.createContext({
        URLSearchParams,
        parseLanguageCode: (value) => value,
        replaceMountScope,
        window: new EventTarget(),
        history: {
            replaceState: (_state, _unused, path) =>
                assert.equal(path, "/study/library/search"),
        },
        dictionarySearchContext: async () => ({
            providerId: "dictionary",
            schemaId: "test",
            query: "greeting",
            language: "ja",
        }),
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
        metadataValues: () => [],
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
    context.createStudySubNavigationSlot = () => ({ render: () => "" });
    const search = await importTestModule(
        new URL("../../ui/app/search/index.js", import.meta.url),
        {
            "/static/reuse/mount-scope.js": {
                replaceMountScope: context.replaceMountScope,
            },
            "/static/reuse/i18n.js": {
                createI18n: context.createI18n,
                applyDocumentTitle: context.applyDocumentTitle,
            },
            "/static/reuse/page-composer/index.js": {
                createPageComposer: context.createPageComposer,
            },
            "/static/reuse/page-entry.js": {
                mountWhenDirect: context.mountWhenDirect,
            },
            "/static/reuse/escape-html.js": { escapeHtml: context.escapeHtml },
            "/static/reuse/toast.js": { showToast: context.showToast },
            "/static/reuse/timestamp.js": {
                formatDateTime: context.formatDateTime,
            },
            "/static/gateways/study/sub-navigation.js": {
                bindStudySubNavigation: context.bindStudySubNavigation,
                loadStudySubNavigationModel:
                    context.loadStudySubNavigationModel,
                createStudySubNavigationSlot:
                    context.createStudySubNavigationSlot,
            },
            "/static/gateways/study/library-client.js": {
                dictionarySearchContext: context.dictionarySearchContext,
                fetchLibrarySchemas: context.fetchLibrarySchemas,
                searchLibraryDictionary: context.searchLibraryDictionary,
            },
            "../data.js": { loadLibrary: context.loadLibrary },
            "./references.js": {
                loadDictionaryReferences: context.loadDictionaryReferences,
            },
            "../cards.js": { renderCardContents: context.renderCardContents },
            "../presentation.js": {
                renderDetailFields: context.renderDetailFields,
                metadataValues: context.metadataValues,
                layerForEntry: context.layerForEntry,
                localizedTextValue: context.localizedTextValue,
                relationSection: context.relationSection,
                isMeaningLayer: context.isMeaningLayer,
                visibleDetailFields: context.visibleDetailFields,
            },
            "../create-entry/lookup-references.js": {
                resolveLookupReferences: context.resolveLookupReferences,
            },
            "../entry-popup.js": { openEntryPopup: context.openEntryPopup },
            "../editability.js": {
                canCreateLayerEntries: context.canCreateLayerEntries,
            },
            "../create-entry/index.js": {
                openCreateEntryPopup: context.openCreateEntryPopup,
            },
        },
        context,
    );
    await search.mount(root);
    if (selectedIndex !== undefined)
        await click({
            target: {
                closest: (selector) =>
                    selector === "[data-dictionary-result]"
                        ? {
                              dataset: {
                                  dictionaryResult: String(selectedIndex),
                              },
                          }
                        : null,
            },
        });
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
    assert.match(html, /<h3>greeting<\/h3>/);
    assert.doesNotMatch(html, /data-dictionary-result=/);
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
        renderRequestPreview: () => "<div data-request-preview></div>",
    });
    Object.assign(context, loadLibraryUiModule("app/requests.js", context));
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
    Object.assign(context, loadLibraryUiModule("app/selection.js", context));
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
        renderRequestPreview: () => "<div data-request-preview></div>",
    });
    Object.assign(context, loadLibraryUiModule("app/requests.js", context));
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

test("multiple dictionary matches use one selected detail view, and selecting another replaces it", async () => {
    const results = ["first", "second"].map((label) => ({
        schemaId: "test",
        layer: "words",
        label,
        fields: {},
        definitions: [{ translations: { en: label } }],
    }));
    const html = await searchPage(async () => ({ results }), 1);
    assert.equal(
        (html.match(/class="library-dictionary-detail"/g) ?? []).length,
        1,
    );
    assert.equal((html.match(/data-dictionary-result=/g) ?? []).length, 2);
    assert.match(html, /<h3>second<\/h3>/);
    assert.match(html, /data-dictionary-result="1" aria-pressed="true"/);
    assert.match(html, /role="group"/);
});
