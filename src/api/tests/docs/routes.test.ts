import {
    initializeDocsStore,
    readStoredMarkdown,
} from "../../routes/docs/store.js";
import { discoverDocSources } from "../../routes/docs/sources.js";
import test from "node:test";
import assert from "node:assert/strict";
import {
    mkdtemp,
    mkdir,
    readdir,
    rm as removePath,
    stat,
    writeFile,
    rename,
} from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import {
    createDocsRoutes,
    resolveDocsArchiveRoot,
} from "../../routes/docs/index.js";

test("docs archive defaults to a writable user path outside containers", () => {
    assert.equal(
        resolveDocsArchiveRoot({}, "/home/example"),
        "/home/example/.cognis/docs-archive",
    );
    assert.equal(
        resolveDocsArchiveRoot({
            COGNIS_CLI_TOKEN_PATH: "/app/config/cli-access.token",
        }),
        "/app/config/docs-archive",
    );
    assert.equal(
        resolveDocsArchiveRoot({
            COGNIS_DOCS_ARCHIVE_DIR: "/mnt/docs",
            COGNIS_CLI_TOKEN_PATH: "/app/config/cli-access.token",
        }),
        "/mnt/docs",
    );
});

async function request(
    route: ReturnType<typeof createDocsRoutes>,
    path: string,
) {
    let status = 0;
    let body = "";
    await route(
        { method: "GET" } as any,
        {
            writeHead(code: number) {
                status = code;
            },
            end(payload: string) {
                body = payload;
            },
        } as any,
        new URL(`http://localhost${path}`),
    );
    return { status, body: JSON.parse(body) };
}

function manifest(version: string, name = "Example") {
    return JSON.stringify({
        name,
        version,
        documentation: {
            readme: "docs/README.en.md",
            usage: "docs/USAGE.en.md",
            technical: "docs/TECHNICAL.en.md",
        },
    });
}

async function writeBundle(docsRoot: string, info: string, core = false) {
    await mkdir(docsRoot, { recursive: true });
    await writeFile(join(docsRoot, core ? "INFO.en.md" : "README.en.md"), info);
    await writeFile(
        join(docsRoot, "USAGE.en.md"),
        "# Usage\n\nConcrete usage procedure.",
    );
    await writeFile(
        join(docsRoot, "TECHNICAL.en.md"),
        "# Technical\n\nPublic interfaces.",
    );
}

test("docs snapshots manifest versions across software starts", async () => {
    const fixtureRoot = await mkdtemp(join(tmpdir(), "cognis-docs-"));
    const sourceRoot = join(fixtureRoot, "src");
    const componentRoot = join(sourceRoot, "gateways", "example");
    const docsRoot = join(componentRoot, "docs");
    const archiveRoot = join(fixtureRoot, "archive");
    await mkdir(docsRoot, { recursive: true });
    await writeFile(join(componentRoot, "package.json"), manifest("1.0.0"));
    await writeBundle(docsRoot, "# Example\n\nFirst");

    await request(
        createDocsRoutes({ sourceRoot, archiveRoot }),
        "/api/v1/docs/latest/gateways/example",
    );
    await writeFile(join(componentRoot, "package.json"), manifest("1.1.0"));
    await writeBundle(docsRoot, "# Example\n\nSecond");
    const restartedRoute = createDocsRoutes({ sourceRoot, archiveRoot });

    const index = await request(restartedRoute, "/api/v1/docs");
    assert.deepEqual(index.body.data[0].versions, ["1.1.0", "1.0.0"]);
    assert.equal(
        index.body.data[0].path,
        "/api/v1/docs/latest/gateways/example",
    );
    const latest = await request(
        restartedRoute,
        "/api/v1/docs/latest/gateways/example",
    );
    const historical = await request(
        restartedRoute,
        "/api/v1/docs/1.0.0/gateways/example",
    );
    assert.match(latest.body.data.markdown, /Second/);
    assert.match(historical.body.data.markdown, /First/);

    await removePath(componentRoot, { recursive: true, force: true });
    const routeAfterRemoval = createDocsRoutes({ sourceRoot, archiveRoot });
    const indexAfterRemoval = await request(routeAfterRemoval, "/api/v1/docs");
    const archivedEntry = indexAfterRemoval.body.data.find(
        (entry: { slug: string }) => entry.slug === "gateways/example",
    );
    assert.deepEqual(archivedEntry.versions, ["1.1.0", "1.0.0"]);
    const removedHistorical = await request(
        routeAfterRemoval,
        "/api/v1/docs/1.0.0/gateways/example",
    );
    assert.equal(removedHistorical.status, 200);
    assert.match(removedHistorical.body.data.markdown, /First/);
    await removePath(fixtureRoot, { recursive: true, force: true });
});

