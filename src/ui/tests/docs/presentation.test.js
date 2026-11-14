import { validateModuleRepository } from "../../../core/index.js";
import { createHash } from "node:crypto";
import test from "node:test";
import assert from "node:assert/strict";
import {
    mkdir,
    readFile,
    rename,
    rm,
    symlink,
    writeFile,
} from "node:fs/promises";
import { join } from "node:path";
import { fixture } from "./fixture.js";

test("Docs publishes only owner-validated public presentation alongside stable document identity", async (context) => {
    const view = await fixture(context);
    const data = (await (await view.request("/api/v1/docs")).json()).data;
    assert.equal(data.length, 5);
    for (const item of data) {
        const owner = view.catalog.find((module) => module.uuid === item.group);
        assert.ok(owner);
        assert.equal(item.slug.split("/")[0], owner.uuid);
        assert.equal(item.path, `/api/v1/docs/latest/${item.slug}`);
        assert.equal(item.title, owner.documents[item.slug.split("/")[1]]);
        if (owner.name)
            assert.deepEqual(item.groupPresentation, {
                id: owner.id,
                name: owner.name,
                ui: {
                    stringsBaseUrl: `/static/modules/${owner.id}/languages`,
                    stringsRevision: createHash("sha256")
                        .update(JSON.stringify(["1.0.0", []]))
                        .digest("hex"),
                },
            });
        else assert.equal(item.groupPresentation, undefined);
    }
    const owner = view.catalog[0];
    const manifestPath = join(view.sourceRoot, owner.uuid, "manifest.json");
    const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
    await writeFile(
        manifestPath,
        JSON.stringify({ ...manifest, uuid: view.catalog[1].uuid }),
    );
    const mismatched = (await (await view.request("/api/v1/docs")).json()).data;
    assert.ok(
        mismatched
            .filter((item) => item.group === owner.uuid)
            .every((item) => !item.groupPresentation),
    );
    await rm(manifestPath);
    await symlink(
        join(view.sourceRoot, view.catalog[1].uuid, "manifest.json"),
        manifestPath,
    );
    const redirected = (await (await view.request("/api/v1/docs")).json()).data;
    assert.ok(
        redirected
            .filter((item) => item.group === owner.uuid)
            .every((item) => !item.groupPresentation),
    );
});

test("Docs localizes duplicate-name groups without combining their children and includes labels in search", async (context) => {
    const view = await fixture(context);
    await view.mount().ready;
    assert.deepEqual(view.labels(), [
        "Gemeinsame Werkzeuge",
        "Gemeinsame Werkzeuge",
        "English Dictionary",
        view.catalog[3].uuid,
    ]);
    const groups = [...view.root.querySelectorAll("[data-side-menu-group]")];
    assert.deepEqual(
        groups.map((group) => group.dataset.sideMenuGroup),
        view.catalog.map((module) => module.uuid),
    );
    assert.deepEqual(
        groups.map(
            (group) => group.querySelectorAll("[data-side-menu-item]").length,
        ),
        [2, 1, 1, 1],
    );
    assert.deepEqual(
        [...view.root.querySelectorAll("[data-side-menu-item]")].map(
            (item) => item.textContent,
        ),
        [
            "Configuration",
            "Whiteboard Guide",
            "Reports",
            "Dictionary",
            "Reference",
        ],
    );
    const results = await view.search();
    assert.equal(results.length, 5);
    const globalResults = await view.globalSearch();
    assert.equal(globalResults.length, 5);
    for (const result of globalResults) {
        const pageResult = results.find((item) => item.url === result.url);
        assert.equal(result.description, pageResult.description);
        assert.equal(result.label, pageResult.label);
    }
    for (const result of results) {
        const ownerIndex = view.catalog.findIndex((module) =>
            result.id.includes(module.uuid),
        );
        const label = view.labels()[ownerIndex];
        assert.ok(result.description.endsWith(` / ${label}`));
        assert.ok(result.searchText.includes(label));
        assert.equal(result.url, `/docs/${result.id.slice("docs:".length)}`);
    }
    assert.equal(
        view.xmlRequests.filter(
            (path) =>
                path === "/static/modules/whiteboard/languages/de/strings.xml",
        ).length,
        1,
    );
    for (const definition of view.composerOptions().tutorials[0].definitions) {
        for (const step of definition.steps)
            assert.equal(view.root.querySelectorAll(step.selector).length, 1);
    }
});

