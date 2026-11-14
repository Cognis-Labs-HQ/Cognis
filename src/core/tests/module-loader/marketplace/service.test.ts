import { createSecretContext } from "./fixtures/encryption.js";
import test from "node:test";
import assert from "node:assert/strict";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { execFile, spawnSync } from "node:child_process";
import { promisify } from "node:util";
import {
    DEFAULT_TRUSTED_MODULE_SOURCE,
    ModuleMarketplaceService,
} from "../../../index.js";

import { checkoutModuleRepository } from "../../../services/module-loader/marketplace/checkout.js";

const source = {
    uuid: "6931e77f-f740-4db7-9f7c-5809f44255ee",
    name: "Additional source",
    provider: "github" as const,
    namespace: "example",
    baseUrl: "https://api.github.com",
};
const execFileAsync = promisify(execFile);
const gitAvailable = spawnSync("git", ["--version"]).status === 0;

test("module marketplace persists source metadata and exposes credential configuration", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "cognis-marketplace-"));
    const state = path.join(root, "sources.json");
    const service = new ModuleMarketplaceService(
        state,
        path.join(root, "modules"),
    );
    const saved = await service.saveSource(source);
    assert.equal(saved.credentialConfigured, false);
    const listed = await new ModuleMarketplaceService(
        state,
        path.join(root, "modules"),
    ).listSources();
    assert.equal(
        listed.find((entry) => entry.uuid === source.uuid)?.namespace,
        source.namespace,
    );
    assert.equal(listed[0].trusted, true);
    await assert.rejects(
        service.removeSource(DEFAULT_TRUSTED_MODULE_SOURCE.uuid),
        /trusted_module_source_readonly/,
    );
    await service.removeSource(source.uuid);
    assert.equal((await service.listSources()).length, 1);
});

test("trusted source metadata stays canonical when administrators edit settings", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "cognis-marketplace-"));
    const service = new ModuleMarketplaceService(
        path.join(root, "sources.json"),
        path.join(root, "modules"),
    );
    const saved = await service.saveSource({
        ...DEFAULT_TRUSTED_MODULE_SOURCE,
        name: "Other",
        baseUrl: "https://other.test",
    });
    assert.equal(saved.name, DEFAULT_TRUSTED_MODULE_SOURCE.name);
    assert.equal(saved.baseUrl, DEFAULT_TRUSTED_MODULE_SOURCE.baseUrl);
    await assert.rejects(
        service.saveSource({
            ...DEFAULT_TRUSTED_MODULE_SOURCE,
            scanPrivateRepos: true,
        }),
        /module_source_credential_required/,
    );
    assert.equal((await service.listSources())[0].scanPrivateRepos, false);
});

test("cached UUID collisions prefer the trusted Cognis source", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "cognis-marketplace-"));
    const statePath = path.join(root, "sources.json");
    const cacheRoot = path.join(root, "modules", ".cache");
    await mkdir(cacheRoot, { recursive: true });
    await writeFile(statePath, JSON.stringify([source]));
    await writeFile(
        path.join(cacheRoot, "catalog.json"),
        JSON.stringify([
            {
                uuid: "71567e48-480a-45a5-a853-8c96d6ab9973",
                id: "imposter",
                sourceUuid: source.uuid,
            },
            {
                uuid: "71567e48-480a-45a5-a853-8c96d6ab9973",
                id: "trusted",
                sourceUuid: DEFAULT_TRUSTED_MODULE_SOURCE.uuid,
            },
        ]),
    );
    const modules = await new ModuleMarketplaceService(
        statePath,
        path.join(root, "modules"),
    ).listCachedModules();
    assert.deepEqual(
        modules.map((module) => module.id),
        ["trusted"],
    );
});

test("module marketplace stores a configurable recommended list URL", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "cognis-marketplace-"));
    const service = new ModuleMarketplaceService(
        path.join(root, "sources.json"),
        path.join(root, "modules"),
    );
    assert.equal(
        (await service.getSettings()).recommendedModulesUrl,
        "https://cognis.study/static/recommended-modules.json",
    );
    await service.saveSettings({
        recommendedModulesUrl: "https://example.com/modules.json",
    });
    assert.equal(
        (await service.getSettings()).recommendedModulesUrl,
        "https://example.com/modules.json",
    );
});