test("docs refresh archived content for the installed version", async () => {
    const fixtureRoot = await mkdtemp(join(tmpdir(), "cognis-docs-refresh-"));
    const sourceRoot = join(fixtureRoot, "src");
    const componentRoot = join(sourceRoot, "gateways", "example");
    const docsRoot = join(componentRoot, "docs");
    const archiveRoot = join(fixtureRoot, "archive");
    await mkdir(docsRoot, { recursive: true });
    await writeFile(join(componentRoot, "package.json"), manifest("1.0.0"));
    await writeBundle(docsRoot, "# Example\n\nOld link");
    const route = createDocsRoutes({ sourceRoot, archiveRoot });
    await request(route, "/api/v1/docs/latest/gateways/example");
    const archivedPath = join(
        archiveRoot,
        "gateways",
        "example",
        "1.0.0",
        "bundle.json",
    );
    const initialArchive = await stat(archivedPath);
    await request(route, "/api/v1/docs/latest/gateways/example");
    assert.equal((await stat(archivedPath)).ino, initialArchive.ino);

    await writeBundle(docsRoot, "# Example\n\nCorrected link");
    const refreshed = await request(
        createDocsRoutes({ sourceRoot, archiveRoot }),
        "/api/v1/docs/latest/gateways/example",
    );

    assert.match(refreshed.body.data.markdown, /Corrected link/);
    assert.doesNotMatch(refreshed.body.data.markdown, /Old link/);
    await removePath(fixtureRoot, { recursive: true, force: true });
});

test("docs route handles docs index with markdown slugs", async () => {
    const route = createDocsRoutes();
    let status = 0;
    let body = "";
    const handled = await route(
        { method: "GET" } as any,
        {
            writeHead(code: number) {
                status = code;
            },
            end(payload: string) {
                body = payload;
            },
        } as any,
        new URL("http://localhost/api/v1/docs"),
    );
    assert.equal(handled, true);
    assert.equal(status, 200);
    assert.match(body, /"slug":"ui"/);
});

test("docs route discovers external module docs and changelogs", async () => {
    const fixtureRoot = await mkdtemp(join(tmpdir(), "cognis-external-docs-"));
    const sourceRoot = join(fixtureRoot, "src");
    const externalRoot = join(fixtureRoot, "external-modules");
    const moduleRoot = join(externalRoot, "module-uuid");
    await mkdir(join(sourceRoot, "docs"), { recursive: true });
    await mkdir(join(moduleRoot, "docs", "changelog"), { recursive: true });
    await writeFile(
        join(sourceRoot, "package.json"),
        JSON.stringify({ version: "1.0.0" }),
    );
    await writeBundle(join(sourceRoot, "docs"), "# Core\n", true);
    await writeFile(
        join(moduleRoot, "package.json"),
        manifest("2.0.0", "Weather Module"),
    );
    await writeBundle(join(moduleRoot, "docs"), "# External module\n");
    await writeFile(
        join(moduleRoot, "docs", "changelog", "2.0.0.en.md"),
        "# External release\n",
    );
    try {
        const response = await request(
            createDocsRoutes({
                sourceRoot: [sourceRoot, externalRoot],
                archiveRoot: join(fixtureRoot, "archive"),
            }),
            "/api/v1/docs",
        );
        const slugs = response.body.data.map(
            (entry: { slug: string }) => entry.slug,
        );
        assert.ok(slugs.includes("module-uuid"));
        assert.ok(slugs.includes("changelog/module-uuid/2.0.0"));
        const moduleChangelog = response.body.data.find(
            (entry: { slug: string }) =>
                entry.slug === "changelog/module-uuid/2.0.0",
        );
        assert.equal(moduleChangelog.sourceName, "Weather Module");
    } finally {
        await removePath(fixtureRoot, { recursive: true, force: true });
    }
});

