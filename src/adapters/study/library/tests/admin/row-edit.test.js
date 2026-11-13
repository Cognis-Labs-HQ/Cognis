import { loadTestModule } from "../../../../../tooling/reuse/test-module.ts";
import assert from "node:assert/strict";
import test from "node:test";
import vm from "node:vm";
import { entryEditMode } from "../../ui/app/editability.js";

test("clicking a Library row opens the editor with Save for permitted cards and preserves readonly permissions", async () => {
    for (const canEdit of [true, false]) {
        const events = new Map();
        const popups = [];
        const entry = {
            id: "card",
            label: "Card",
            schemaId: "schema",
            layer: "words",
            canEdit,
        };
        const context = vm.createContext({
            AbortController,
            entryEditMode,
            resolveComposerContract: (_schema, layer) => ({
                layer,
                constructor: {},
            }),
            renderComposerExtras: () => "",
            editorBody: () => ({ html: "editor" }),
            openPopup: async (options) => {
                popups.push(options);
            },
        });
        Object.assign(
            context,
            loadTestModule(
                new URL(
                    "../../ui/app/admin-interactions/index.js",
                    import.meta.url,
                ),
                {
                    "../reference-images.js": context,
                    "../audio-upload.js": context,
                    "../audio-editor.js": context,
                    "../transformation-opt-ins.js": context,
                    "../reuse/definition-actions.js": context,
                    "../composition-activation.js": context,
                    "/static/reuse/escape-html.js": context,
                    "/static/reuse/popup.js": context,
                    "/static/reuse/toast.js": context,
                    "/static/reuse/form-builder.js": context,
                    "/static/reuse/horizontal-carousel.js": context,
                    "/static/reuse/composition-input.js": context,
                    "/static/reuse/ui-ctx.js": context,
                    "/static/reuse/error-reporting.js": context,
                    "/static/gateways/study/library-client.js": context,
                    "../presentation.js": context,
                    "../editability.js": context,
                    "../pronunciation-editor.js": context,
                    "../composer-contract.js": context,
                    "../composer-limits.js": context,
                    "../composer-extras.js": context,
                    "../composition-tokens.js": context,
                    "../field-input.js": context,
                    "../../reuse/transformations.js": context,
                    "./editor-body.js": context,
                },
                context,
            ),
        );
        context.bindAdminLibraryInteractions(
            { addEventListener: (type, handler) => events.set(type, handler) },
            {
                entries: [entry],
                schemas: [
                    {
                        id: "schema",
                        layers: [{ id: "words", semanticRole: "lexicalUnit" }],
                    },
                ],
                i18n: { t: (key) => key },
                signal: new AbortController().signal,
            },
        );
        await events.get("click")({
            target: {
                matches: () => false,
                closest: (selector) =>
                    selector === ".library-admin-entry-row"
                        ? { dataset: { libraryEntry: "card" } }
                        : null,
            },
        });
        assert.equal(popups.length, 1);
        assert.equal(popups[0].closeProtection, canEdit);
        assert.equal(
            popups[0].actions.some((action) => action.id === "save"),
            canEdit,
        );
        assert.equal(popups[0].body, "editor");
    }
});
