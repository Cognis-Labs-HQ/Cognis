import assert from "node:assert/strict";
import test from "node:test";
import vm from "node:vm";
import { readFileSync } from "node:fs";
import { entryEditMode } from "../ui/app/editability.js";

const source = readFileSync(
    new URL("../ui/app/admin-interactions/index.js", import.meta.url),
    "utf8",
).split("export function bindAdminLibraryInteractions")[1];

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
        vm.runInContext(
            "function bindAdminLibraryInteractions" + source,
            context,
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
