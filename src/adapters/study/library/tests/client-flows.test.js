import { createOfflineClientFixture } from "../../../../tooling/reuse/offline-client-fixture.js";
import * as offlineDelivery from "../../../../ui/reuse/offline-delivery.js";
import * as offlineState from "../../../../ui/reuse/offline-state.js";
import * as offlineReadCache from "../../../../ui/reuse/offline-read-cache.js";
import { loadTestModule } from "../../../../tooling/reuse/test-module.ts";
import assert from "node:assert/strict";
import test from "node:test";
import { uiCtx } from "../../../../ui/reuse/ui-ctx.js";
import { mountProvider as mountScopedActions } from "../../../../ui/reuse/scoped-actions.js";
import { createProviderLifecycle } from "../../../../ui/reuse/provider-lifecycle.js";

async function session(testContext, request, dependencies = {}) {
    const offlineContent = loadTestModule(
        new URL(
            "../../../../gateways/study/ui/offline-content.js",
            import.meta.url,
        ),
        {
            "/static/reuse/offline-state.js":
                dependencies.offlineState ?? offlineState,
            "/static/reuse/ui-ctx.js": { uiCtx },
            "/static/reuse/popup.js": {
                openPopup: () => assert.fail("no popup without a page"),
            },
            "/static/reuse/escape-html.js": { escapeHtml: String },
        },
        { structuredClone, console },
    );
    const client = loadTestModule(
        new URL(
            "../../../../gateways/study/ui/library-client.js",
            import.meta.url,
        ),
        {
            "./offline-content.js": offlineContent,
            "/static/reuse/offline-state.js":
                dependencies.offlineState ?? offlineState,
            "/static/reuse/offline-read-cache.js":
                dependencies.offlineReadCache ?? offlineReadCache,
            "/static/reuse/ui-ctx.js": { uiCtx },
            "/static/reuse/offline-delivery.js":
                dependencies.offlineDelivery ?? offlineDelivery,
            "/static/reuse/api-client.js": { apiFetch: request },
        },
        { AbortSignal, URL, Blob, URLSearchParams, crypto },
    );
    const scoped = { scriptUrl: "/scoped.js" };
    const provider = { scriptUrl: "/library.js" };
    const owner = loadTestModule(
        new URL("../ui/provider.js", import.meta.url),
        {
            "/static/gateways/study/library-client.js": client,
            "/static/reuse/i18n.js": { createI18n: async () => ({}) },
            "./app/presentation.js": {
                headingCompositionReferences: (detail) => detail.composition,
            },
        },
    );
    const providers = createProviderLifecycle({
        uiCtx,
        importProvider: async (url) =>
            url === scoped.scriptUrl
                ? { mountProvider: mountScopedActions }
                : {
                      mountProvider: (ctx) =>
                          owner.mountProvider({
                              ...ctx,
                              capabilities: {
                                  ...ctx.capabilities,
                                  get: (id) =>
                                      id === "offline:outbox" &&
                                      dependencies.outbox
                                          ? dependencies.outbox
                                          : ctx.capabilities.get(id),
                              },
                          }),
                  },
    });
    await providers.reconcile([scoped, provider]);
    testContext.after(() => providers.reconcile([]));
    return { client, providers, scoped, provider };
}

test("Library presentation is registered and removed with its provider", async (testContext) => {
    const { providers, scoped, provider } = await session(
        testContext,
        async () => ({ ok: true }),
    );
    const detail = { composition: [{ id: "word", label: "word" }] };
    const presentation = uiCtx.capabilities.get("study:library:presentation");
    assert.equal(presentation.titleComposition(detail, []), detail.composition);
    await providers.reconcile([scoped]);
    assert.equal(
        uiCtx.capabilities.get("study:library:presentation"),
        undefined,
    );
    await providers.reconcile([scoped, provider]);
    assert.equal(
        uiCtx.capabilities
            .get("study:library:presentation")
            .titleComposition(detail, []),
        detail.composition,
    );
});

test("Library creation runs adjustable stages, honors vetoes and reports transport failures", async (testContext) => {
    const calls = [];
    let fail = false;
    const { client } = await session(testContext, async (path, options) => {
        calls.push({ path, options });
        return {
            ok: !fail,
            json: async () =>
                fail
                    ? { error: { code: "forbidden" } }
                    : { data: { id: "created" } },
        };
    });
    const stages = [];
    uiCtx.extendFlow(
        "study:library:createLibraryEntry",
        "before",
        { id: "policy" },
        ({ input }) => {
            stages.push("before");
            if (input.args[1].label === "blocked")
                throw new Error("policy_veto");
            input.args[1].label = "Adjusted";
        },
    );
    uiCtx.extendFlow(
        "study:library:createLibraryEntry",
        "after",
        { id: "observe" },
        ({ data }) => {
            stages.push("after");
            data.result.observed = true;
        },
    );
    const created = await client.createLibraryEntry(
        { scope: "personal" },
        { label: "Draft" },
    );
    assert.deepEqual(created, { id: "created", observed: true });
    assert.equal(JSON.parse(calls[0].options.body).entry.label, "Adjusted");
    assert.deepEqual(stages.splice(0), ["before", "after"]);
    await assert.rejects(
        client.createLibraryEntry({}, { label: "blocked" }),
        /policy_veto/,
    );
    assert.equal(calls.length, 1);
    assert.deepEqual(stages.splice(0), ["before"]);
    fail = true;
    await assert.rejects(
        client.createLibraryEntry({}, { label: "Draft" }),
        /forbidden/,
    );
    assert.deepEqual(stages, ["before"]);
});

