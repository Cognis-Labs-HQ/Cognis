import assert from "node:assert/strict";
import test from "node:test";
import { LibraryService } from "../service/index.js";
import { validateDependencyVisibility } from "../service/dependencies.js";
import type {
    LibraryEntry,
    LibraryEntryInput,
    LibraryLocation,
    LibrarySchema,
} from "../types.js";

const schema: LibrarySchema = {
    id: "scope-test",
    version: 1,
    language: "x-test",
    namespace: "test",
    metadata: { labels: { en: "Scope Test" } },
    layers: [
        {
            id: "units",
            metadata: { labels: { en: "Units" } },
            relationships: [
                {
                    id: "parts",
                    targetLayer: "units",
                    metadata: { labels: { en: "Parts" } },
                    onDelete: "restrict",
                },
                {
                    id: "groups",
                    targetLayer: "units",
                    metadata: { labels: { en: "Groups" } },
                    onDelete: "restrict",
                    grouped: true,
                },
            ],
        },
    ],
};
const actor = { accountId: "alice", role: "user" as const };
const admin = { accountId: "admin", role: "admin" as const };
function entry(
    id: string,
    location: LibraryLocation,
    references: LibraryEntry["references"] = [],
): LibraryEntry {
    return {
        id,
        schemaId: schema.id,
        schemaVersion: 1,
        layer: "units",
        language: "x-test",
        label: id,
        fields: {},
        scope: location.scope,
        scopeId: location.scopeId!,
        createdBy: "alice",
        createdAt: "2026-01-01",
        updatedAt: "2026-01-01",
        references,
    };
}
function harness(records: LibraryEntry[], requests: object[] = []) {
    const recordsById = new Map(records.map((value) => [value.id, value]));
    const mutations: string[] = [];
    const store = {
        transaction: async <T>(operation: () => Promise<T>) => {
            const length = mutations.length;
            try {
                return await operation();
            } catch (error) {
                mutations.splice(length);
                throw error;
            }
        },
        resolveDeletionCascade: async () => records.map(({ id }) => id),
        saveSchema: async () => {},
        list: async () => [],
        get: async (id: string) => recordsById.get(id) ?? null,
        referencesFor: async (id: string) =>
            records.filter((value) =>
                value.references?.some(({ entryId }) => entryId === id),
            ),
        listPushRequests: async () => requests,
        getPush: async () => requests[0],
        create: async (location: LibraryLocation, input: LibraryEntryInput) => {
            mutations.push("create");
            return { ...entry("created", location), ...input };
        },
        update: async (id: string, input: LibraryEntryInput) => {
            mutations.push("update");
            return { ...recordsById.get(id), ...input };
        },
        move: async (id: string, location: LibraryLocation) => {
            mutations.push("move");
            return { ...recordsById.get(id), ...location };
        },
        createPush: async () => {
            mutations.push("request");
            return { id: "request" };
        },
        reviewPush: async () => {
            mutations.push("review");
        },
        deleteEntries: async (
            _ids: string[],
            _actor: string,
            _blacklist: boolean,
            authorize: (entries: LibraryEntry[]) => Promise<void>,
        ) => {
            await authorize(records);
            mutations.push("delete");
            return records.map(({ id }) => id);
        },
    };
    const library = new LibraryService(store as never, {
        canRead: async (id) => id === "class-a",
        canWrite: async (id) => id === "class-a",
    });
    return {
        library,
        mutations,
        recordsById,
        prepare: () => library.registerSchema(schema),
    };
}
const ref = (id: string) => ({ entryId: id, relation: "parts" });
const input = (label: string, id: string): LibraryEntryInput => ({
    schemaId: schema.id,
    layer: "units",
    label,
    fields: {},
    references: [ref(id)],
});