test("module marketplace persists scan throttling across service restarts", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "cognis-marketplace-"));
    const statePath = path.join(root, "sources.json");
    const originalFetch = globalThis.fetch;
    let requests = 0;
    globalThis.fetch = async () => {
        requests += 1;
        return new Response("[]", {
            headers: { "content-type": "application/json" },
        });
    };
    try {
        await new ModuleMarketplaceService(
            statePath,
            path.join(root, "modules"),
        ).discover();
        await new ModuleMarketplaceService(
            statePath,
            path.join(root, "modules"),
        ).discover();
        assert.equal(requests, 1);
    } finally {
        globalThis.fetch = originalFetch;
    }
});

test("forced catalog refresh bypasses persisted scan throttling", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "cognis-marketplace-"));
    const service = new ModuleMarketplaceService(
        path.join(root, "sources.json"),
        path.join(root, "modules"),
    );
    const originalFetch = globalThis.fetch;
    let requests = 0;
    globalThis.fetch = async () => {
        requests += 1;
        return new Response("[]", {
            headers: { "content-type": "application/json" },
        });
    };
    try {
        await service.discover();
        await service.discover(undefined, true);
        assert.equal(requests, 2);
    } finally {
        globalThis.fetch = originalFetch;
    }
});

test("credential updates bypass scan throttling and authenticate immediately", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "cognis-marketplace-"));
    const service = new ModuleMarketplaceService(
        path.join(root, "sources.json"),
        path.join(root, "modules"),
        () => undefined,
        createSecretContext().ctx,
    );
    const originalFetch = globalThis.fetch;
    const authorizations: Array<string | null> = [];
    globalThis.fetch = async (_input, init) => {
        authorizations.push(new Headers(init?.headers).get("authorization"));
        return new Response("[]", {
            headers: { "content-type": "application/json" },
        });
    };
    try {
        await service.discover();
        await service.saveSource(
            { ...DEFAULT_TRUSTED_MODULE_SOURCE },
            { token: "github-secret" },
        );
        await service.discover();
        assert.deepEqual(authorizations, [
            null,
            "Bearer github-secret",
            "Bearer github-secret",
        ]);
    } finally {
        globalThis.fetch = originalFetch;
    }
});

test("GitHub credential validation requires private repository scope", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "cognis-marketplace-"));
    const warnings: Array<Record<string, unknown>> = [];
    const service = new ModuleMarketplaceService(
        path.join(root, "sources.json"),
        path.join(root, "modules"),
        (level, _message, meta) => {
            if (level === "warn") warnings.push(meta);
        },
    );
    const originalFetch = globalThis.fetch;
    let requests = 0;
    globalThis.fetch = async (_input, init) => {
        requests += 1;
        assert.equal(
            new Headers(init?.headers).get("authorization"),
            "Bearer limited-token",
        );
        return requests === 1
            ? new Response(
                  JSON.stringify([
                      {
                          full_name: "Cognis-Labs-HQ/private-module",
                          private: true,
                      },
                  ]),
                  {
                      headers: {
                          "content-type": "application/json",
                          "x-oauth-scopes": "read:org, public_repo",
                      },
                  },
              )
            : new Response("[]", {
                  headers: { "content-type": "application/json" },
              });
    };
    try {
        assert.deepEqual(
            await service.validateSourceCredential(
                {
                    ...DEFAULT_TRUSTED_MODULE_SOURCE,
                    scanPrivateRepos: true,
                },
                "limited-token",
            ),
            {
                valid: false,
                warnings: ["github_repo_scope_missing"],
                scopes: ["read:org", "public_repo"],
            },
        );
        assert.deepEqual(warnings[0].issues, ["github_repo_scope_missing"]);
        assert.match(
            String(
                (warnings[0].requiredPermissions as { fineGrained: string })
                    .fineGrained,
            ),
            /Metadata: read; Contents: read/,
        );
    } finally {
        globalThis.fetch = originalFetch;
    }
});