test("Docs keeps archived-only pages with current module names and missing-metadata identifiers after removal", async (context) => {
    const view = await fixture(context);
    await view.request("/api/v1/docs");
    for (const module of view.catalog)
        await rm(join(view.sourceRoot, module.uuid, "docs"), {
            recursive: true,
        });
    await view.mount().ready;
    assert.deepEqual(view.labels(), [
        "Gemeinsame Werkzeuge",
        "Gemeinsame Werkzeuge",
        "English Dictionary",
        view.catalog[3].uuid,
    ]);
    assert.equal((await view.search()).length, 5);
    const archived = await (
        await view.request(`/api/v1/docs/1.0.0/${view.catalog[0].uuid}/guide`)
    ).json();
    assert.match(archived.data.markdown, /Whiteboard Guide/);
    await rm(join(view.sourceRoot, view.catalog[0].uuid), { recursive: true });
    const data = (await (await view.request("/api/v1/docs")).json()).data;
    assert.equal(
        data.filter((item) => item.group === view.catalog[0].uuid).length,
        2,
    );
    assert.ok(
        data
            .filter((item) => item.group === view.catalog[0].uuid)
            .every((item) => !item.groupPresentation),
    );
});

test("Docs retains group identity, open state, routes and translated labels across repeated navigation", async (context) => {
    const view = await fixture(context);
    const first = view.mount();
    await first.ready;
    const group = view.root.querySelector("[data-side-menu-group]");
    group.open = false;
    group.dispatchEvent(new view.window.Event("toggle"));
    first.scope.abort();
    await view.mount().ready;
    assert.equal(view.root.querySelector("[data-side-menu-group]").open, false);
    const slug = `${view.catalog[1].uuid}/reports`;
    view.root.querySelector(`[data-side-menu-item="${slug}"]`).click();
    await context.waitFor(() =>
        assert.equal(view.window.location.pathname, `/docs/latest/${slug}`),
    );
    assert.equal(view.window.location.pathname, `/docs/latest/${slug}`);
    assert.equal(
        view.root.querySelector('[aria-current="page"][data-side-menu-item]')
            .dataset.sideMenuItem,
        slug,
    );
    assert.equal(view.labels()[1], "Gemeinsame Werkzeuge");
    assert.match(view.root.querySelector("#doc").textContent, /Reports/);
});

test("Docs rejects a declared name missing from both preferred and English catalogs", async (context) => {
    const view = await fixture(context, { missingEnglish: true });
    await assert.rejects(
        view.mount().ready,
        /missing_translation:module.dictionary.name/,
    );
    assert.equal(view.composerOptions(), undefined);
    await assert.rejects(
        view.globalSearch(),
        /missing_translation:module.dictionary.name/,
    );
});

test("Docs uses English names on direct versioned navigation", async (context) => {
    const view = await fixture(context, { locale: "en" });
    const slug = `${view.catalog[2].uuid}/dictionary`;
    view.window.history.replaceState(null, "", `/docs/1.0.0/${slug}`);
    await view.mount().ready;
    assert.deepEqual(view.labels(), [
        "Shared Tools",
        "Shared Tools",
        "English Dictionary",
        view.catalog[3].uuid,
    ]);
    assert.equal(view.window.location.pathname, `/docs/1.0.0/${slug}`);
    assert.match(view.root.querySelector("#doc").textContent, /Dictionary/);
});

test("Docs abandons a mount cancelled during module translation loading", async (context) => {
    const view = await fixture(context);
    let release;
    const pending = new Promise((resolve) => {
        release = resolve;
    });
    let waiting = false;
    view.setBeforeBundle(async (path) => {
        if (!path.startsWith("/static/modules/")) return;
        waiting = true;
        await pending;
    });
    const mount = view.mount();
    await context.waitFor(() => assert.equal(waiting, true));
    mount.scope.abort();
    release();
    await mount.ready;
    assert.equal(view.composerOptions(), undefined);
    assert.equal(view.root.children.length, 0);
    view.setBeforeBundle(async () => {});
    await view.mount().ready;
    assert.equal(view.labels()[0], "Gemeinsame Werkzeuge");
});

