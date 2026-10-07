import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import test from "node:test";

const schema = {
    id: "test",
    version: 1,
    layers: [
        {
            id: "units",
            relationships: [
                { id: "restrict", onDelete: "restrict" },
                { id: "cascade", onDelete: "cascade" },
                { id: "detach", onDelete: "detach" },
            ],
        },
    ],
};
const card = (id, references = []) => ({
    id,
    schemaId: "test",
    schemaVersion: 1,
    layer: "units",
    label: id,
    references,
    scope: "user",
    scopeId: "alice",
    canDelete: true,
});
const reference = (entryId, relation = "restrict") => ({ entryId, relation });
const strip = (source) =>
    source
        .replace(/import[\s\S]*?from "[^"]+";\n/g, "")
        .replace(/\bexport /g, "");
function scopeContext(result = "personal") {
    const popups = [];
    const context = {
        escapeHtml: (value) => value,
        openPopup: async (options) => {
            popups.push(options);
            return result;
        },
    };
    vm.runInNewContext(
        strip(
            readFileSync(
                new URL("../ui/app/dependency-scope.js", import.meta.url),
                "utf8",
            ),
        ),
        context,
    );
    return { context, popups };
}

test("deletion confirmation includes restricted and grouped dependants but leaves detached cards", async () => {
    const records = [
        card("root"),
        card("child", [reference("root")]),
        {
            ...card("grandchild"),
            referenceGroups: { cascade: [[reference("child", "cascade")]] },
        },
        card("detached", [reference("root", "detach")]),
    ];
    let popup;
    const errors = [];
    const context = {
        planLibraryEntryDeletion: async () => ({
            entryIds: ["root", "child", "grandchild"],
            entries: records.slice(0, 3),
        }),
        escapeHtml: (value) => value,
        showToast: (...args) => errors.push(args),
        openPopup: async (options) => {
            popup = options;
            options.onAction("delete", {
                querySelector: () => ({ checked: false }),
            });
            return "delete";
        },
    };
    vm.runInNewContext(
        strip(
            readFileSync(
                new URL("../ui/app/selection.js", import.meta.url),
                "utf8",
            ),
        ),
        context,
    );
    const root = {
        querySelectorAll: () => [{ dataset: { librarySelectEntry: "root" } }],
    };
    const i18n = { t: (key) => key };
    const request = await context.confirmEntryDeletion(
        root,
        [records[0]],
        [],
        i18n,
    );
    assert.deepEqual(Array.from(request.entryIds), [
        "root",
        "child",
        "grandchild",
    ]);
    assert.ok(popup.body.includes("child"));
    assert.ok(popup.body.includes("grandchild"));
    context.planLibraryEntryDeletion = async () => {
        throw new Error("forbidden");
    };
    assert.equal(
        await context.confirmEntryDeletion(root, records, [schema], i18n),
        null,
    );
    assert.equal(
        errors[0][0],
        "gateway.study.library_delete_dependency_blocked",
    );
});

test("shared creation offers a personal save without mutating references or losing the draft", async () => {
    const { context, popups } = scopeContext();
    const component = card("component");
    const draft = {
        label: "composite",
        references: [reference(component.id)],
        fields: { pronunciation: "reading" },
    };
    const destination = { scope: "global", scopeId: "global" };
    const resolved = await context.resolveCreationScope(
        draft,
        destination,
        [component],
        { t: (key) => key },
    );
    assert.equal(resolved.scope, "user");
    assert.equal(draft.label, "composite");
    assert.equal(draft.references[0].entryId, component.id);
    assert.equal(draft.fields.pronunciation, "reading");
    assert.ok(popups[0].body.includes(component.label));
    const sameClass = { ...component, scope: "class", scopeId: "class-a" };
    assert.equal(
        context.incompatibleDependencies(
            draft,
            { scope: "class", scopeId: "class-a" },
            [sameClass],
        ).length,
        0,
    );
    assert.equal(
        context.incompatibleDependencies(
            draft,
            { scope: "class", scopeId: "class-b" },
            [sameClass],
        ).length,
        1,
    );
    assert.equal(
        context.incompatibleDependencies(draft, destination, [
            { ...component, scope: "global" },
        ]).length,
        0,
    );
});

test("publication assistance submits only valid leaf dependencies, including hidden definitions", async () => {
    const { context } = scopeContext("publish");
    const definition = { ...card("definition"), hidden: true };
    const component = card("component", [reference(definition.id)]);
    const root = card("root", [reference(component.id)]);
    const requests = [];
    const publications = [];
    Object.assign(context, {
        selectedEntryIds: () => [root.id],
        setSelectionMode() {},
        showToast() {},
        requestLibraryPromotion: async (id, destination) => {
            publications.push({ id, destination });
            return {
                id: `request:${id}`,
                sourceEntryId: id,
                status: "pending",
            };
        },
    });
    vm.runInNewContext(
        strip(
            readFileSync(
                new URL("../ui/app/visibility-actions.js", import.meta.url),
                "utf8",
            ),
        ),
        context,
    );
    const actions = context.createLibraryVisibilityActions({
        root: {},
        getEntries: () => [root, component, definition],
        requests,
        i18n: { t: (key) => key },
        getLocations: () => ({ readable: [] }),
    });
    await actions.publish("global");
    assert.deepEqual(
        publications.map(({ id }) => id),
        ["definition"],
    );
    assert.equal(requests[0].source.id, definition.id);
    assert.equal(requests[0].canWithdraw, true);
    await actions.publish("global");
    assert.equal(publications.length, 1);
});
