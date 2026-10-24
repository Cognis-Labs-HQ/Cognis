import { loadLibraryUiModule } from "../reuse/ui-module.ts";
import { loadTestModule } from "../../../../../tooling/reuse/test-module.ts";
import { findMatchingEntry } from "../../ui/app/create-entry/entry-match.js";
import assert from "node:assert/strict";
import test from "node:test";
import vm from "node:vm";

test("global writers create globally without publish checkboxes", async () => {
    let saved;
    let renderedExtras;
    const layer = {
        id: "words",
        fields: [],
        relationships: [],
        cardConstructor: {},
    };
    const schema = { id: "test", version: 1, language: "en", layers: [layer] };
    const form = {
        elements: {
            label: { value: "word" },
            class: { value: "" },
            tags: { value: "" },
        },
        querySelector: () => null,
        addEventListener() {},
        checkValidity: () => true,
        dispatchEvent() {},
    };
    const context = {
        AbortController,
        structuredClone,
        fetchLibraryLocations: async () => ({
            readable: [{ scope: "global" }],
            writable: [
                { scope: "global" },
                { scope: "class", scopeId: "class-a" },
            ],
        }),
        fetchLibraryLookupProviders: async () => [],
        resolveComposerContract: () => ({
            layer,
            inputCarouselIds: new Set(),
            pronunciationCarouselLayers: new Set(),
        }),
        pronunciationRelationshipsFor: () => [],
        renderComposerExtras: () => "",
        escapeHtml: String,
        localizedLabel: () => "",
        editorBody: (_draft, _schemas, _entries, _i18n, extra) => {
            renderedExtras = extra;
            return { html: "", builder: { attach() {} } };
        },
        bindLibraryEditorControls() {},
        bindComposerExtras() {},
        bindCommittedDefinitionEditing() {},
        mountEditableRelationshipCarousels: () => ({
            commitPendingValues() {},
            abort() {},
        }),
        renderStrokePatternPreviews() {},
        bindTextComposition() {},
        bindLookupProviders() {},
        bindAutomaticClassification() {},
        validateRequiredRelationships() {},
        composerLimitViolation: () => null,
        lookupCompositionReferences: (_form, references) => references,
        readReferences: () => [],
        readFields: () => ({}),
        readReferenceGroups: () => ({}),
        applyDerivedPronunciation() {},
        referencedLinkedEntries: () => [],
        incompatibleDependencies: () => [],
        createLibraryEntry: async (location, candidate) => {
            saved = { location, candidate };
            return { id: "created", ...candidate };
        },
        showToast() {},
        LIBRARY_COMPOSER_LIMITS: { tags: 12 },
        openPopup: async (options) => {
            const overlay = { querySelector: () => form };
            options.onOpen(overlay);
            assert.equal(await options.onAction("create", overlay), true);
            return "create";
        },
    };
    const { openCreateEntryPopup } = loadTestModule(
        new URL("../../ui/app/create-entry/index.js", import.meta.url),
        {
            "./classification.js": context,
            "./import.js": context,
            "../linked-entries.js": context,
            "../definition-languages.js": context,
            "./definition-editor.js": context,
            "./lookups.js": context,
            "../dependency-scope.js": context,
            "./composition.js": context,
            "./definitions.js": context,
            "/static/reuse/popup.js": context,
            "/static/reuse/escape-html.js": context,
            "/static/reuse/info-tooltip.js": context,
            "/static/reuse/toast.js": context,
            "/static/reuse/form-builder.js": context,
            "/static/reuse/horizontal-carousel.js": context,
            "/static/gateways/study/library-client.js": context,
            "../admin-interactions/index.js": context,
            "../presentation.js": context,
            "../pronunciation-editor.js": context,
            "../composer-contract.js": context,
            "../composer-limits.js": context,
            "../composer-extras.js": context,
            "../composition-tokens.js": context,
            "../composition-activation.js": context,
            "./lookup-prerequisites.js": context,
            "../field-input.js": context,
        },
        context,
    );
    const created = await openCreateEntryPopup({
        schemas: [schema],
        entries: [],
        schemaId: "test",
        layerId: "words",
        i18n: { t: (key) => key },
        contributions: [],
    });
    assert.doesNotMatch(
        renderedExtras,
        /name="publishEveryone"|name="publishClass"/,
    );
    assert.equal(saved.location.scope, "global");
    assert.equal(saved.location.scopeId, "global");
    assert.equal(created.id, "created");
});

test("inline definitions for global cards do not reuse private cards or save to personal scope", async () => {
    let saved;
    const context = {
        findMatchingEntry,
        DEFINITION_LANGUAGES: ["de", "en", "id", "ja"],
        createLibraryEntry: async (location, input) => {
            saved = { location, input };
            return { id: "global-definition", ...input };
        },
    };
    Object.assign(
        context,
        loadLibraryUiModule("app/create-entry/definition-editor.js", context),
    );
    const result = await context.createDefinition({
        schema: {
            id: "test",
            version: 1,
            layers: [
                {
                    id: "definitions",
                    definitionLocalization: {
                        translationsField: "translations",
                    },
                },
            ],
        },
        layerId: "definitions",
        location: { scope: "global", scopeId: "global" },
        translations: { en: "classroom" },
        entries: [
            {
                id: "private-definition",
                schemaId: "test",
                layer: "definitions",
                label: "classroom",
                scope: "user",
            },
        ],
    });
    assert.equal(result.created, true);
    assert.equal(saved.location.scope, "global");
    assert.equal(result.entry.id, "global-definition");
});