test("Docs prepares installed raw manifests with absent or undeclared locale URLs", async (context) => {
    const view = await fixture(context);
    for (const [index, ui] of [undefined, {}, { preferences: [] }].entries()) {
        const owner = view.catalog[index];
        const manifestPath = join(view.sourceRoot, owner.uuid, "manifest.json");
        const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
        await writeFile(manifestPath, JSON.stringify({ ...manifest, ui }));
    }
    await view.mount().ready;
    assert.deepEqual(view.labels(), [
        "Gemeinsame Werkzeuge",
        "Gemeinsame Werkzeuge",
        "English Dictionary",
        view.catalog[3].uuid,
    ]);
    for (const owner of view.catalog.slice(0, 3)) {
        assert.ok(
            view.xmlRequests.includes(
                `/static/modules/${owner.id}/languages/en/strings.xml`,
            ),
        );
    }
});

for (const stringsBaseUrl of [
    "https://foreign.example/languages",
    "//foreign.example/languages",
    "/api/v1/modules/catalog/strings/private",
    "/static/modules/analytics/languages",
    "/static/modules/whiteboard/languages?token=private",
    "/static/modules/whiteboard/languages#private",
    "/static/modules/whiteboard/../analytics/languages",
    "/static/modules/whiteboard/%2e%2e/languages",
    "/static/modules/whiteboard/%2flanguages",
    "/static/modules/whiteboard/./languages",
    "/static/modules/whiteboard//languages",
    "/static/modules/whiteboard/languages/",
    ["/static/modules/whiteboard/languages"],
    { credential: "private" },
    42,
    null,
    "",
]) {
    test(`Docs rejects noncanonical public locale metadata ${JSON.stringify(stringsBaseUrl)}`, async (context) => {
        const view = await fixture(context);
        const owner = view.catalog[0];
        const manifestPath = join(view.sourceRoot, owner.uuid, "manifest.json");
        const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
        await writeFile(
            manifestPath,
            JSON.stringify({ ...manifest, ui: { stringsBaseUrl } }),
        );
        const data = (await (await view.request("/api/v1/docs")).json()).data;
        assert.equal(data.length, 5);
        assert.ok(
            data
                .filter((item) => item.group === owner.uuid)
                .every((item) => !item.groupPresentation),
        );
        await view.mount().ready;
        assert.ok(
            view.xmlRequests.every(
                (path) =>
                    path.startsWith("/static/languages/") ||
                    path.startsWith("/static/modules/analytics/") ||
                    path.startsWith("/static/modules/dictionary/"),
            ),
        );
        assert.deepEqual(view.labels(), [
            owner.uuid,
            "Gemeinsame Werkzeuge",
            "English Dictionary",
            view.catalog[3].uuid,
        ]);
        assert.ok(view.logs.length > 0);
        for (const [level, message, metadata] of view.logs) {
            assert.equal(level, "error");
            assert.equal(
                message,
                "Documentation presentation metadata unavailable.",
            );
            assert.deepEqual(metadata, {
                component: "api-docs",
                operation: "readGroupPresentation",
                group: owner.uuid,
                reason: "invalid_locale_url",
            });
        }
    });
}

for (const ui of [[], "private", true, null]) {
    test(`Docs rejects malformed locale descriptors ${JSON.stringify(ui)}`, async (context) => {
        const view = await fixture(context);
        const manifestPath = join(
            view.sourceRoot,
            view.catalog[0].uuid,
            "manifest.json",
        );
        const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
        await writeFile(manifestPath, JSON.stringify({ ...manifest, ui }));
        const data = (await (await view.request("/api/v1/docs")).json()).data;
        assert.equal(data.length, 5);
        assert.equal(view.logs[0][2].reason, "invalid_locale_descriptor");
    });
}

