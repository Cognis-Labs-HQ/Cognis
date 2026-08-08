import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
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

test("docs snapshots manifest versions across software starts", async () => {
    const fixtureRoot = await mkdtemp(join(tmpdir(), "cognis-docs-"));
    const sourceRoot = join(fixtureRoot, "src");
    const componentRoot = join(sourceRoot, "gateways", "example");
    const docsRoot = join(componentRoot, "docs");
    const archiveRoot = join(fixtureRoot, "archive");
    await mkdir(docsRoot, { recursive: true });
    await writeFile(
        join(componentRoot, "package.json"),
        JSON.stringify({ version: "1.0.0" }),
    );
    await writeFile(join(docsRoot, "index.en.md"), "# Example\n\nFirst");

    await request(
        createDocsRoutes({ sourceRoot, archiveRoot }),
        "/api/v1/docs/latest/gateways/example",
    );
    await writeFile(
        join(componentRoot, "package.json"),
        JSON.stringify({ version: "1.1.0" }),
    );
    await writeFile(join(docsRoot, "index.en.md"), "# Example\n\nSecond");
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

    await rm(join(docsRoot, "index.en.md"));
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
    await rm(fixtureRoot, { recursive: true, force: true });
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
    const uiEntry = parsed.data.find((d: any) => d.slug === "ui");
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
    assert.match(changelogLanding.data.markdown, /^# Changelogs/);
    assert.match(changelogLanding.data.markdown, /\/changelogs\//);
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
        /\*\*Feature Branch:\*\* create-changelog-ingestion-system/,
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