test("docs route supports slug lookup", async () => {
    const route = createDocsRoutes();
    let status = 0;
    let body = "";
    const handled = await route(
        { method: "GET" } as any,
        {
            writeHead(code: number) {
                status = code;
            },
            end(payload: string) {
                body = payload;
            },
        } as any,
        new URL("http://localhost/api/v1/docs/ui"),
    );
    assert.equal(handled, true);
    assert.equal(status, 200);
    assert.match(body, /UI/);
});

test("docs route returns group and title metadata", async () => {
    const route = createDocsRoutes();
    let status = 0;
    let body = "";
    await route(
        { method: "GET" } as any,
        {
            writeHead(code: number) {
                status = code;
            },
            end(payload: string) {
                body = payload;
            },
        } as any,
        new URL("http://localhost/api/v1/docs"),
    );
    assert.equal(status, 200);
    const parsed = JSON.parse(body);
    const uiEntry = parsed.data.find((document: any) => document.slug === "ui");
    assert.ok(uiEntry, "ui slug present");
    assert.ok("group" in uiEntry, "group field present");
    assert.ok("title" in uiEntry, "title field present");
});

test("docs route falls back to English when requested lang is missing", async () => {
    const route = createDocsRoutes();
    let status = 0;
    let body = "";
    const handled = await route(
        { method: "GET" } as any,
        {
            writeHead(code: number) {
                status = code;
            },
            end(payload: string) {
                body = payload;
            },
        } as any,
        new URL("http://localhost/api/v1/docs/ui?lang=xx"),
    );
    assert.equal(handled, true);
    assert.equal(status, 200);
    assert.match(body, /UI/);
});

test("docs route uses secondary language before falling back to English", async () => {
    const route = createDocsRoutes();
    let status = 0;
    let body = "";
    const handled = await route(
        { method: "GET" } as any,
        {
            writeHead(code: number) {
                status = code;
            },
            end(payload: string) {
                body = payload;
            },
        } as any,
        new URL("http://localhost/api/v1/docs/ui?langs=xx%2Cde"),
    );
    assert.equal(handled, true);
    assert.equal(status, 200);
    const parsed = JSON.parse(body);
    assert.ok(
        parsed.data.markdown.includes("Benutzeroberfläche") ||
            parsed.data.markdown.includes("UI"),
        "served secondary language (de) before English",
    );
});

