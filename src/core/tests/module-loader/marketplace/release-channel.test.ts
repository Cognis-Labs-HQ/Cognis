import * as filesystem from "node:fs/promises";
import * as crypto from "node:crypto";
import { loadTestModule } from "../../../../tooling/reuse/test-module.js";
import * as recommendations from "../../../services/module-loader/marketplace/recommendations.js";
import * as request from "../../../services/module-loader/marketplace/request.js";
import * as sources from "../../../services/module-loader/marketplace/sources.js";
import * as repositoryValidator from "../../../services/module-loader/repository-validator.js";
import * as base from "../../../services/module-loader/marketplace/base.js";
import test, { type TestContext } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import {
    DEFAULT_TRUSTED_MODULE_SOURCE,
    ModuleMarketplaceService,
} from "../../../index.js";

const moduleUuid = "71567e48-480a-45a5-a853-8c96d6ab9973";
const mainCommit = "a".repeat(40);
const previewCommit = "b".repeat(40);
const cloneUrl = "https://github.com/Cognis-Labs-HQ/analytics.git";

function manifest(preview = false) {
    const namespace = preview ? "preview" : "analytics";
    return {
        id: "analytics",
        uuid: moduleUuid,
        name: `module.${namespace}.name`,
        version: preview ? "2.0.0" : "2.1.0",
        publisher: "Example",
        class: "extension",
        coreApiVersion: "v1",
        summary: `module.${namespace}.summary`,
        description: `module.${namespace}.description`,
        categories: ["module.analytics.category"],
        tags: ["module.analytics.tag"],
        repository: cloneUrl,
        capabilities: [],
        entrypoints: { bootstrap: "./bootstrap.js" },
        assets: { icon: "assets/icon.png", banner: "assets/banner.png" },
        ui: { stringsBaseUrl: "/static/modules/analytics/languages" },
    };
}