test("private source scans report a missing stored credential", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "cognis-marketplace-"));
    const service = new ModuleMarketplaceService(
        path.join(root, "sources.json"),
        path.join(root, "modules"),
    );
    await writeFile(
        path.join(root, "sources.json"),
        JSON.stringify([{ ...source, scanPrivateRepos: true }]),
    );
    const result = await service.discoverWithReport([source.uuid], true);
    assert.deepEqual(result.modules, []);
    assert.deepEqual(result.sourceFailures, [
        {
            sourceUuid: source.uuid,
            sourceName: source.name,
            code: "private_repository_credential_missing",
        },
    ]);
});

test("private credential validation proves repository contents access", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "cognis-marketplace-"));
    const service = new ModuleMarketplaceService(
        path.join(root, "sources.json"),
        path.join(root, "modules"),
    );
    const originalFetch = globalThis.fetch;
    let requests = 0;
    globalThis.fetch = async () => {
        requests += 1;
        return requests === 1
            ? new Response(
                  JSON.stringify([
                      {
                          full_name: "example/private-module",
                          private: true,
                      },
                  ]),
                  { headers: { "content-type": "application/json" } },
              )
            : new Response("forbidden", { status: 403 });
    };
    try {
        assert.deepEqual(
            await service.validateSourceCredential(
                { ...source, scanPrivateRepos: true },
                "fine-grained-token",
            ),
            {
                valid: false,
                warnings: ["private_repository_contents_read_missing"],
                scopes: [],
            },
        );
    } finally {
        globalThis.fetch = originalFetch;
    }
});

test("private scans include organization repositories visible through the authenticated user", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "cognis-marketplace-"));
    const service = new ModuleMarketplaceService(
        path.join(root, "sources.json"),
        path.join(root, "modules"),
        () => undefined,
        createSecretContext().ctx,
    );
    const originalFetch = globalThis.fetch;
    const requestedUrls: string[] = [];
    globalThis.fetch = async (input, init) => {
        const url = String(input);
        requestedUrls.push(url);
        assert.equal(
            new Headers(init?.headers).get("authorization"),
            "Bearer private-token",
        );
        if (url.endsWith("/contents")) return Response.json([]);
        if (url.includes("/orgs/Cognis-Labs-HQ/repos?")) {
            return Response.json([
                {
                    id: 179,
                    full_name: "Cognis-Labs-HQ/cognis-module-line-integration",
                    private: true,
                },
            ]);
        }
        if (url.includes("/user/repos?")) {
            return Response.json([
                {
                    id: 179,
                    clone_url:
                        "https://github.com/Cognis-Labs-HQ/cognis-module-line-integration.git",
                    default_branch: "main",
                    full_name: "Cognis-Labs-HQ/cognis-module-line-integration",
                    owner: { login: "Cognis-Labs-HQ" },
                    private: true,
                },
            ]);
        }
        if (url.includes("/branches?") || url.includes("/tags?")) {
            return Response.json([]);
        }
        if (url.includes("/contents/manifest.json?")) {
            return Response.json({
                content: Buffer.from(
                    JSON.stringify({
                        uuid: "f21c4552-9f0d-49ef-afc0-bf49eb890635",
                        id: "line-integration",
                        name: "LINE Integration",
                        version: "1.0.0",
                        publisher: "Cognis Labs HQ",
                        class: "extension",
                        coreApiVersion: "v1",
                        summary: "LINE integration",
                        description: "Connect Cognis with LINE.",
                        categories: ["Communication"],
                        tags: ["line"],
                        license: "MIT",
                        repository:
                            "https://github.com/Cognis-Labs-HQ/cognis-module-line-integration",
                        capabilities: [],
                        entrypoints: { bootstrap: "./bootstrap.js" },
                        assets: {
                            icon: "assets/icon.svg",
                            banner: "assets/banner.svg",
                        },
                    }),
                ).toString("base64"),
            });
        }
        return new Response("", { status: 404 });
    };
    try {
        await service.saveSource(
            { ...DEFAULT_TRUSTED_MODULE_SOURCE, scanPrivateRepos: true },
            { token: "private-token" },
        );
        requestedUrls.length = 0;
        const result = await service.discoverWithReport(
            [DEFAULT_TRUSTED_MODULE_SOURCE.uuid],
            true,
        );
        assert.deepEqual(
            result.modules.map((module) => module.id),
            ["line-integration"],
        );
        assert.deepEqual(result.sourceFailures, []);
        assert.ok(requestedUrls.some((url) => url.includes("/user/repos?")));
        assert.ok(requestedUrls.every((url) => !url.includes("affiliation=")));
    } finally {
        globalThis.fetch = originalFetch;
    }
});