test("creation and edits enforce scope visibility and ACLs for flat and grouped dependencies", async () => {
    const privateCard = entry("private", { scope: "user", scopeId: "alice" });
    const shared = entry("shared", { scope: "global", scopeId: "global" });
    const classCard = entry("class", { scope: "class", scopeId: "class-a" });
    const foreign = entry("foreign", { scope: "user", scopeId: "bob" });
    const { library, mutations, prepare } = harness([
        privateCard,
        shared,
        classCard,
        foreign,
    ]);
    await prepare();
    await library.create(
        actor,
        { scope: "user" },
        input("personal", shared.id),
    );
    await library.create(
        actor,
        { scope: "class", scopeId: "class-a" },
        input("class-composite", classCard.id),
    );
    await library.create(
        admin,
        { scope: "global" },
        input("global-composite", shared.id),
    );
    await assert.rejects(
        library.create(
            admin,
            { scope: "global" },
            input("private-dependency", privateCard.id),
        ),
        /forbidden|reference_visibility_too_low/,
    );
    await assert.rejects(
        library.create(
            actor,
            { scope: "class", scopeId: "class-a" },
            input("narrow-dependency", privateCard.id),
        ),
        /reference_visibility_too_low/,
    );
    await assert.rejects(
        library.create(
            actor,
            { scope: "user" },
            input("foreign-dependency", foreign.id),
        ),
        /forbidden/,
    );
    await assert.rejects(
        library.create(
            actor,
            { scope: "class", scopeId: "class-b" },
            input("wrong-class", shared.id),
        ),
        /forbidden/,
    );
    await assert.rejects(
        library.update(admin, shared.id, {
            ...input("edited", privateCard.id),
            references: [],
            referenceGroups: {
                groups: [{ entryId: privateCard.id, relation: "groups" }].map(
                    (reference) => [reference],
                ),
            },
        }),
        /forbidden|reference_visibility_too_low/,
    );
    assert.deepEqual(mutations, ["create", "create", "create"]);
});

test("publication and update requests reject private dependencies before queuing", async () => {
    const component = entry("private", { scope: "user", scopeId: "alice" });
    const source = entry("source", { scope: "user", scopeId: "alice" }, [
        ref(component.id),
    ]);
    const global = entry("global", { scope: "global", scopeId: "global" });
    const { library, mutations, prepare } = harness([
        component,
        source,
        global,
    ]);
    await prepare();
    await assert.rejects(
        library.requestPush(actor, source.id, { scope: "global" }),
        /reference_visibility_too_low/,
    );
    await assert.rejects(
        library.requestPush(actor, source.id, {
            scope: "class",
            scopeId: "class-a",
        }),
        /reference_visibility_too_low/,
    );
    await assert.rejects(
        library.requestUpdate(actor, global.id, input("edited", component.id)),
        /reference_visibility_too_low/,
    );
    assert.deepEqual(mutations, []);
});

test("approval rechecks dependencies changed after request submission", async () => {
    const component = entry("component", { scope: "user", scopeId: "alice" });
    const source = entry("source", { scope: "user", scopeId: "alice" }, [
        ref(component.id),
    ]);
    const request = {
        id: "request",
        sourceEntryId: source.id,
        destination: { scope: "global", scopeId: "global" },
        requestedBy: "alice",
        status: "pending",
    };
    const { library, mutations, prepare } = harness(
        [component, source],
        [request],
    );
    await prepare();
    await assert.rejects(
        library.reviewPush(admin, request.id, "approved"),
        /forbidden|reference_visibility_too_low/,
    );
    assert.deepEqual(mutations, []);
    await library.reviewPush(admin, request.id, "rejected");
    assert.deepEqual(mutations, ["review"]);
});

test("shared dependants and pending publication requests prevent demotion", async () => {
    const component = entry("component", {
        scope: "global",
        scopeId: "global",
    });
    const source = entry("source", { scope: "global", scopeId: "global" }, [
        ref(component.id),
    ]);
    const h = harness([component, source]);
    await assert.rejects(
        h.library.moveToPersonal(admin, component.id),
        /entry_required_by_shared_content/,
    );
    assert.deepEqual(h.mutations, []);
    const privateSource = {
        ...source,
        scope: "user" as const,
        scopeId: "alice",
    };
    const pending = harness(
        [component, privateSource],
        [
            {
                sourceEntryId: source.id,
                destination: { scope: "global", scopeId: "global" },
                status: "pending",
            },
        ],
    );
    await assert.rejects(
        pending.library.moveToPersonal(admin, component.id),
        /request_pending/,
    );
    assert.deepEqual(pending.mutations, []);
});

test("deletion authorizes every dependent and blocks pending cascade sources", async () => {
    const root = entry("root", { scope: "user", scopeId: "alice" });
    const foreign = entry("foreign", { scope: "user", scopeId: "bob" });
    const h = harness([root, foreign]);
    await assert.rejects(
        h.library.deleteEntries(actor, [root.id], false),
        /forbidden/,
    );
    await assert.rejects(
        h.library.deleteEntries(admin, [root.id], false),
        /forbidden/,
    );
    assert.deepEqual(h.mutations, []);
    const child = entry("child", { scope: "user", scopeId: "alice" });
    const pending = harness(
        [root, child],
        [{ sourceEntryId: child.id, status: "pending" }],
    );
    await assert.rejects(
        pending.library.deleteEntries(actor, [root.id], false),
        /request_pending/,
    );
    assert.deepEqual(pending.mutations, []);
    const owned = harness([root, child]);
    assert.deepEqual(
        await owned.library.deleteEntries(actor, [root.id, child.id], false),
        [root.id, child.id],
    );
});