for (const raw of ["{", "null", "[]", '"private"', "42", "true"]) {
    test(`Docs retains valid documents when optional manifest metadata is ${raw}`, async (context) => {
        const view = await fixture(context);
        const owner = view.catalog[0];
        await writeFile(
            join(view.sourceRoot, owner.uuid, "manifest.json"),
            raw,
        );
        const data = (await (await view.request("/api/v1/docs")).json()).data;
        assert.equal(data.length, 5);
        assert.ok(
            data
                .filter((item) => item.group === owner.uuid)
                .every((item) => !item.groupPresentation),
        );
        await view.mount().ready;
        assert.deepEqual(view.labels(), [
            owner.uuid,
            "Gemeinsame Werkzeuge",
            "English Dictionary",
            view.catalog[3].uuid,
        ]);
        assert.equal((await view.search()).length, 5);
        assert.equal((await view.globalSearch()).length, 5);
        for (const [level, message, metadata] of view.logs) {
            assert.equal(level, "error");
            assert.equal(
                message,
                "Documentation presentation metadata unavailable.",
            );
            assert.deepEqual(metadata, {
                component: "api-docs",
                operation: "readGroupPresentation",
                group: owner.uuid,
                reason:
                    raw === "{"
                        ? "invalid_manifest_json"
                        : "invalid_manifest_shape",
            });
        }
    });
}

test("Docs retains the localized platform section for ungrouped documents", async (context) => {
    const view = await fixture(context, { locale: "en" });
    await mkdir(join(view.sourceRoot, "docs"));
    await writeFile(
        join(view.sourceRoot, "package.json"),
        JSON.stringify({ version: "1.0.0" }),
    );
    await writeFile(
        join(view.sourceRoot, "docs", "overview.en.md"),
        "# Overview",
    );
    await view.mount().ready;
    assert.equal(
        view.root.querySelector('[data-side-menu-group="platform"] > summary')
            .textContent,
        "Platform",
    );
    assert.equal(
        view.root.querySelector('[data-side-menu-item="overview"]').textContent,
        "Overview",
    );
    assert.equal(view.window.location.pathname, "/docs/latest/overview");
});

for (const ui of [
    undefined,
    {},
    { stringsBaseUrl: "/static/modules/whiteboard/languages" },
]) {
    test(`Docs refreshes versioned installed presentation after remount with ${JSON.stringify(ui)}`, async (context) => {
        const view = await fixture(context);
        const owner = view.catalog[0];
        const manifestPath = join(view.sourceRoot, owner.uuid, "manifest.json");
        const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
        await writeFile(manifestPath, JSON.stringify({ ...manifest, ui }));
        const first = view.mount();
        await first.ready;
        assert.equal(view.labels()[0], "Gemeinsame Werkzeuge");
        first.scope.abort();
        owner.labels.de = "Neue Werkzeuge";
        await writeFile(
            manifestPath,
            JSON.stringify({ ...manifest, ui, version: "1.0.1" }),
        );
        await view.mount().ready;
        assert.equal(view.labels()[0], "Neue Werkzeuge");
        const search = await view.globalSearch();
        assert.ok(
            search
                .find((item) => item.id.includes(owner.uuid))
                .description.endsWith(" / Neue Werkzeuge"),
        );
        assert.equal(
            view.xmlRequests.filter(
                (path) =>
                    path ===
                    "/static/modules/whiteboard/languages/de/strings.xml",
            ).length,
            2,
        );
    });
}

for (const version of [{ credential: "private" }, [], 1, null, "", "   "]) {
    test(`Docs omits invalid presentation revisions ${JSON.stringify(version)}`, async (context) => {
        const view = await fixture(context);
        const manifestPath = join(
            view.sourceRoot,
            view.catalog[0].uuid,
            "manifest.json",
        );
        const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
        await writeFile(manifestPath, JSON.stringify({ ...manifest, version }));
        const data = (await (await view.request("/api/v1/docs")).json()).data;
        assert.equal(data.length, 5);
        assert.ok(
            data
                .filter((item) => item.group === view.catalog[0].uuid)
                .every((item) => !item.groupPresentation),
        );
        assert.equal(view.logs[0][2].reason, "invalid_locale_descriptor");
    });
}