test("GitHub repository assets use the configured API host", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "cognis-marketplace-"));
    const service = new ModuleMarketplaceService(
        path.join(root, "sources.json"),
        path.join(root, "modules"),
    );
    const url = (service as any).resolveRepositoryAssetUrl(
        {
            ...source,
            baseUrl: "https://github.example.test/api/v3",
        },
        "acme/notes",
        "main",
        "assets/icon.svg",
    );

    assert.equal(
        url,
        "https://github.example.test/api/v3/repos/acme/notes/contents/assets/icon.svg?ref=main",
    );
});

test("module installation requires an available catalog branch", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "cognis-marketplace-"));
    const modulesRoot = path.join(root, "modules");
    const service = new ModuleMarketplaceService(
        path.join(root, "sources.json"),
        modulesRoot,
    );
    await service.saveSource(source);
    const module = {
        uuid: "71567e48-480a-45a5-a853-8c96d6ab9973",
        sourceUuid: source.uuid,
        cloneUrl: "https://github.com/example/notes.git",
        defaultBranch: "main",
        branches: [],
        releases: [],
    };
    await mkdir(path.join(modulesRoot, ".cache"), { recursive: true });
    await writeFile(
        path.join(modulesRoot, ".cache", "catalog.json"),
        JSON.stringify([module]),
    );
    await assert.rejects(
        service.install(module as never, "main"),
        /invalid_module_branch/,
    );
});

test(
    "module checkout installs the catalog commit when a branch has advanced",
    { skip: !gitAvailable },
    async () => {
        const root = await mkdtemp(
            path.join(os.tmpdir(), "cognis-marketplace-"),
        );
        const repository = path.join(root, "repository");
        const checkout = path.join(root, "checkout");
        await mkdir(repository);
        await execFileAsync("git", ["init", "-b", "main"], { cwd: repository });
        await execFileAsync(
            "git",
            ["config", "user.email", "tests@cognis.dev"],
            {
                cwd: repository,
            },
        );
        await execFileAsync("git", ["config", "user.name", "Cognis Tests"], {
            cwd: repository,
        });
        const manifestPath = path.join(repository, "manifest.json");
        await writeFile(manifestPath, JSON.stringify({ version: "1.4.57" }));
        await execFileAsync("git", ["add", "manifest.json"], {
            cwd: repository,
        });
        await execFileAsync("git", ["commit", "-m", "older release"], {
            cwd: repository,
        });
        const { stdout: olderCommit } = await execFileAsync(
            "git",
            ["rev-parse", "HEAD"],
            { cwd: repository },
        );
        await writeFile(manifestPath, JSON.stringify({ version: "1.4.58" }));
        await execFileAsync("git", ["commit", "-am", "newer release"], {
            cwd: repository,
        });
        await checkoutModuleRepository({
            cloneUrl: repository,
            commit: olderCommit.trim(),
            root: checkout,
            environment: { ...process.env, GIT_TERMINAL_PROMPT: "0" },
            log: () => undefined,
        });
        const { stdout: historySize } = await execFileAsync("git", [
            "-C",
            checkout,
            "rev-list",
            "--count",
            "HEAD",
        ]);
        assert.equal(historySize.trim(), "1");

        assert.equal(
            JSON.parse(
                await readFile(path.join(checkout, "manifest.json"), "utf8"),
            ).version,
            "1.4.57",
        );
    },
);