async function fixture(
    context: TestContext,
    defaultBranch = "main",
    previewIsTag = false,
    Service = ModuleMarketplaceService,
) {
    const root = await mkdtemp(path.join(tmpdir(), "cognis-channel-"));
    context.after(() => rm(root, { recursive: true, force: true }));
    const statePath = path.join(root, "sources.json");
    const installRoot = path.join(root, "modules");
    const installedRoot = path.join(installRoot, moduleUuid);
    await mkdir(installedRoot, { recursive: true });
    await writeFile(
        path.join(installedRoot, "manifest.json"),
        JSON.stringify(manifest(true)),
    );
    const provenance = {
        sourceUuid: DEFAULT_TRUSTED_MODULE_SOURCE.uuid,
        cloneUrl,
        branch: "preview",
        commit: previewCommit,
        manifestSha256: "c".repeat(64),
    };
    await writeFile(
        path.join(installedRoot, ".cognis-install.json"),
        JSON.stringify(provenance),
    );
    let deleted = false;
    let paginated = false;
    let currentDefaultBranch = defaultBranch;
    let failure:
        | "branches"
        | "later-page"
        | "malformed-ref"
        | "manifest"
        | "strings"
        | undefined;
    let deleteAfterManifest = false;
    const requests: string[] = [];
    const logs: Array<Record<string, unknown>> = [];
    context.mock.method(
        globalThis,
        "fetch",
        async (input: string | URL | Request) => {
            const url = new URL(String(input));
            requests.push(url.href);
            if (failure === "branches" && url.pathname.endsWith("/branches"))
                return new Response("", { status: 503 });
            if (url.pathname.endsWith("/repos"))
                return Response.json([
                    {
                        clone_url: cloneUrl,
                        default_branch: currentDefaultBranch,
                        full_name: "Cognis-Labs-HQ/analytics",
                    },
                ]);
            if (
                url.pathname.endsWith("/branches") ||
                url.pathname.endsWith("/tags")
            ) {
                const isTags = url.pathname.endsWith("/tags");
                const ownsPreview = isTags === previewIsTag;
                const main = {
                    name: currentDefaultBranch,
                    commit: { sha: mainCommit },
                };
                const firstPage = isTags ? [] : [main];
                if (!ownsPreview) return Response.json(firstPage);
                const preview = {
                    name: "preview",
                    commit:
                        failure === "malformed-ref"
                            ? {}
                            : { sha: previewCommit },
                };
                if (paginated && url.searchParams.get("page") === "2") {
                    if (failure === "later-page")
                        return new Response("", { status: 503 });
                    return Response.json(deleted ? [] : [preview]);
                }
                if (paginated) {
                    const next = new URL(url);
                    next.searchParams.set("page", "2");
                    return Response.json(firstPage, {
                        headers: { link: `<${next}>; rel="next"` },
                    });
                }
                return Response.json([
                    ...firstPage,
                    ...(!deleted ? [preview] : []),
                ]);
            }
            const raw = url.hostname === "raw.githubusercontent.com";
            const reference = raw
                ? decodeURIComponent(url.pathname.split("/")[3])
                : url.searchParams.get("ref");
            const file = raw
                ? url.pathname.split("/").slice(4).join("/")
                : url.pathname.split("/contents/")[1];
            if (reference === "preview" && deleted)
                return new Response("", { status: 404 });
            const preview =
                reference === "preview" || reference === previewCommit;
            if (file === "manifest.json") {
                if (failure === "manifest" && preview)
                    return new Response("", { status: 503 });
                const content = JSON.stringify(manifest(preview));
                if (preview && deleteAfterManifest) deleted = true;
                return Response.json({
                    content: Buffer.from(content).toString("base64"),
                });
            }
            if (file?.endsWith("/strings.xml")) {
                if (failure === "strings")
                    return new Response("", { status: 503 });
                const namespace = preview ? "preview" : "analytics";
                return new Response(
                    `<resources><string name="module.${namespace}.name">${namespace}</string></resources>`,
                );
            }
            if (file?.endsWith(".png"))
                return new Response(`image-${reference}`);
            if (file === "README.md")
                return Response.json({
                    content: Buffer.from(`Readme ${reference}`).toString(
                        "base64",
                    ),
                });
            return new Response("", { status: 404 });
        },
    );
    const service = new Service(
        statePath,
        installRoot,
        (level, message, meta) => logs.push({ level, message, ...meta }),
    );
    await service.discover(undefined, true);
    await service.saveSelectedBranch(moduleUuid, "preview");
    return {
        service,
        requests,
        logs,
        provenance,
        deleteBranch: () => {
            deleted = true;
        },
        deleteDuringScan: () => {
            deleteAfterManifest = true;
        },
        restart: () => new ModuleMarketplaceService(statePath, installRoot),
        paginate: () => {
            paginated = true;
        },
        changeDefault: (branch: string) => {
            currentDefaultBranch = branch;
        },
        fail: (stage: typeof failure) => {
            failure = stage;
        },
        readProvenance: async () =>
            JSON.parse(
                await readFile(
                    path.join(installedRoot, ".cognis-install.json"),
                    "utf8",
                ),
            ),
    };
}

test("deleted installed channels persist the default selection without rewriting installation provenance", async (context) => {
    const state = await fixture(context);
    state.deleteBranch();
    const [module] = await state.service.discover(undefined, true);
    assert.equal(module.selectedBranch, "main");
    assert.equal(module.id, "analytics");
    assert.equal(module.uuid, moduleUuid);
    assert.equal(module.name, "module.analytics.name");
    assert.equal(module.version, "2.1.0");
    assert.equal(module.installedVersion, "2.0.0");
    assert.equal(module.installedBranch, "preview");
    assert.equal(module.installedCommit, previewCommit);
    assert.equal(module.sourceUuid, DEFAULT_TRUSTED_MODULE_SOURCE.uuid);
    assert.equal(module.cloneUrl, cloneUrl);
    assert.equal(module.updateAvailable, true);
    assert.deepEqual(await state.readProvenance(), state.provenance);
    assert.equal(
        (await state.restart().listCachedModules())[0].selectedBranch,
        "main",
    );
    const strings = await state.service.getAsset(module.assetIds!.strings!.en);
    assert.match(strings!.body.toString(), /module.analytics.name/);
});