test("docs route indexes every changelog markdown stem and serves generated changelog landing page", async () => {
    const route = createDocsRoutes();
    let status = 0;
    let body = "";
    await route(
        { method: "GET" } as any,
        {
            writeHead(code: number) {
                status = code;
            },
            end(payload: string) {
                body = payload;
            },
        } as any,
        new URL("http://localhost/api/v1/docs"),
    );
    assert.equal(status, 200);
    const parsed = JSON.parse(body);
    const changelogEntries = parsed.data.filter((entry: any) =>
        entry.slug.startsWith("changelog/"),
    );
    assert.ok(changelogEntries.length > 2);
    assert.ok(parsed.data.find((entry: any) => entry.slug === "changelog"));

    status = 0;
    body = "";
    await route(
        { method: "GET" } as any,
        {
            writeHead(code: number) {
                status = code;
            },
            end(payload: string) {
                body = payload;
            },
        } as any,
        new URL("http://localhost/api/v1/docs/changelog"),
    );
    assert.equal(status, 200);
    const changelogLanding = JSON.parse(body);
    assert.equal(
        changelogLanding.data.markdown.split("\n")[0],
        `# ${parsed.data.find((entry: { slug: string }) => entry.slug === "changelog/index").title}`,
    );
    assert.match(changelogLanding.data.markdown, /\/changelogs\//);
    assert.match(changelogLanding.data.markdown, /## Cognis Core/);
});

test("docs route renders changelog feature branch from file slug", async () => {
    const route = createDocsRoutes();
    let status = 0;
    let body = "";
    const handled = await route(
        { method: "GET" } as any,
        {
            writeHead(code: number) {
                status = code;
            },
            end(payload: string) {
                body = payload;
            },
        } as any,
        new URL(
            "http://localhost/api/v1/docs/changelog/create-changelog-ingestion-system",
        ),
    );
    assert.equal(handled, true);
    assert.equal(status, 200);
    const parsed = JSON.parse(body);
    assert.match(
        parsed.data.markdown,
        /\*\*Feature Branch:\*\* copilot\/create-changelog-ingestion-system/,
    );
    assert.equal(
        parsed.data.markdown.match(/\*\*Feature Branch:\*\*/g)?.length,
        1,
    );
});

test("docs route serves changelog slugs containing registry host dots", async () => {
    const route = createDocsRoutes();
    let status = 0;
    const handled = await route(
        { method: "GET" } as any,
        {
            writeHead(code: number) {
                status = code;
            },
            end() {},
        } as any,
        new URL(
            "http://localhost/api/v1/docs/changelog/registry.gitlab.firehawk-systems.com-firehawk-cognis-cognis-web?langs=ja%2Cen",
        ),
    );
    assert.equal(handled, true);
    assert.equal(status, 200);
});

test("docs route returns 404 for unknown slug", async () => {
    const route = createDocsRoutes();
    let status = 0;
    const handled = await route(
        { method: "GET" } as any,
        {
            writeHead(code: number) {
                status = code;
            },
            end() {},
        } as any,
        new URL("http://localhost/api/v1/docs/no-such-doc-xyz"),
    );
    assert.equal(handled, true);
    assert.equal(status, 404);
});

test("all document views retain their component version across publication and restart", async (context) => {
    const fixtureRoot = await mkdtemp(join(tmpdir(), "cognis-doc-bundle-"));
    context.after(() =>
        removePath(fixtureRoot, { recursive: true, force: true }),
    );
    const sourceRoot = join(fixtureRoot, "src");
    const componentRoot = join(sourceRoot, "gateways", "example");
    const docsRoot = join(componentRoot, "docs");
    const archiveRoot = join(fixtureRoot, "archive");
    await writeBundle(docsRoot, "# First README");
    await writeFile(join(componentRoot, "manifest.json"), manifest("1.0.0"));
    await writeFile(join(docsRoot, "USAGE.en.md"), "# First Usage");
    await writeFile(join(docsRoot, "TECHNICAL.en.md"), "# First Technical");
    const first = createDocsRoutes({ sourceRoot, archiveRoot });
    for (const [view, title] of [
        ["", "README"],
        ["/usage", "Usage"],
        ["/technical", "Technical"],
    ])
        assert.match(
            (await request(first, `/api/v1/docs/1.0.0/gateways/example${view}`))
                .body.data.markdown,
            new RegExp(`First ${title}`),
        );
    await writeFile(join(componentRoot, "manifest.json"), manifest("2.0.0"));
    await writeBundle(docsRoot, "# Second README");
    await writeFile(join(docsRoot, "USAGE.en.md"), "# Second Usage");
    await writeFile(join(docsRoot, "TECHNICAL.en.md"), "# Second Technical");
    const restarted = createDocsRoutes({ sourceRoot, archiveRoot });
    for (const [view, title] of [
        ["", "README"],
        ["/usage", "Usage"],
        ["/technical", "Technical"],
    ]) {
        assert.match(
            (
                await request(
                    restarted,
                    `/api/v1/docs/latest/gateways/example${view}`,
                )
            ).body.data.markdown,
            new RegExp(`Second ${title}`),
        );
        assert.match(
            (
                await request(
                    restarted,
                    `/api/v1/docs/1.0.0/gateways/example${view}`,
                )
            ).body.data.markdown,
            new RegExp(`First ${title}`),
        );
    }
    const index = await request(restarted, "/api/v1/docs");
    assert.deepEqual(index.body.data[0].views, ["info", "usage", "technical"]);
    assert.deepEqual(index.body.data[0].versions, ["2.0.0", "1.0.0"]);
});

test("incomplete document sources cannot publish a partial version", async (context) => {
    const fixtureRoot = await mkdtemp(join(tmpdir(), "cognis-doc-atomic-"));
    context.after(() =>
        removePath(fixtureRoot, { recursive: true, force: true }),
    );
    const sourceRoot = join(fixtureRoot, "src");
    const componentRoot = join(sourceRoot, "gateways", "example");
    const docsRoot = join(componentRoot, "docs");
    const archiveRoot = join(fixtureRoot, "archive");
    await writeBundle(docsRoot, "# First README");
    await writeFile(join(componentRoot, "manifest.json"), manifest("1.0.0"));
    const route = createDocsRoutes({ sourceRoot, archiveRoot });
    await request(route, "/api/v1/docs");
    await writeFile(join(componentRoot, "manifest.json"), manifest("2.0.0"));
    await removePath(join(docsRoot, "USAGE.en.md"));
    await assert.rejects(
        () => request(route, "/api/v1/docs"),
        /docs_english_source_missing/,
    );
    assert.deepEqual(await readdir(join(archiveRoot, "gateways", "example")), [
        "1.0.0",
    ]);
    await writeFile(join(docsRoot, "USAGE.en.md"), "# Restored Usage");
    const repaired = await request(
        route,
        "/api/v1/docs/2.0.0/gateways/example/usage",
    );
    assert.equal(repaired.body.data.markdown, "# Restored Usage");
});

test("core topic discovery reads a directory bundle and ignores unrelated filenames", async (context) => {
    const fixtureRoot = await mkdtemp(join(tmpdir(), "cognis-core-doc-"));
    context.after(() =>
        removePath(fixtureRoot, { recursive: true, force: true }),
    );
    const sourceRoot = join(fixtureRoot, "src");
    const docsRoot = join(sourceRoot, "docs", "example");
    const archiveRoot = join(fixtureRoot, "archive");
    await writeBundle(docsRoot, "# Core Info", true);
    await writeFile(
        join(sourceRoot, "package.json"),
        JSON.stringify({ version: "1.0.0" }),
    );
    await writeFile(
        join(sourceRoot, "docs", "unregistered.en.md"),
        "# Arbitrary filename",
    );
    const route = createDocsRoutes({ sourceRoot, archiveRoot });
    const index = await request(route, "/api/v1/docs");
    assert.equal(index.body.data.length, 1);
    assert.equal(index.body.data[0].slug, "example");
    assert.equal(
        (await request(route, "/api/v1/docs/example")).body.data.markdown,
        "# Core Info",
    );
    assert.match(
        (await request(route, "/api/v1/docs/example/usage")).body.data.markdown,
        /Concrete usage/,
    );
    assert.match(
        (await request(route, "/api/v1/docs/example/technical")).body.data
            .markdown,
        /Public interfaces/,
    );
});

test("published documentation links resolve to a complete declared or discovered bundle", async (context) => {
    const archiveRoot = await mkdtemp(join(tmpdir(), "cognis-doc-links-"));
    context.after(() =>
        removePath(archiveRoot, { recursive: true, force: true }),
    );
    const index = await initializeDocsStore(
        join(process.cwd(), "src"),
        archiveRoot,
    );
    const failures = new Set<string>();
    for (const entry of index.values()) {
        if (entry.slug.startsWith("changelog/")) continue;
        for (const view of entry.views)
            for (const language of ["en", "de", "id", "ja"]) {
                const content = await readStoredMarkdown(
                    archiveRoot,
                    entry,
                    entry.version,
                    [language],
                    view,
                );
                for (const link of content!.matchAll(
                    /\]\(\/docs\/([^\s)#]+)(?:#[^)]*)?\)/g,
                )) {
                    let slug = link[1].replace(
                        /^(?:latest|\d+\.\d+\.\d+)\//,
                        "",
                    );
                    if (index.has(slug)) continue;
                    slug = slug.replace(/\/(?:info|usage|technical)$/, "");
                    if (!index.has(slug))
                        failures.add(`${entry.slug}/${view}: /docs/${link[1]}`);
                }
            }
    }
    assert.deepEqual([...failures], []);
});

test("localized changelog branch metadata is preserved without adding a second label", async (context) => {
    const root = await mkdtemp(join(tmpdir(), "cognis-changelog-language-"));
    context.after(() => removePath(root, { recursive: true, force: true }));
    const sourceRoot = join(root, "src");
    const folder = join(sourceRoot, "docs/changelog");
    await mkdir(folder, { recursive: true });
    await writeFile(
        join(sourceRoot, "package.json"),
        JSON.stringify({ version: "1.0.0" }),
    );
    const content = new Map();
    for (const [language, label] of [
        ["en", "Feature Branch"],
        ["de", "Feature-Zweig"],
        ["id", "Cabang Fitur"],
        ["ja", "機能ブランチ"],
    ]) {
        const markdown = `# Release\n\n**${label}:** feature-example\n`;
        content.set(language, markdown);
        await writeFile(
            join(folder, `feature-example.${language}.md`),
            markdown,
        );
    }
    const route = createDocsRoutes({
        sourceRoot,
        archiveRoot: join(root, "archive"),
    });
    for (const [language, markdown] of content)
        assert.equal(
            (
                await request(
                    route,
                    `/api/v1/docs/changelog/feature-example?langs=${language}`,
                )
            ).body.data.markdown,
            markdown,
        );
});

for (const core of [false, true]) {
    test(`${core ? "discovered core" : "manifest component"} titles and all views use one language policy across versions`, async (context) => {
        const root = await mkdtemp(join(tmpdir(), "cognis-doc-locales-"));
        context.after(() => removePath(root, { recursive: true, force: true }));
        const sourceRoot = join(root, "src");
        const component = join(
            sourceRoot,
            core ? "docs/example" : "gateways/example",
        );
        const docsRoot = core ? component : join(component, "docs");
        const archiveRoot = join(root, "archive");
        const manifestPath = core
            ? join(sourceRoot, "package.json")
            : join(component, "manifest.json");
        const titles = {
            en: "English Guide",
            de: "Deutscher Leitfaden",
            id: "Panduan Indonesia",
            ja: "日本語ガイド",
        };
        const publish = async (version: string) => {
            await mkdir(docsRoot, { recursive: true });
            await writeFile(
                manifestPath,
                core ? JSON.stringify({ version }) : manifest(version),
            );
            for (const [language, title] of Object.entries(titles)) {
                for (const [view, name] of Object.entries(
                    core
                        ? {
                              info: "INFO",
                              usage: "USAGE",
                              technical: "TECHNICAL",
                          }
                        : {
                              info: "README",
                              usage: "USAGE",
                              technical: "TECHNICAL",
                          },
                )) {
                    await writeFile(
                        join(docsRoot, `${name}.${language}.md`),
                        `# ${title}\n\n${view} ${version} ${language}`,
                    );
                }
            }
        };
        await publish("1.0.0");
        const route = createDocsRoutes({ sourceRoot, archiveRoot });
        const slug = core ? "example" : "gateways/example";
        for (const [languages, expectedLanguage] of [
            ["ja-JP,en", "ja"],
            ["fr-CA,id,en", "id"],
            ["de,en", "de"],
            ["fr,en", "en"],
        ] as const) {
            const query = `?langs=${encodeURIComponent(languages)}`;
            const index = await request(route, `/api/v1/docs${query}`);
            assert.equal(index.body.data[0].title, titles[expectedLanguage]);
            for (const view of ["", "/usage", "/technical"]) {
                const result = await request(
                    route,
                    `/api/v1/docs/latest/${slug}${view}${query}`,
                );
                assert.equal(result.status, 200);
                assert.match(
                    result.body.data.markdown,
                    new RegExp(`1.0.0 ${expectedLanguage}$`),
                );
            }
        }
        await publish("2.0.0");
        const current = await request(
            route,
            `/api/v1/docs/latest/${slug}/usage?langs=ja`,
        );
        assert.match(current.body.data.markdown, /2.0.0 ja$/);
        const archived = await request(
            route,
            `/api/v1/docs/1.0.0/${slug}/technical?langs=ja`,
        );
        assert.match(archived.body.data.markdown, /1.0.0 ja$/);
        await removePath(component, { recursive: true, force: true });
        const afterRemoval = await request(route, "/api/v1/docs?langs=ja");
        assert.equal(afterRemoval.body.data[0].title, titles.ja);
    });
}

test("generated changelog navigation and heading use the localized index title", async (context) => {
    const root = await mkdtemp(join(tmpdir(), "cognis-doc-changelog-title-"));
    context.after(() => removePath(root, { recursive: true, force: true }));
    const sourceRoot = join(root, "src");
    const folder = join(sourceRoot, "docs/changelog");
    await mkdir(folder, { recursive: true });
    await writeFile(
        join(sourceRoot, "package.json"),
        JSON.stringify({ version: "1.0.0" }),
    );
    await writeFile(join(folder, "index.en.md"), "# Changelogs\n");
    await writeFile(join(folder, "index.ja.md"), "# 変更履歴\n");
    const route = createDocsRoutes({
        sourceRoot,
        archiveRoot: join(root, "archive"),
    });
    const index = await request(route, "/api/v1/docs?langs=ja,en");
    assert.equal(
        index.body.data.find(
            (entry: { slug: string }) => entry.slug === "changelog",
        ).title,
        "変更履歴",
    );
    assert.match(
        (await request(route, "/api/v1/docs/changelog?langs=ja,en")).body.data
            .markdown,
        /^# 変更履歴/,
    );
});

test("core discovery reads uppercase entry bundles without case aliases", async (context) => {
    const root = await mkdtemp(join(tmpdir(), "cognis-core-doc-case-"));
    context.after(() => removePath(root, { recursive: true, force: true }));
    const sourceRoot = join(root, "src");
    const docsRoot = join(sourceRoot, "docs/example");
    await writeBundle(docsRoot, "# Example\n\nPublic guidance.", true);
    await writeFile(
        join(sourceRoot, "package.json"),
        JSON.stringify({ version: "1.0.0" }),
    );
    assert.equal((await discoverDocSources(sourceRoot))[0].slug, "example");
    for (const name of ["INFO", "USAGE", "TECHNICAL"]) {
        const canonical = join(docsRoot, `${name}.en.md`);
        for (const invalidName of [
            name.toLowerCase(),
            name[0] + name.slice(1).toLowerCase(),
        ]) {
            const invalid = join(docsRoot, `${invalidName}.en.md`);
            await rename(canonical, invalid);
            if (name === "INFO")
                assert.deepEqual(await discoverDocSources(sourceRoot), []);
            else
                await assert.rejects(
                    discoverDocSources(sourceRoot),
                    /docs_english_source_missing/,
                );
            await rename(invalid, canonical);
        }
    }
    assert.equal((await discoverDocSources(sourceRoot)).length, 1);
});