test("module marketplace discovers repository manifests", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "cognis-marketplace-"));
    const warnings: Array<Record<string, unknown>> = [];
    const scanLogs: Array<{ message: string; meta: Record<string, unknown> }> =
        [];
    const service = new ModuleMarketplaceService(
        path.join(root, "sources.json"),
        path.join(root, "modules"),
        (level, message, meta) => {
            if (level === "info") scanLogs.push({ message, meta });
            if (level === "warn" && "rejectedCloneUrl" in meta) {
                warnings.push(meta);
            }
        },
    );
    const installedRoot = path.join(
        root,
        "modules",
        "71567e48-480a-45a5-a853-8c96d6ab9973",
    );
    await mkdir(installedRoot, { recursive: true });
    await writeFile(
        path.join(installedRoot, ".cognis-install.json"),
        JSON.stringify({
            sourceUuid: "178271bf-5631-40df-82df-967f8a37a020",
            cloneUrl: "https://github.com/acme/notes.git",
            branch: "main",
            commit: "older123",
        }),
    );
    await Promise.all([
        writeFile(path.join(installedRoot, "README.en.md"), "# English"),
        writeFile(path.join(installedRoot, "README.ja.md"), "# 日本語"),
    ]);
    const originalFetch = globalThis.fetch;
    let moduleName = "Notes";
    let moduleDescription = "Shared notes.";
    let mainVersion = "1.0.0";
    let assetBody = "png-one";
    const branchRequestCaches: Array<RequestCache | undefined> = [];
    globalThis.fetch = async (input, init) => {
        if (String(input).includes("/branches?")) {
            branchRequestCaches.push(init?.cache);
        }
        return String(input).includes("/README.md?")
            ? new Response(
                  JSON.stringify({
                      content: Buffer.from(
                          "# Notes\nA useful module.",
                      ).toString("base64"),
                  }),
              )
            : /\/LICENSE(?:\.md|\.txt)?(?:\?|$)/.test(String(input))
              ? new Response("", { status: 404 })
              : String(input).includes("/assets/")
                ? /\.svg(?:\?|$)/.test(String(input))
                    ? new Response("", { status: 404 })
                    : new Response(assetBody)
                : String(input).includes("/tags?")
                  ? new Response(
                        JSON.stringify([
                            { name: "v1.0.0", commit: { sha: "tag123" } },
                        ]),
                    )
                  : String(input).includes("/branches?")
                    ? new Response(
                          JSON.stringify([
                              { name: "main", commit: { sha: "abc123" } },
                              { name: "preview", commit: { sha: "def456" } },
                          ]),
                      )
                    : String(input).includes("/repos?")
                      ? new Response(
                            JSON.stringify([
                                {
                                    clone_url:
                                        "https://github.com/acme/notes.git",
                                    default_branch: "main",
                                    full_name: "acme/notes",
                                },
                                {
                                    clone_url:
                                        "https://github.com/acme/duplicate-notes.git",
                                    default_branch: "main",
                                    full_name: "acme/duplicate-notes",
                                },
                            ]),
                        )
                      : new Response(
                            JSON.stringify({
                                content: Buffer.from(
                                    JSON.stringify({
                                        uuid: "71567e48-480a-45a5-a853-8c96d6ab9973",
                                        id: "notes",
                                        name: String(input).includes(
                                            "ref=preview",
                                        )
                                            ? "Preview Notes"
                                            : moduleName,
                                        version:
                                            String(input).includes(
                                                "ref=def456",
                                            ) ||
                                            String(input).includes(
                                                "ref=preview",
                                            )
                                                ? "1.1.0"
                                                : mainVersion,
                                        publisher: "Acme",
                                        class: "extension",
                                        coreApiVersion: "v1",
                                        summary: "Notes",
                                        description: moduleDescription,
                                        categories: ["Productivity"],
                                        tags: ["notes"],
                                        recommended: true,
                                        license: "MIT",
                                        repository:
                                            "https://github.com/acme/notes",
                                        capabilities: [],
                                        entrypoints: {
                                            bootstrap: "./bootstrap.js",
                                        },
                                        assets: {
                                            icon: "assets/icon.svg",
                                            banner: "assets/banner.svg",
                                        },
                                    }),
                                ).toString("base64"),
                            }),
                        );
    };
    try {
        const modules = await service.discover();
        assert.deepEqual(
            scanLogs.map(({ message, meta }) => ({
                message,
                catalogModulesFound: meta.catalogModulesFound,
            })),
            [
                {
                    message: "Module source scan started.",
                    catalogModulesFound: undefined,
                },
                {
                    message: "Module source scan completed.",
                    catalogModulesFound: 1,
                },
            ],
        );
        assert.equal(modules.length, 1);
        assert.equal(modules[0].id, "notes");
        assert.deepEqual(warnings, [
            {
                moduleUuid: "71567e48-480a-45a5-a853-8c96d6ab9973",
                acceptedCloneUrl: "https://github.com/acme/notes.git",
                rejectedCloneUrl: "https://github.com/acme/duplicate-notes.git",
                rejectedSourceUuid: "178271bf-5631-40df-82df-967f8a37a020",
            },
        ]);
        assert.equal(
            (modules[0] as (typeof modules)[0] & { recommended?: boolean })
                .recommended,
            undefined,
        );
        assert.equal(
            modules[0].sourceUuid,
            "178271bf-5631-40df-82df-967f8a37a020",
        );
        assert.match(modules[0].assetIds?.icon ?? "", /^[a-f0-9]{64}$/);
        assert.equal(
            (await service.getAsset(modules[0].assetIds?.icon ?? ""))
                ?.contentType,
            "image/png",
        );
        assert.equal(
            (
                await new ModuleMarketplaceService(
                    path.join(root, "sources.json"),
                    path.join(root, "modules"),
                ).getAsset(modules[0].assetIds?.icon ?? "")
            )?.body.toString(),
            "png-one",
        );
        assert.equal(modules[0].readme, "# Notes\nA useful module.");
        assert.deepEqual(modules[0].readmes, {
            en: "# English",
            ja: "# 日本語",
        });
        assert.equal(modules[0].license, undefined);
        assert.equal(modules[0].defaultBranch, "main");
        assert.equal(modules[0].version, "1.0.0");
        assert.deepEqual(modules[0].branches, [
            { name: "main", commit: "abc123", version: "1.0.0" },
            { name: "preview", commit: "def456", version: "1.1.0" },
        ]);
        assert.ok(branchRequestCaches.length > 0);
        assert.deepEqual(new Set(branchRequestCaches), new Set(["no-store"]));
        assert.deepEqual(modules[0].releases, [
            { name: "v1.0.0", commit: "tag123", version: "1.0.0" },
        ]);
        assert.equal(modules[0].installed, true);
        assert.equal(modules[0].installedBranch, "main");
        assert.equal(modules[0].installedCommit, "older123");
        assert.equal(modules[0].updateAvailable, false);
        await service.saveSelectedBranch(modules[0].uuid, "preview");
        assert.equal((await service.discover())[0].selectedBranch, "preview");

        const originalIcon = modules[0].assetIds?.icon;
        moduleName = "Collaborative Notes";
        moduleDescription = "Updated shared notes.";
        mainVersion = "1.1.0";
        assetBody = "png-two";
        const refreshed = await service.discover();
        assert.equal(refreshed[0].name, "Notes");
        assert.equal(refreshed[0].description, "Shared notes.");
        assert.equal(refreshed[0].assetIds?.icon, originalIcon);
        const forced = await service.discover(undefined, true);
        assert.equal(forced[0].name, "Collaborative Notes");
        assert.equal(forced[0].description, "Updated shared notes.");
        assert.equal(forced[0].version, "1.1.0");
        assert.equal(forced[0].selectedBranch, "preview");
        assert.equal(
            forced[0].branches.find((branch) => branch.name === "main")
                ?.version,
            "1.1.0",
        );
        await writeFile(
            path.join(installedRoot, ".cognis-install.json"),
            JSON.stringify({
                sourceUuid: "178271bf-5631-40df-82df-967f8a37a020",
                cloneUrl: "https://github.com/acme/notes.git",
                branch: "preview",
                commit: "def456",
            }),
        );
        const preview = await service.discover(undefined, true);
        assert.equal(preview[0].name, "Preview Notes");
        assert.equal(preview[0].installedBranch, "preview");
        assert.equal(preview[0].version, "1.1.0");

        globalThis.fetch = async () => {
            throw new Error("source unavailable");
        };
        assert.equal((await service.discover())[0].id, "notes");
        await service.uninstall(modules[0].uuid);
        assert.equal((await service.discover())[0].installed, false);

        globalThis.fetch = async () => new Response("[]");
        assert.equal((await service.discover())[0].id, "notes");
        globalThis.fetch = async () => {
            throw new Error("source unavailable");
        };
        assert.equal((await service.discover())[0].id, "notes");
    } finally {
        globalThis.fetch = originalFetch;
    }
});