test("Docs page and global search follow the active display locale without rewriting preferences", async (context) => {
    const view = await fixture(context, { locale: "de" });
    view.window.localStorage.setItem(
        "cognis_language_priority",
        JSON.stringify(["en", "de"]),
    );
    view.window.localStorage.setItem("cognis_language_priority_mode", "manual");
    await view.mount().ready;
    const priority = view.window.localStorage.getItem(
        "cognis_language_priority",
    );
    const language = view.window.document.documentElement.lang;
    const page = await view.search();
    const global = await view.globalSearch();
    assert.equal(page[0].description, "Dokumente / Gemeinsame Werkzeuge");
    assert.equal(global[0].description, page[0].description);
    assert.equal(
        view.window.localStorage.getItem("cognis_language_priority"),
        priority,
    );
    assert.equal(view.window.document.documentElement.lang, language);
});

test("Docs preserves a declared nested locale path within the owning module", async (context) => {
    const view = await fixture(context);
    const manifestPath = join(
        view.sourceRoot,
        view.catalog[0].uuid,
        "manifest.json",
    );
    const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
    const stringsBaseUrl = "/static/modules/whiteboard/catalog/languages";
    await writeFile(
        manifestPath,
        JSON.stringify({ ...manifest, ui: { stringsBaseUrl } }),
    );
    await view.mount().ready;
    assert.equal(view.labels()[0], "Gemeinsame Werkzeuge");
    assert.ok(view.xmlRequests.includes(`${stringsBaseUrl}/de/strings.xml`));
});

test("Docs preserves generic group identity without treating a non-UUID as module ownership", async (context) => {
    const view = await fixture(context);
    const owner = view.catalog[0];
    const group = "not-a-uuid";
    await rename(
        join(view.sourceRoot, owner.uuid),
        join(view.sourceRoot, group),
    );
    const manifestPath = join(view.sourceRoot, group, "manifest.json");
    const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
    await writeFile(manifestPath, JSON.stringify({ ...manifest, uuid: group }));
    const data = (await (await view.request("/api/v1/docs")).json()).data;
    const documents = data.filter((item) => item.group === group);
    assert.equal(documents.length, 2);
    assert.ok(
        documents.every(
            (item) =>
                !item.groupPresentation && item.slug.startsWith(`${group}/`),
        ),
    );
});

test("Docs rebuilds page and global labels after the active display language changes", async (context) => {
    const view = await fixture(context);
    view.window.localStorage.setItem(
        "cognis_language_priority",
        JSON.stringify(["de", "en"]),
    );
    view.window.localStorage.setItem("cognis_language_priority_mode", "manual");
    const first = view.mount();
    await first.ready;
    assert.equal(
        (await view.globalSearch())[0].description,
        "Dokumente / Gemeinsame Werkzeuge",
    );
    first.scope.abort();
    view.selectLocale("en");
    await view.mount().ready;
    const priority = view.window.localStorage.getItem(
        "cognis_language_priority",
    );
    assert.equal(view.labels()[0], "Shared Tools");
    assert.equal((await view.search())[0].description, "Docs / Shared Tools");
    assert.equal(
        (await view.globalSearch())[0].description,
        "Docs / Shared Tools",
    );
    assert.equal(
        view.window.localStorage.getItem("cognis_language_priority"),
        priority,
    );
});

for (const ui of [
    undefined,
    { stringsBaseUrl: "/static/modules/whiteboard/languages" },
]) {
    test(`Docs refreshes same-version published locale content with ${JSON.stringify(ui)}`, async (context) => {
        const view = await fixture(context);
        const owner = view.catalog[0];
        const manifestPath = join(view.sourceRoot, owner.uuid, "manifest.json");
        const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
        const file = {
            path: "./ui/languages/de/strings.xml",
            sha256: "a".repeat(64),
        };
        await writeFile(
            manifestPath,
            JSON.stringify({ ...manifest, ui, files: [file] }),
        );
        const firstData = (await (await view.request("/api/v1/docs")).json())
            .data;
        const first = view.mount();
        await first.ready;
        assert.equal(view.labels()[0], "Gemeinsame Werkzeuge");
        first.scope.abort();
        owner.labels.de = "Neue Werkzeuge";
        await writeFile(
            manifestPath,
            JSON.stringify({
                ...manifest,
                ui,
                files: [{ ...file, sha256: "b".repeat(64) }],
            }),
        );
        const nextData = (await (await view.request("/api/v1/docs")).json())
            .data;
        assert.notEqual(
            nextData[0].groupPresentation.ui.stringsRevision,
            firstData[0].groupPresentation.ui.stringsRevision,
        );
        await view.mount().ready;
        assert.equal(view.labels()[0], "Neue Werkzeuge");
        assert.ok(
            (await view.globalSearch())[0].description.endsWith(
                " / Neue Werkzeuge",
            ),
        );
    });
}

