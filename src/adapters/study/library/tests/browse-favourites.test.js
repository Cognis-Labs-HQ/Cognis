import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";

test("favourite children render independently of unfavourited ancestors, and provider layout restores", async () => {
    const child = { dataset: { libraryEntry: "child" } };
    const parent = { dataset: { libraryEntry: "parent" } };
    const control = { getAttribute: () => (only ? "true" : "false") };
    let only = true;
    const empty = { hidden: true };
    const node = {
        querySelectorAll: () => [parent, child],
        matches: () => false,
    };
    const grid = {
        children: [node],
        firstElementChild: node,
        innerHTML: "",
        replaceChildren(...nodes) {
            this.children = nodes;
            this.firstElementChild = nodes[0];
        },
        append(n) {
            this.children = this.children.filter((node) => node !== n);
            this.children.push(n);
        },
    };
    node.parentElement = grid;
    const panel = {
        querySelector: (selector) =>
            ({
                "[data-study-favourites-only]": control,
                ".library-entry-grid": grid,
                ".library-filter-empty": empty,
            })[selector],
    };
    let change;
    const root = {
        querySelectorAll: () => [panel],
        addEventListener: (type, fn) => {
            if (type === "change") change = fn;
        },
    };
    const context = vm.createContext({
        loadFavourites: async () => ({
            has: (_kind, id) => id === "child",
            refresh() {},
            bind() {},
        }),
        sortItems: (entries) => entries,
        layerForEntry: () => ({ id: "words" }),
        renderEntryCard: (entry, _layer, _entries, _schema, placements) => {
            assert.equal(placements.size, 0);
            return `<card>${entry.id}</card>`;
        },
        refreshLibraryFilterResults() {},
        showToast: () => assert.fail("Unexpected load error"),
        MutationObserver: class {
            observe() {}
            disconnect() {}
        },
        root,
        entries: [
            { id: "parent", schemaId: "test" },
            { id: "child", schemaId: "test" },
        ],
        schemas: [{ id: "test" }],
    });
    const source = readFileSync(
        new URL("../ui/app/browse-controls.js", import.meta.url),
        "utf8",
    )
        .replace(/import[\s\S]*?from "[^"]+";\n/g, "")
        .replace(/\bexport /g, "");
    await vm.runInContext(
        source + "\nbindBrowseControls(root, entries, schemas, {})",
        context,
    );
    assert.equal(grid.innerHTML, "<card>child</card>");
    only = false;
    grid.children = [];
    grid.firstElementChild = null;
    node.parentElement = null;
    await change({ target: { matches: () => true } });
    assert.equal(grid.children[0], node);
});