test("module marketplace ignores incomplete module registrations", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "cognis-marketplace-"));
    const warnings: Array<Record<string, unknown>> = [];
    const service = new ModuleMarketplaceService(
        path.join(root, "sources.json"),
        path.join(root, "modules"),
        (level, _message, meta) => {
            if (level === "warn") warnings.push(meta);
        },
    );
    const originalFetch = globalThis.fetch;
    globalThis.fetch = async (input) =>
        String(input).includes("/repos?")
            ? new Response(
                  JSON.stringify([
                      {
                          clone_url: "https://github.com/acme/incomplete.git",
                          default_branch: "main",
                          full_name: "acme/incomplete",
                      },
                  ]),
              )
            : new Response(JSON.stringify({ id: "incomplete" }));
    try {
        assert.deepEqual(await service.discover(), []);
        assert.equal(warnings[0]?.repository, "acme/incomplete");
        assert.equal(warnings[0]?.error, "invalid_module_manifest");
    } finally {
        globalThis.fetch = originalFetch;
    }
});

test("module marketplace tolerates an unavailable source", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "cognis-marketplace-"));
    const service = new ModuleMarketplaceService(
        path.join(root, "sources.json"),
        path.join(root, "modules"),
    );
    const originalFetch = globalThis.fetch;
    globalThis.fetch = async () => {
        throw new TypeError("fetch failed");
    };
    try {
        assert.deepEqual(await service.discover(), []);
    } finally {
        globalThis.fetch = originalFetch;
    }
});