test("scope validation checks every edge and rejects composition cycles during editing", async () => {
    const personal = entry("personal", { scope: "user", scopeId: "alice" });
    const invalidGlobal = entry(
        "global",
        { scope: "global", scopeId: "global" },
        [ref(personal.id)],
    );
    const records = new Map(
        [personal, invalidGlobal].map((value) => [value.id, value]),
    );
    await assert.rejects(
        validateDependencyVisibility(
            input("personal-parent", invalidGlobal.id),
            { scope: "user", scopeId: "alice" },
            async (id) => records.get(id) ?? null,
        ),
        /reference_visibility_too_low/,
    );
    personal.references = [ref(invalidGlobal.id)];
    await assert.rejects(
        validateDependencyVisibility(
            input("cycle", personal.id),
            { scope: "global", scopeId: "global" },
            async (id) => records.get(id) ?? null,
            personal.id,
        ),
        /reference_cycle/,
    );
});

test("class-scoped publication succeeds with compatible components and permission hints match class ACLs", async () => {
    const component = entry("component", {
        scope: "class",
        scopeId: "class-a",
    });
    const source = entry("source", { scope: "user", scopeId: "alice" }, [
        ref(component.id),
    ]);
    const h = harness([source, component]);
    await h.prepare();
    await h.library.requestPush(actor, source.id, {
        scope: "class",
        scopeId: "class-a",
    });
    assert.deepEqual(h.mutations, ["request"]);
    const read = await h.library.read(
        { accountId: "teacher", role: "teacher" },
        component.id,
    );
    assert.equal(read?.canEdit, true);
    assert.equal(read?.canDelete, true);
    assert.equal(read?.editRequiresReview, false);
});

test("protected dependencies and self-referential edits fail without mutating cards", async () => {
    const root = entry("root", { scope: "user", scopeId: "alice" });
    const protectedChild = {
        ...entry("child", { scope: "user", scopeId: "alice" }),
        protected: true,
    };
    const h = harness([root, protectedChild]);
    await assert.rejects(
        h.library.deleteEntries(actor, [root.id], false),
        /protected_content/,
    );
    await h.prepare();
    await assert.rejects(
        h.library.update(actor, root.id, input("cycle", root.id)),
        /reference_cycle/,
    );
    assert.deepEqual(h.mutations, []);
    const created = await h.library.create(
        actor,
        { scope: "user" },
        { schemaId: schema.id, layer: "units", label: "new", fields: {} },
    );
    assert.equal(created.canDelete, true);
    assert.equal(created.canEdit, true);
});

test("editing a pending publication cannot introduce private components", async () => {
    const component = entry("private", { scope: "user", scopeId: "alice" });
    const source = entry("source", { scope: "user", scopeId: "alice" });
    const h = harness(
        [source, component],
        [
            {
                sourceEntryId: source.id,
                destination: { scope: "global", scopeId: "global" },
                status: "pending",
            },
        ],
    );
    await h.prepare();
    await assert.rejects(
        h.library.update(actor, source.id, input("changed", component.id)),
        /reference_visibility_too_low/,
    );
    assert.deepEqual(h.mutations, []);
});

test("creation authorizes its scope before invoking extension flows", async () => {
    const calls: string[] = [];
    const library = new LibraryService({} as never, undefined, {
        run: async () => {
            calls.push("create-flow");
        },
    } as never);
    await assert.rejects(
        library.create(
            actor,
            { scope: "global" },
            input("unauthorized", "component"),
        ),
        /forbidden/,
    );
    assert.deepEqual(calls, []);
});

test("deletion preflight includes unseen dependants and refuses inaccessible cards without mutation", async () => {
    const cards = [
        entry("root", { scope: "user", scopeId: "alice" }),
        entry("hidden", { scope: "user", scopeId: "alice" }),
    ];
    const { library, mutations } = harness(cards);
    await library.registerSchema(schema);
    assert.deepEqual(await library.planDeletion(actor, ["root"]), {
        entryIds: ["root", "hidden"],
        entries: [
            { id: "root", label: "root" },
            { id: "hidden", label: "hidden" },
        ],
    });
    cards[1].scopeId = "bob";
    await assert.rejects(library.planDeletion(actor, ["root"]), /forbidden/);
    assert.deepEqual(mutations, []);
});
