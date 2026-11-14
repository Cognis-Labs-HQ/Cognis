import assert from "node:assert/strict";
import {
    loadTestModule,
    importTestModule,
} from "../../../../tooling/reuse/test-module.ts";
import { createOfflineClientFixture } from "../../../../tooling/reuse/offline-client-fixture.js";
import { createSubPageRegistry } from "../../../../ui/reuse/sub-page-registry.js";
import { uiCtx } from "../../../../ui/reuse/ui-ctx.js";
import { replaceMountScope } from "../../../../ui/reuse/mount-scope.js";
import { escapeHtml } from "../../../../ui/reuse/escape-html.js";
import * as explore from "../../ui/reuse/explore.js";

export async function createEntryFixture(context) {
    const window = new EventTarget();
    window.location = { pathname: "/study" };
    const history = { state: { studyLanguageCode: "cy" } };
    const state = {
        languages: [{ code: "cy" }, { code: "fi" }],
        enrolled: ["cy", "fi"],
        schemas: [
            {
                language: "cy",
                layers: [
                    {
                        id: "glyphs",
                        navigationSlug: "symbols",
                        semanticRole: "atomicWritingUnit",
                    },
                ],
            },
            {
                language: "fi",
                layers: [
                    {
                        id: "sounds",
                        navigationSlug: "letters",
                        semanticRole: "atomicWritingUnit",
                    },
                ],
            },
        ],
        routes: [{ base: "/study/explore" }],
        pages: new Map([
            ["cy", [{ id: "custom", pageUrl: "/study/custom" }]],
            ["fi", []],
        ]),
        requests: [],
        mounts: [],
        composers: [],
        toasts: [],
        logs: [],
        stages: [],
        selected: undefined,
        schemaGate: null,
        denial: false,
        navigationAllowed: true,
    };
    const host = createOfflineClientFixture(
        async (path) => {
            state.requests.push(path);
            if (state.denial) return new Response(null, { status: 403 });
            if (path.endsWith("/registered-languages"))
                return Response.json({ data: state.languages });
            if (path.endsWith("/preferences"))
                return Response.json({
                    data: { learningLanguages: state.enrolled },
                });
            const language = /\/languages\/([^/]+)\/modules$/.exec(path)?.[1];
            assert.ok(
                state.languages.some(({ code }) => code === language),
                `Only active providers may be queried: ${path}`,
            );
            return Response.json({ data: state.pages.get(language) ?? [] });
        },
        { window },
    );
    context.after(() => host.controller.abort());
    const document = {
        documentElement: { lang: "en" },
        querySelector: () =>
            state.selected
                ? { dataset: { languageCode: state.selected } }
                : null,
    };
    const globals = {
        ...host.globals,
        window,
        document,
        history,
        AbortController,
        CustomEvent,
    };
    const fail = () => assert.fail("Unrelated UI operation");
    const offline = loadTestModule(
        new URL("../../ui/offline-content.js", import.meta.url),
        {
            "/static/reuse/offline-state.js":
                host.imports["/static/reuse/offline-state.js"],
            "/static/reuse/ui-ctx.js": { uiCtx: host.ctx },
            "/static/reuse/popup.js": { openPopup: fail },
            "/static/reuse/escape-html.js": { escapeHtml },
        },
        globals,
    );
    const navigation = loadTestModule(
        new URL("../../ui/navigation-client.js", import.meta.url),
        {
            ...host.imports,
            "./offline-content.js": offline,
        },
        globals,
    );
    host.ctx.flowExists = uiCtx.flowExists;
    const subPages = createSubPageRegistry();
    host.ctx.capabilities.contribute("ui:subPages", subPages);
    const library = loadTestModule(
        new URL("../../ui/library-client.js", import.meta.url),
        {
            ...host.imports,
            "./offline-content.js": offline,
            "./reuse/library-offline-snapshot.js": {
                registerEnrolledLibrarySnapshots: fail,
            },
        },
        globals,
    );
    host.ctx.capabilities.contribute("study:library:client", {
        fetchLibrarySchemas: async () => {
            const snapshot = structuredClone(state.schemas);
            await state.schemaGate;
            if (state.denial) throw new Error("forbidden");
            return snapshot;
        },
        fetchSearchableDictionaryProviders: async () => [],
    });
    const language = loadTestModule(
        new URL("../../ui/language.js", import.meta.url),
        {
            "/static/reuse/access-role.js": { isAdminScope: () => false },
        },
        globals,
    );
    const subnav = loadTestModule(
        new URL("../../ui/sub-navigation.js", import.meta.url),
        {
            "./navigation-client.js": navigation,
            "./reuse/explore.js": explore,
            "/static/reuse/offline-state.js":
                host.imports["/static/reuse/offline-state.js"],
            "/static/reuse/mount-scope.js": { replaceMountScope },
            "/static/reuse/toast.js": { showToast: fail },
            "/static/reuse/form-builder.js": { createFormBuilder: fail },
            "/static/reuse/escape-html.js": { escapeHtml },
            "/static/reuse/ui-ctx.js": { uiCtx: host.ctx },
            "/static/reuse/spa-route-registry.js": {
                loadSpaRoutes: async () => state.routes,
            },
            "/static/gateways/study/language.js": language,
            "/static/gateways/study/library-client.js": library,
        },
        globals,
    );
    const i18n = { t: (key) => key };
    host.ctx.capabilities.contribute("ui:log", (...args) =>
        state.logs.push(args),
    );
    const navigate = async (path, options) => {
        state.navigation = { path, options };
        if (!state.navigationAllowed) return false;
        history.state = options.state;
        window.location.pathname = path;
        window.dispatchEvent(new Event("cognis:route-will-change"));
        if (path.startsWith("/study/explore/")) {
            const languageCode = path.split("/")[3];
            const model = await subnav.loadStudySubNavigationModel({
                fallbackLanguageCode: languageCode,
            });
            state.selected = model.selectedLanguageCode;
            state.mounts.push({
                path,
                language: model.selectedLanguageCode,
                html: subnav.renderStudySubNavigation({
                    model,
                    currentPath: path,
                    i18n,
                }),
            });
        } else state.mounts.push({ path });
        return true;
    };
    host.ctx.capabilities.contribute("ui:navigate", navigate);
    const entry = loadTestModule(
        new URL("../../ui/entry.js", import.meta.url),
        {
            "./sub-navigation.js": subnav,
            "/static/reuse/offline-state.js":
                host.imports["/static/reuse/offline-state.js"],
            "/static/reuse/offline-identity.js":
                host.imports["/static/reuse/offline-identity.js"],
        },
        globals,
    );
    const contracts = loadTestModule(
        new URL("../../ui/flow-contracts.js", import.meta.url),
        {
            "./entry.js": entry,
            "./navigation-client.js": navigation,
            "./drawing-client.js": { registerDrawingDelivery: () => () => {} },
            "./reuse/favourites-client.js": {
                registerFavouriteClient: () => () => {},
            },
        },
        globals,
    );
    const release = contracts.mountProvider(host.ctx);
    context.after(release);
    for (const stage of ["resolve", "navigate"])
        host.ctx.extendFlow(
            "study:navigation:enter",
            stage,
            { id: `test:${stage}`, order: -1 },
            () => state.stages.push(stage),
        );
    const composer = {
        createPageComposer: (_root, options) => ({
            init: async () => state.composers.push(options),
        }),
    };
    const pageEntry = { mountWhenDirect: async () => {} };
    const mount = await importTestModule(
        new URL("../../ui/study.js", import.meta.url),
        {
            "./offline-page.js": {
                mountOfflineStudyPage: async (_root, options) =>
                    state.composers.push({ offline: true, ...options }),
            },
            "/static/reuse/mount-scope.js": { replaceMountScope },
            "./navigation-client.js": navigation,
            "/static/reuse/offline-state.js":
                host.imports["/static/reuse/offline-state.js"],
            "/static/reuse/api-client.js":
                host.imports["/static/reuse/api-client.js"],
            "/static/reuse/i18n.js": {
                createI18n: async () => i18n,
                applyDocumentTitle: () => {},
            },
            "/static/reuse/page-composer/index.js": composer,
            "/static/reuse/search-util/popup.js": {
                registerSearchIndex: () => {},
            },
            "/static/reuse/page-entry.js": pageEntry,
            "/static/reuse/toast.js": {
                showToast: (...args) => state.toasts.push(args),
            },
            "/static/reuse/escape-html.js": { escapeHtml },
            "/static/reuse/app-router.js": { navigateTo: navigate },
            "/static/gateways/study/sub-navigation.js": subnav,
            "/static/gateways/study/language.js": language,
            "/static/reuse/popup.js": { openPopup: fail },
            "/static/reuse/ui-ctx.js": { uiCtx: host.ctx },
        },
        globals,
    );
    const root = { querySelectorAll: () => [], addEventListener: () => {} };
    return {
        ...host,
        state,
        history,
        window,
        subnav,
        entry,
        root,
        mount: (signal) => mount.mount(root, { signal }),
        enter: (signal = new AbortController().signal) =>
            host.ctx.runFlow("study:navigation:enter", { signal }),
        invalidate: (event = "cognis:module-lifecycle-changed") =>
            window.dispatchEvent(new Event(event)),
        removeNavigate: () =>
            host.ctx.capabilities.remove("ui:navigate", navigate),
    };
}

export function deferred() {
    let resolve;
    const promise = new Promise((complete) => {
        resolve = complete;
    });
    return { promise, resolve };
}