test("module marketplace serves persisted results after restart", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "cognis-marketplace-"));
    const statePath = path.join(root, "sources.json");
    const catalogModule = {
        uuid: "71567e48-480a-45a5-a853-8c96d6ab9973",
        id: "notes",
        sourceUuid: source.uuid,
        cloneUrl: "https://github.com/example/notes.git",
    };
    await writeFile(statePath, JSON.stringify([source]));
    await mkdir(path.join(root, "modules", ".cache"), { recursive: true });
    await writeFile(
        path.join(root, "modules", ".cache", "catalog.json"),
        JSON.stringify([catalogModule]),
    );
    const restarted = new ModuleMarketplaceService(
        statePath,
        path.join(root, "modules"),
    );
    assert.deepEqual(await restarted.listCachedModules(), [catalogModule]);
});

test("GitLab installation validates namespace within the configured deployment prefix", async (t) => {
    const root = await mkdtemp(path.join(os.tmpdir(), "cognis-gitlab-prefix-"));
    t.after(() => rm(root, { recursive: true, force: true }));
    const modulesRoot = path.join(root, "modules");
    const service = new ModuleMarketplaceService(
        path.join(root, "sources.json"),
        modulesRoot,
    );
    await service.saveSource({
        ...source,
        provider: "gitlab",
        baseUrl: "https://example.test/gitlab/api/v4",
        namespace: "team/subgroup",
    });
    const cache = path.join(modulesRoot, ".cache");
    await mkdir(cache, { recursive: true });
    for (const [cloneUrl, expected] of [
        [
            "https://example.test/gitlab/team/subgroup/module.git",
            /invalid_module_branch/,
        ],
        [
            "https://example.test/team/subgroup/module.git",
            /module_source_repository_mismatch/,
        ],
        [
            "https://example.test/gitlab/team/other/module.git",
            /module_source_repository_mismatch/,
        ],
        [
            "https://other.test/gitlab/team/subgroup/module.git",
            /module_source_repository_mismatch/,
        ],
    ] as const) {
        const module = {
            uuid: "71567e48-480a-45a5-a853-8c96d6ab9973",
            sourceUuid: source.uuid,
            cloneUrl,
            defaultBranch: "main",
            branches: [],
            releases: [],
        };
        await writeFile(
            path.join(cache, "catalog.json"),
            JSON.stringify([module]),
        );
        const catalog = await service.listCachedModules();
        assert.equal(catalog.length, 1);
        await assert.rejects(service.install(catalog[0], "main"), expected);
    }
});
