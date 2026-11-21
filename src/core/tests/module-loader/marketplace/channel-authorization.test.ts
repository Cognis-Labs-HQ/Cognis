import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, mkdir, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { ModuleMarketplaceService, type ModuleSource } from "../../../index.js";
import { createSecretContext } from "./fixtures/encryption.js";

for (const provider of ["github", "gitlab"] as const) {
    for (const operation of ["branches", "tags", "manifest"] as const) {
        for (const status of [401, 403]) {
            test(`${provider} private ${operation} denial (${status}) remains visible and retains the catalog`, async (context) => {
                const root = await mkdtemp(
                    path.join(tmpdir(), "cognis-channel-auth-"),
                );
                context.after(() => rm(root, { recursive: true, force: true }));
                const source: ModuleSource = {
                    uuid: "6931e77f-f740-4db7-9f7c-5809f44255ee",
                    name: "Private source",
                    provider,
                    namespace: "example",
                    baseUrl: "https://modules.example.test",
                    scanPrivateRepos: true,
                };
                let deny = false;
                context.mock.method(
                    globalThis,
                    "fetch",
                    async (
                        input: string | URL | Request,
                        init?: RequestInit,
                    ) => {
                        const url = new URL(String(input));
                        const headers = new Headers(init?.headers);
                        assert.equal(
                            headers.get(
                                provider === "github"
                                    ? "authorization"
                                    : "private-token",
                            ),
                            provider === "github"
                                ? "Bearer test-token"
                                : "test-token",
                        );
                        if (url.pathname === "/user/repos")
                            return Response.json([]);
                        if (
                            url.pathname.endsWith("/repos") ||
                            url.pathname.endsWith("/projects")
                        )
                            return Response.json([
                                {
                                    id: 1,
                                    private: true,
                                    visibility: "private",
                                    clone_url:
                                        "https://modules.example.test/example/private.git",
                                    default_branch: "main",
                                    full_name: "example/private",
                                    path_with_namespace: "example/private",
                                },
                            ]);
                        const matches =
                            operation === "manifest"
                                ? url.pathname.includes("manifest.json")
                                : url.pathname.endsWith(`/${operation}`);
                        if (deny && matches)
                            return new Response("", { status });
                        if (url.pathname.endsWith("/branches"))
                            return Response.json([
                                {
                                    name: "main",
                                    commit: {
                                        [provider === "github" ? "sha" : "id"]:
                                            "a".repeat(40),
                                    },
                                },
                            ]);
                        return Response.json([]);
                    },
                );
                const service = new ModuleMarketplaceService(
                    path.join(root, "sources.json"),
                    path.join(root, "modules"),
                    undefined,
                    createSecretContext().ctx,
                );
                await service.saveSource(source, { token: "test-token" });
                const cached = {
                    id: "private",
                    uuid: "71567e48-480a-45a5-a853-8c96d6ab9973",
                    sourceUuid: source.uuid,
                    cloneUrl:
                        "https://modules.example.test/example/private.git",
                    selectedBranch: "preview",
                    defaultBranch: "main",
                    branches: [{ name: "preview", commit: "b".repeat(40) }],
                    releases: [],
                };
                const cache = path.join(root, "modules", ".cache");
                await mkdir(cache, { recursive: true });
                await writeFile(
                    path.join(cache, "catalog.json"),
                    JSON.stringify([cached]),
                );
                deny = true;
                const report = await service.discoverWithReport(
                    [source.uuid],
                    true,
                );
                assert.deepEqual(report.modules, [cached]);
                assert.deepEqual(report.sourceFailures, [
                    {
                        sourceUuid: source.uuid,
                        sourceName: source.name,
                        code: "private_repository_contents_access_failed",
                    },
                ]);
                assert.deepEqual(await service.listCachedModules(), [cached]);
            });
        }
    }
}
