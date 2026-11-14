import assert from "node:assert/strict";
import {
    copyFile,
    mkdtemp,
    mkdir,
    readFile,
    rm,
    writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import vm from "node:vm";
import { JSDOM } from "jsdom";
import { createDocsRoutes } from "../../../api/routes/docs/index.ts";
import {
    importTestModule,
    loadTestModule,
} from "../../../tooling/reuse/test-module.ts";
import { escapeHtml } from "../../reuse/escape-html.js";
import { guides } from "../../app/docs/guides.js";

export async function fixture(
    context,
    { locale = "de", missingEnglish = false } = {},
) {
    const catalog = JSON.parse(
        await readFile(new URL("./catalog.json", import.meta.url), "utf8"),
    );
    const directory = await mkdtemp(join(tmpdir(), "cognis-docs-labels-"));
    context.after(() => rm(directory, { recursive: true, force: true }));
    const sourceRoot = join(directory, "external-modules");
    const archiveRoot = join(directory, "archive");
    for (const module of catalog) {
        const moduleRoot = join(sourceRoot, module.uuid);
        await mkdir(join(moduleRoot, "docs"), { recursive: true });
        await mkdir(join(moduleRoot, "assets"));
        await copyFile(
            new URL("./fixtures/bootstrap.js", import.meta.url),
            join(moduleRoot, "bootstrap.js"),
        );
        await copyFile(
            new URL("./fixtures/icon.svg", import.meta.url),
            join(moduleRoot, "assets/icon.svg"),
        );
        await copyFile(
            new URL("./fixtures/icon.svg", import.meta.url),
            join(moduleRoot, "assets/banner.svg"),
        );
        await writeFile(join(moduleRoot, "routes.json"), "[]");
        await writeFile(
            join(moduleRoot, "package.json"),
            JSON.stringify({
                name: "Internal package label",
                type: "module",
                version: "1.0.0",
            }),
        );
        if (module.name)
            await writeFile(
                join(moduleRoot, "manifest.json"),
                JSON.stringify({
                    uuid: module.uuid,
                    id: module.id,
                    name: module.name,
                    class: "extension",
                    entrypoints: { bootstrap: "./bootstrap.js" },
                    assets: {
                        icon: "assets/icon.svg",
                        banner: "assets/banner.svg",
                    },
                    version: "1.0.0",
                    ui: {
                        stringsBaseUrl: `/static/modules/${module.id}/languages`,
                        preferences: [{ key: "private-config" }],
                    },
                    config: { credential: "fixture-secret" },
                    enabled: false,
                }),
            );
        for (const [slug, title] of Object.entries(module.documents)) {
            await writeFile(
                join(moduleRoot, "docs", `${slug}.en.md`),
                `# ${title}\n\nDocument content.`,
            );
        }
    }
    const logs = [];
    const route = createDocsRoutes({
        sourceRoot,
        archiveRoot,
        log: (...args) => logs.push(args),
    });
    const requests = [];
    async function request(path) {
        requests.push(path);
        let status;
        let body;
        const handled = await route(
            { method: "GET" },
            {
                writeHead(value) {
                    status = value;
                },
                end(value) {
                    body = JSON.parse(value);
                },
            },
            new URL(path, "https://docs.example"),
        );
        assert.equal(handled, true);
        return new Response(JSON.stringify(body), { status });
    }
    const window = new JSDOM('<!doctype html><main id="app"></main>', {
        url: "https://docs.example/docs",
        pretendToBeVisual: true,
    }).window;
    context.after(() => window.close());
    const document = window.document;
    const xmlRequests = [];
    let beforeBundle = async () => {};
    async function fetchStrings(path) {
        xmlRequests.push(path);
        await beforeBundle(path);
        if (path.startsWith("/static/languages/")) {
            const language = path.split("/")[3];
            return new Response(
                await readFile(
                    new URL(
                        `../../languages/${language}/strings.xml`,
                        import.meta.url,
                    ),
                    "utf8",
                ),
            );
        }
        const match = path.match(
            /^\/static\/modules\/([^/]+)\/(?:[a-zA-Z0-9._-]+\/)+([a-z]{2})\/strings\.xml$/,
        );
        const module = catalog.find((entry) => entry.id === match?.[1]);
        if (!module)
            throw new Error(`Unexpected public locale request: ${path}`);
        const label =
            missingEnglish && module.id === "dictionary"
                ? ""
                : (module.labels[match[2]] ?? "");
        return new Response(
            `<resources><string name="${module.name}">${label}</string></resources>`,
        );
    }
    const sandbox = vm.createContext({
        window,
        document,
        localStorage: window.localStorage,
        navigator: { languages: [locale] },
        DOMParser: window.DOMParser,
        console,
        URL,
        Response,
        fetch: fetchStrings,
    });
    const i18n = loadTestModule(
        new URL("../../reuse/i18n.js", import.meta.url),
        {
            "./ui-language-state.js": {
                activeUiLanguage: () => locale,
                enabledUiLanguages: () => ["en", "de"],
            },
            "./api-client.js": {
                apiFetch: request,
                requestTargetsApi: (path) => path.startsWith("/api/"),
            },
        },
        sandbox,
    );
    const presentation = loadTestModule(
        new URL("../../reuse/presentation.js", import.meta.url),
        { "./i18n.js": i18n },
        sandbox,
    );
    const sideMenu = loadTestModule(
        new URL("../../reuse/side-menu.js", import.meta.url),
        {
            "./escape-html.js": { escapeHtml },
            "./ui-ctx.js": { uiCtx: { capabilities: { contribute() {} } } },
        },
        sandbox,
    );
    const docsClient = loadTestModule(
        new URL("../../reuse/docs-client.js", import.meta.url),
        {
            "./api-client.js": { apiFetch: request },
            "./presentation.js": presentation,
        },
        sandbox,
    );
    const globalSearch = loadTestModule(
        new URL("../../reuse/search-util/docs-index.js", import.meta.url),
        {
            "../ui-language-state.js": { activeUiLanguage: () => locale },
            "../i18n.js": i18n,
            "../docs-client.js": docsClient,
        },
        vm.createContext({
            window,
            document,
            localStorage: window.localStorage,
            console,
            fetch: request,
        }),
    );
    let searchProvider;
    let composerOptions;
    const page = await importTestModule(
        new URL("../../app/docs/index.js", import.meta.url),
        {
            "./guides.js": { guides },
            "../../reuse/docs-client.js": docsClient,
            "../../reuse/i18n.js": i18n,
            "../../reuse/markdown-document.js": {
                loadMarkdownDocumentHtml: async (path) => {
                    const response = await request(path);
                    if (!response.ok) throw new Error("Document unavailable");
                    return `<h1>${escapeHtml((await response.json()).data.markdown)}</h1>`;
                },
            },
            "../../reuse/page-composer/index.js": {
                createPageComposer(root, options) {
                    composerOptions = options;
                    return {
                        async init() {
                            root.innerHTML =
                                options.toolbar
                                    .map((entry) => entry.render())
                                    .join("") +
                                options.elements
                                    .map((entry) => entry.render())
                                    .join("");
                            options.onRender();
                        },
                    };
                },
            },
            "../../reuse/page-entry.js": { mountWhenDirect: async () => {} },
            "../../reuse/app-router.js": {
                navigateTo: async () =>
                    assert.fail("Unexpected outside navigation"),
            },
            "../../reuse/search-util/popup.js": {
                registerSearchIndex(id, provider) {
                    assert.equal(id, "docs");
                    searchProvider = provider;
                },
            },
            "../../reuse/search-util/indexing.js": {
                htmlToSearchText: (html) => html.replace(/<[^>]+>/g, ""),
            },
            "../../reuse/side-menu.js": sideMenu,
        },
        sandbox,
    );
    const root = document.querySelector("#app");
    const mount = () => {
        const scope = new window.AbortController();
        context.after(() => scope.abort());
        return { scope, ready: page.mount(root, { signal: scope.signal }) };
    };
    return {
        setBeforeBundle: (callback) => {
            beforeBundle = callback;
        },
        selectLocale: (nextLocale) => {
            locale = nextLocale;
        },
        logs,
        catalog,
        sourceRoot,
        archiveRoot,
        root,
        window,
        request,
        requests,
        xmlRequests,
        mount,
        globalSearch: async () =>
            (await globalSearch.collectGlobalDocsSearchGroups()).flatMap(
                (group) => group.items,
            ),
        search: async () =>
            (await searchProvider()).flatMap((group) => group.items),
        labels: () =>
            [...root.querySelectorAll("[data-side-menu-group] > summary")].map(
                (element) => element.textContent,
            ),
        composerOptions: () => composerOptions,
    };
}