test("branch deletion during discovery cannot separate manifest and locale snapshot", async (context) => {
    const state = await fixture(context);
    state.deleteDuringScan();
    const [module] = await state.service.discover(undefined, true);
    const asset = module.assetIds?.strings?.en;
    assert.ok(asset, "the selected snapshot must include its English bundle");
    const strings = await state.service.getAsset(asset);
    assert.ok(strings?.body.toString().includes(`name="${module.name}"`));
    const [fallback] = await state.service.discover(undefined, true);
    assert.equal(fallback.selectedBranch, "main");
    assert.equal(fallback.name, "module.analytics.name");
});

for (const stage of ["branches", "manifest", "strings"] as const) {
    test(`a transient ${stage} failure retains the last complete channel snapshot`, async (context) => {
        const state = await fixture(context, "master");
        const [before] = await state.service.listCachedModules();
        state.fail(stage);
        const [retained] = await state.service.discover(undefined, true);
        assert.deepEqual(retained, before);
        assert.ok(
            state.logs.some(
                (entry) =>
                    entry.level === "error" && typeof entry.error === "string",
            ),
        );
        assert.deepEqual(await state.readProvenance(), state.provenance);
        state.fail(undefined);
        state.deleteBranch();
        const [recovered] = await state.service.discover(undefined, true);
        assert.equal(recovered.selectedBranch, "master");
        assert.equal(recovered.defaultBranch, "master");
        assert.equal(
            (await state.restart().listCachedModules())[0].selectedBranch,
            "master",
        );
    });
}

test("refresh preserves a surviving explicit selection independently of the installed channel", async (context) => {
    const state = await fixture(context, "stable");
    await state.service.saveSelectedBranch(moduleUuid, "stable");
    const [module] = await state.service.discover(undefined, true);
    assert.equal(module.selectedBranch, "stable");
    assert.equal(module.installedBranch, "preview");
    assert.equal(module.name, "module.preview.name");
    assert.deepEqual(await state.readProvenance(), state.provenance);
});

for (const previewIsTag of [false, true])
    test(`a selected ${previewIsTag ? "tag" : "branch"} on a later page survives refresh and a partial listing failure`, async (context) => {
        const state = await fixture(context, "main", previewIsTag);
        state.paginate();
        const [complete] = await state.service.discover(undefined, true);
        assert.equal(complete.selectedBranch, "preview");
        assert.ok(
            [...complete.branches, ...complete.releases].some(
                (channel) => channel.name === "preview",
            ),
        );
        const [persisted] = await state.service.listCachedModules();
        for (const failure of ["later-page", "malformed-ref"] as const) {
            state.fail(failure);
            const [retained] = await state.service.discover(undefined, true);
            assert.deepEqual(retained, persisted);
        }
        state.fail(undefined);
        state.deleteBranch();
        const [fallback] = await state.service.discover(undefined, true);
        assert.equal(fallback.selectedBranch, "main");
    });

test("deleted channels resolve the current repository default after it changes", async (context) => {
    const state = await fixture(context);
    state.changeDefault("release");
    state.deleteBranch();
    const [module] = await state.service.discover(undefined, true);
    assert.equal(module.defaultBranch, "release");
    assert.equal(module.selectedBranch, "release");
    assert.equal(module.branches[0].commit, mainCommit);
    assert.equal(
        (await state.restart().listCachedModules())[0].selectedBranch,
        "release",
    );
});