for (const files of [
    null,
    {},
    [null],
    [{ path: "../private/en/strings.xml", sha256: "a".repeat(64) }],
    [
        {
            path: "ui/languages/en/strings.xml",
            sha256: { credential: "private" },
        },
    ],
]) {
    test(`Docs omits invalid published locale revisions ${JSON.stringify(files)}`, async (context) => {
        const view = await fixture(context);
        const manifestPath = join(
            view.sourceRoot,
            view.catalog[0].uuid,
            "manifest.json",
        );
        const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
        await writeFile(manifestPath, JSON.stringify({ ...manifest, files }));
        const data = (await (await view.request("/api/v1/docs")).json()).data;
        assert.equal(data.length, 5);
        assert.ok(
            data
                .filter((item) => item.group === view.catalog[0].uuid)
                .every((item) => !item.groupPresentation),
        );
        assert.equal(view.logs[0][2].reason, "invalid_locale_revision");
    });
}

test("Docs ignores unrelated published filenames when deriving locale revisions", async (context) => {
    const view = await fixture(context);
    const manifestPath = join(
        view.sourceRoot,
        view.catalog[0].uuid,
        "manifest.json",
    );
    const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
    const before = (await (await view.request("/api/v1/docs")).json()).data;
    const content = "fixture asset";
    const nextManifest = {
        ...manifest,
        files: [
            {
                path: "assets/日本語 guide.txt",
                sha256: createHash("sha256").update(content).digest("hex"),
            },
        ],
    };
    await writeFile(
        join(view.sourceRoot, view.catalog[0].uuid, "assets/日本語 guide.txt"),
        content,
    );
    await writeFile(manifestPath, JSON.stringify(nextManifest));
    await validateModuleRepository(
        join(view.sourceRoot, view.catalog[0].uuid),
        nextManifest,
    );
    const after = (await (await view.request("/api/v1/docs")).json()).data;
    assert.deepEqual(after[0].groupPresentation, before[0].groupPresentation);
    await view.mount().ready;
    assert.equal(view.labels()[0], "Gemeinsame Werkzeuge");
});

test("Docs retains archived identity with a current prerelease manifest revision", async (context) => {
    const view = await fixture(context);
    const owner = view.catalog[0];
    await view.request("/api/v1/docs");
    await rm(join(view.sourceRoot, owner.uuid, "docs"), { recursive: true });
    const manifestPath = join(view.sourceRoot, owner.uuid, "manifest.json");
    const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
    await writeFile(
        manifestPath,
        JSON.stringify({ ...manifest, version: "1.1.0-beta.1" }),
    );
    await writeFile(
        join(view.sourceRoot, owner.uuid, "package.json"),
        JSON.stringify({ type: "module", version: "1.1.0-beta.1" }),
    );
    await validateModuleRepository(join(view.sourceRoot, owner.uuid), {
        ...manifest,
        version: "1.1.0-beta.1",
    });
    const data = (await (await view.request("/api/v1/docs")).json()).data;
    const archived = data.filter((item) => item.group === owner.uuid);
    assert.equal(archived.length, 2);
    for (const item of archived) {
        assert.equal(item.version, "1.0.0");
        assert.equal(item.groupPresentation.name, owner.name);
        assert.match(
            item.groupPresentation.ui.stringsRevision,
            /^[a-f0-9]{64}$/,
        );
    }
    await view.mount().ready;
    assert.equal(view.labels()[0], "Gemeinsame Werkzeuge");
});