test("Library disable aborts requests and stale handles, and remount restores client actions", async (testContext) => {
    let pending = true;
    const { client, providers, scoped, provider } = await session(
        testContext,
        async (_path, { signal }) => {
            if (!pending) return { ok: true, json: async () => ({ data: [] }) };
            return new Promise((_resolve, reject) =>
                signal.addEventListener("abort", () => reject(signal.reason), {
                    once: true,
                }),
            );
        },
    );
    const stale = uiCtx.capabilities.get("study:library:client");
    const request = client.fetchLibrarySchemas("ja");
    const rejected = assert.rejects(request, { name: "AbortError" });
    await new Promise((resolve) => setImmediate(resolve));
    await providers.reconcile([scoped]);
    await rejected;
    await assert.rejects(stale.fetchLibrarySchemas({ args: ["ja"] }), {
        name: "AbortError",
    });
    await assert.rejects(
        client.fetchLibrarySchemas("ja"),
        /library_client_unavailable/,
    );
    pending = false;
    await providers.reconcile([scoped, provider]);
    assert.deepEqual(await client.fetchLibrarySchemas("ja"), []);
});

test("all Library reads, dictionary steps, requests and media mutations use their declared client flow", async (testContext) => {
    const requests = [];
    const { client } = await session(testContext, async (path, options) => {
        requests.push({ path, options });
        return {
            ok: true,
            json: async () => ({ data: { id: "canonical" } }),
            blob: async () => new Blob(["media"]),
        };
    });
    const file = new Blob(["upload"], { type: "image/png" });
    const entry = { label: "Draft" };
    const location = { scope: "personal", scopeId: "owner" };
    const cases = {
        fetchLibrarySchemas: ["ja"],
        fetchLibraryLocations: ["ja"],
        fetchLibraryForms: [],
        fetchLibraryEntries: [
            {
                ...location,
                schemaId: "schema",
                layer: "words",
                entryIds: ["canonical"],
                sourceRecordIds: ["word"],
            },
        ],
        fetchLibraryEntry: ["canonical"],
        fetchViewedLibraryEntryIds: [],
        markLibraryEntriesViewed: [["canonical"]],
        fetchLibraryAudioUrl: [
            "canonical",
            "audio",
            { transformation: ["past"], refresh: true },
        ],
        createLibraryEntry: [location, entry],
        fetchLibraryPushRequests: [{ status: "pending" }],
        fetchSearchableDictionaryProviders: ["ja"],
        searchLibraryDictionary: [entry],
        requestLibraryPromotion: ["canonical", location],
        relocateLibraryEntry: ["canonical", location],
        requestLibraryUpdate: ["canonical", entry],
        reviewLibraryPromotion: ["request", "approve"],
        withdrawLibraryPromotion: ["request"],
        moveLibraryEntryToPersonal: ["canonical"],
        updateLibraryEntry: ["canonical", entry],
        planLibraryEntryDeletion: [["canonical"]],
        deleteLibraryEntries: [["canonical"], { blacklistContentHashes: true }],
        previewLibraryResolution: [location, entry],
        fetchLibraryLookupProviders: [
            { schemaId: "schema", schemaVersion: 1, layer: "words" },
        ],
        fetchLibraryLookupSuggestions: ["dictionary", entry],
        localizeLibraryDefinition: [{ en: "word" }, ["ja"]],
        mergeLibraryEntry: ["canonical", entry],
        importLibraryEntries: [location, { entries: [entry] }],
        dictionarySearchContext: [entry],
        uploadLibraryAudio: [file],
        uploadLibraryImage: [file],
        fetchLibraryImageUrl: [
            "canonical",
            "images",
            0,
            { requestId: "request" },
        ],
        stageLibraryPromotion: ["request", entry],
        discardLibraryImage: ["uploads/image.png"],
    };
    assert.deepEqual(
        Object.keys(cases).sort(),
        Object.keys(client)
            .filter((name) => name !== "registerLibraryClient")
            .sort(),
    );
    const stages = [];
    for (const [name, args] of Object.entries(cases)) {
        for (const stage of ["before", "after"])
            uiCtx.extendFlow(
                `study:library:${name}`,
                stage,
                { id: "extension" },
                () => stages.push(`${name}:${stage}`),
            );
        const result = await client[name](...args);
        if (typeof result === "string" && result.startsWith("blob:"))
            URL.revokeObjectURL(result);
        assert.deepEqual(stages.splice(0), [`${name}:before`, `${name}:after`]);
        assert.equal(requests.at(-1).options.signal.aborted, false);
    }
    assert.equal(requests.length, Object.keys(cases).length);
});

