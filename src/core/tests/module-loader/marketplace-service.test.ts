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
} from "../../index.js";

const source = {
    uuid: "6931e77f-f740-4db7-9f7c-5809f44255ee",
    name: "Additional source",
    provider: "github" as const,
    namespace: "example",
    baseUrl: "https://api.github.com",
};
const execFileAsync = promisify(execFile);
const gitAvailable = spawnSync("git", ["--version"]).status === 0;

test("module marketplace persists source metadata without PAT values", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "cognis-marketplace-"));
    const service = new ModuleMarketplaceService(
        path.join(root, "sources.json"),
        path.join(root, "modules"),
    );
    await service.saveSource({
        ...source,
        credentialId: "module-source:pat",
        scanPrivateRepos: true,
    });
    assert.deepEqual(await service.listSources(), [
        {
            uuid: "178271bf-5631-40df-82df-967f8a37a020",
            name: "Cognis Labs HQ",
            provider: "github",
            namespace: "Cognis-Labs-HQ",
            baseUrl: "https://api.github.com",
            homepage: "https://github.com/Cognis-Labs-HQ",
            trusted: true,
            credentialId: undefined,
        },
        {
            ...source,
            credentialId: "module-source:pat",
            scanPrivateRepos: true,
            trusted: false,
        },
    ]);
    assert.equal(
        (
            await new ModuleMarketplaceService(
                path.join(root, "sources.json"),
                path.join(root, "modules"),
            ).listSources()
        )[1].scanPrivateRepos,
        true,
    );
});

test("module marketplace always provides an immutable trusted source", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "cognis-marketplace-"));
    const service = new ModuleMarketplaceService(
        path.join(root, "sources.json"),
        path.join(root, "modules"),
    );
    const [trusted] = await service.listSources();
    assert.equal(trusted.namespace, "Cognis-Labs-HQ");
    assert.equal(trusted.trusted, true);
    await assert.rejects(
        service.removeSource(trusted.uuid),
        /trusted_module_source_readonly/,
    );
});

test("trusted source updates accept credentials without mutable metadata", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "cognis-marketplace-"));
    const service = new ModuleMarketplaceService(
        path.join(root, "sources.json"),
        path.join(root, "modules"),
    );
    const saved = await service.saveSource({
        uuid: DEFAULT_TRUSTED_MODULE_SOURCE.uuid,
        credentialId: "module-source:trusted:pat",
    } as any);
    assert.equal(saved.name, "Cognis Labs HQ");
    assert.equal(saved.credentialId, "module-source:trusted:pat");
    await rm(path.join(root, "sources.json"));
    const [restartedSource] = await new ModuleMarketplaceService(
        path.join(root, "sources.json"),
        path.join(root, "modules"),
    ).listSources();
    assert.equal(restartedSource.credentialId, "module-source:trusted:pat");
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
        await service.discover({}, undefined, true);
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
        await service.saveSource({
            uuid: DEFAULT_TRUSTED_MODULE_SOURCE.uuid,
            credentialId: "module-source:trusted:pat",
        } as any);
        await service.discover({
            "module-source:trusted:pat": "github-secret",
        });
        assert.deepEqual(authorizations, [null, "Bearer github-secret"]);
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
    await service.saveSource({
        ...source,
        credentialId: "module-source:private:pat",
        scanPrivateRepos: true,
    });
    const result = await service.discoverWithReport({}, [source.uuid], true);
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

test("module installation accepts cached catalogs created before release discovery", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "cognis-marketplace-"));
    const service = new ModuleMarketplaceService(
        path.join(root, "sources.json"),
        path.join(root, "modules"),
    );
    await assert.rejects(
        service.install(
            {
                uuid: "71567e48-480a-45a5-a853-8c96d6ab9973",
                cloneUrl: "https://github.com/acme/notes.git",
                defaultBranch: "main",
                branches: [],
            } as any,
            undefined,
            "main",
        ),
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
        const service = new ModuleMarketplaceService(
            path.join(root, "sources.json"),
            path.join(root, "modules"),
        );

        await (service as any).cloneRepository(
            repository,
            "main",
            olderCommit.trim(),
            checkout,
            { ...process.env, GIT_TERMINAL_PROMPT: "0" },
        );

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
                ? String(input).includes(".svg?")
                    ? new Response("", { status: 404 })
                    : new Response(
                          JSON.stringify({
                              content:
                                  Buffer.from(assetBody).toString("base64"),
                          }),
                      )
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
                modulesFound: meta.modulesFound,
            })),
            [
                {
                    message: "Module source scan started.",
                    modulesFound: undefined,
                },
                {
                    message: "Module source scan completed.",
                    modulesFound: 1,
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

        const originalIcon = modules[0].assetIds?.icon;
        moduleName = "Collaborative Notes";
        moduleDescription = "Updated shared notes.";
        mainVersion = "1.1.0";
        assetBody = "png-two";
        const refreshed = await service.discover();
        assert.equal(refreshed[0].name, "Notes");
        assert.equal(refreshed[0].description, "Shared notes.");
        assert.equal(refreshed[0].assetIds?.icon, originalIcon);
        const forced = await service.discover({}, undefined, true);
        assert.equal(forced[0].name, "Collaborative Notes");
        assert.equal(forced[0].description, "Updated shared notes.");
        assert.equal(forced[0].version, "1.1.0");
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
        const preview = await service.discover({}, undefined, true);
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
    const service = new ModuleMarketplaceService(
        path.join(root, "sources.json"),
        path.join(root, "modules"),
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

test("module marketplace removes cached modules when a successful scan returns no repositories", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "cognis-marketplace-"));
    const statePath = path.join(root, "sources.json");
    await mkdir(path.join(root, "modules", ".cache"), { recursive: true });
    await writeFile(
        path.join(root, "modules", ".cache", "catalog.json"),
        JSON.stringify([
            {
                uuid: "71567e48-480a-45a5-a853-8c96d6ab9973",
                id: "notes",
                sourceUuid: "178271bf-5631-40df-82df-967f8a37a020",
                cloneUrl: "https://github.com/acme/notes.git",
            },
        ]),
    );
    const service = new ModuleMarketplaceService(
        statePath,
        path.join(root, "modules"),
    );
    const originalFetch = globalThis.fetch;
    globalThis.fetch = async () => new Response("[]");
    try {
        assert.deepEqual(await service.discover(), []);
    } finally {
        globalThis.fetch = originalFetch;
    }
});

test("module marketplace keeps cached repositories whose refresh is inconclusive", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "cognis-marketplace-"));
    const statePath = path.join(root, "sources.json");
    const service = new ModuleMarketplaceService(
        statePath,
        path.join(root, "modules"),
    );
    await mkdir(path.join(root, "modules", ".cache"), { recursive: true });
    await writeFile(
        path.join(root, "modules", ".cache", "catalog.json"),
        JSON.stringify([
            {
                uuid: "71567e48-480a-45a5-a853-8c96d6ab9973",
                id: "notes",
                sourceUuid: "178271bf-5631-40df-82df-967f8a37a020",
                cloneUrl: "https://github.com/acme/notes.git",
            },
        ]),
    );
    const originalFetch = globalThis.fetch;
    globalThis.fetch = async (input) =>
        String(input).includes("/repos?")
            ? new Response(
                  JSON.stringify([
                      {
                          clone_url: "https://github.com/acme/notes.git",
                          default_branch: "main",
                          full_name: "acme/notes",
                      },
                  ]),
              )
            : new Response("provider error", { status: 500 });
    try {
        assert.equal((await service.discover())[0].id, "notes");
    } finally {
        globalThis.fetch = originalFetch;
    }
});