test("fallback update and reinstall use the pinned default commit and replace provenance only after validation", async (context) => {
    const bootstrap = await readFile(
        new URL("./fixtures/bootstrap.js", import.meta.url),
    );
    const packageManifest = {
        ...manifest(),
        files: [
            {
                path: "bootstrap.js",
                sha256: crypto
                    .createHash("sha256")
                    .update(bootstrap)
                    .digest("hex"),
            },
        ],
    };
    let checkouts = 0;
    const { ModuleMarketplaceService: Service } = loadTestModule<
        typeof import("../../../services/module-loader/marketplace/index.js")
    >(
        new URL(
            "../../../services/module-loader/marketplace/index.ts",
            import.meta.url,
        ),
        {
            "./recommendations.js": recommendations,
            "./request.js": request,
            "./sources.js": sources,
            "node:crypto": crypto,
            "node:fs/promises": filesystem,
            "node:path": path,
            "../repository-validator.js": repositoryValidator,
            "./base.js": base,
            "./checkout.js": {
                checkoutModuleRepository: async (options: {
                    root: string;
                    cloneUrl: string;
                    commit: string;
                }) => {
                    checkouts++;
                    assert.equal(options.commit, mainCommit);
                    assert.equal(options.cloneUrl, cloneUrl);
                    await mkdir(path.join(options.root, "assets"), {
                        recursive: true,
                    });
                    await Promise.all([
                        writeFile(
                            path.join(options.root, "manifest.json"),
                            JSON.stringify(packageManifest),
                        ),
                        writeFile(
                            path.join(options.root, "package.json"),
                            JSON.stringify({
                                type: "module",
                                version: packageManifest.version,
                            }),
                        ),
                        writeFile(path.join(options.root, "routes.json"), "[]"),
                        writeFile(
                            path.join(options.root, "bootstrap.js"),
                            bootstrap,
                        ),
                        writeFile(
                            path.join(options.root, "assets/icon.png"),
                            "fixture image",
                        ),
                        writeFile(
                            path.join(options.root, "assets/banner.png"),
                            "fixture image",
                        ),
                    ]);
                    return mainCommit;
                },
            },
        },
        { process, URL, Buffer },
    );
    const state = await fixture(context, "stable", false, Service);
    state.deleteBranch();
    const [module] = await state.service.discover(undefined, true);
    assert.equal(module.selectedBranch, "stable");
    await assert.rejects(
        state.service.install(module, module.selectedBranch, async () => {
            throw new Error("dependency_validation_failed");
        }),
        /dependency_validation_failed/,
    );
    assert.deepEqual(await state.readProvenance(), state.provenance);
    assert.equal(
        (await state.service.listCachedModules())[0].installedCommit,
        previewCommit,
    );
    for (let attempt = 0; attempt < 2; attempt++) {
        const installed = await state.service.install(
            module,
            module.selectedBranch,
            async (candidate) => {
                assert.equal(candidate.uuid, moduleUuid);
                assert.equal(candidate.version, "2.1.0");
            },
        );
        assert.equal(installed.uuid, moduleUuid);
        const provenance = await state.readProvenance();
        assert.equal(provenance.branch, "stable");
        assert.equal(provenance.commit, mainCommit);
        assert.equal(provenance.sourceUuid, state.provenance.sourceUuid);
        assert.equal(provenance.cloneUrl, cloneUrl);
        assert.equal(
            provenance.manifestSha256,
            crypto
                .createHash("sha256")
                .update(JSON.stringify(packageManifest))
                .digest("hex"),
        );
        const [cached] = await state.restart().listCachedModules();
        assert.equal(cached.selectedBranch, "stable");
        assert.equal(cached.installedBranch, "stable");
        assert.equal(cached.installedCommit, mainCommit);
        assert.equal(cached.installedVersion, "2.1.0");
        assert.equal(cached.updateAvailable, false);
    }
    assert.equal(checkouts, 3);
});