test("Library teardown during an asynchronous after hook rejects the completed request's stale result", async (testContext) => {
    const { client, providers, scoped } = await session(
        testContext,
        async () => ({ ok: true, json: async () => ({ data: [] }) }),
    );
    let enter;
    let release;
    const entered = new Promise((resolve) => {
        enter = resolve;
    });
    const pending = new Promise((resolve) => {
        release = resolve;
    });
    uiCtx.extendFlow(
        "study:library:fetchLibrarySchemas",
        "after",
        { id: "deferred-extension" },
        async () => {
            enter();
            await pending;
        },
    );
    const request = client.fetchLibrarySchemas("ja");
    const rejected = assert.rejects(request, { name: "AbortError" });
    await entered;
    await providers.reconcile([scoped]);
    release();
    await rejected;
});

test("extensions and callers can cancel Library work through their own signals", async (testContext) => {
    let enter;
    let requests = 0;
    const entered = new Promise((resolve) => {
        enter = resolve;
    });
    const { client } = await session(testContext, async (_path, { signal }) => {
        requests++;
        enter();
        return new Promise((_resolve, reject) =>
            signal.addEventListener("abort", () => reject(signal.reason), {
                once: true,
            }),
        );
    });
    const controller = new AbortController();
    uiCtx.extendFlow(
        "study:library:fetchLibrarySchemas",
        "before",
        { id: "extension-signal" },
        ({ input }) => {
            input.signal = controller.signal;
        },
    );
    const request = client.fetchLibrarySchemas("ja");
    const rejected = assert.rejects(request, { name: "AbortError" });
    await entered;
    controller.abort();
    await rejected;
    await assert.rejects(
        client.uploadLibraryImage(new Blob(["image"]), controller.signal),
        { name: "AbortError" },
    );
    assert.equal(requests, 1);
});

test("registered Library flows restore opted-in character data and stop media, dictionary and writes offline", async (testContext) => {
    let disconnected = false;
    let requests = 0;
    const state = {
        isOffline: () => disconnected,
        offlineEnabled: () => true,
        offlineCacheGeneration: () => 0,
    };
    const cache = loadTestModule(
        new URL("../../../../ui/reuse/offline-read-cache.js", import.meta.url),
        {
            "./offline-state.js": state,
            "./offline-policy.js": { offlinePolicy: { allows: () => true } },
        },
        { console },
    );
    const schema = {
        id: "writing",
        metadata: { offline: { cache: "lightweight" } },
    };
    const entries = [
        {
            id: "character",
            schemaId: "writing",
            label: "a",
            fields: { stroke_pattern: { strokes: [] } },
        },
    ];
    const { client } = await session(
        testContext,
        async (path) => {
            requests++;
            return {
                ok: true,
                json: async () => ({
                    data: path.includes("schemas") ? [schema] : entries,
                }),
            };
        },
        { offlineState: state, offlineReadCache: cache },
    );
    await client.fetchLibrarySchemas();
    await client.fetchLibraryEntries({ scope: "global", schemaId: "writing" });
    const count = requests;
    disconnected = true;
    const restored = await client.fetchLibraryEntries({
        scope: "global",
        schemaId: "writing",
    });
    assert.equal(restored[0].id, "character");
    assert.equal(
        (await client.fetchSearchableDictionaryProviders("en")).length,
        0,
    );
    for (const action of [
        () => client.fetchLibraryAudioUrl("character", "audio"),
        () => client.searchLibraryDictionary({ query: "word" }),
        () => client.createLibraryEntry({ scope: "personal" }, {}),
    ])
        await assert.rejects(action(), /offline_operation_unavailable/);
    assert.equal(requests, count);
});

test("viewed-card updates queue through their registered flow and deliver on reconnect", async (testContext) => {
    const requests = [];
    const fixture = createOfflineClientFixture(async (path, options) => {
        requests.push({ path, body: JSON.parse(options.body) });
        return { ok: true };
    });
    const { client } = await session(
        testContext,
        fixture.imports["/static/reuse/api-client.js"].apiFetch,
        {
            outbox: fixture.outbox,
            offlineState: fixture.imports["/static/reuse/offline-state.js"],
            offlineReadCache:
                fixture.imports["/static/reuse/offline-read-cache.js"],
            offlineDelivery:
                fixture.imports["/static/reuse/offline-delivery.js"],
        },
    );
    fixture.disconnect();
    assert.equal(
        (await client.markLibraryEntriesViewed(["character"])).queued,
        true,
    );
    assert.equal(requests.length, 0);
    fixture.reconnect();
    assert.equal((await fixture.outbox.flush()).sent, 1);
    assert.deepEqual(requests[0].body, { entryIds: ["character"] });
});
