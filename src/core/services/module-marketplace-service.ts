import { execFile } from "node:child_process";
import { mkdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";
import type { ModuleManifest } from "../contracts/module-manifest.js";
import { validateModuleRepository } from "./module-repository-validator.js";

const execFileAsync = promisify(execFile);

export type ModuleSourceProvider = "github" | "gitlab";

export interface ModuleSource {
    uuid: string;
    name: string;
    provider: ModuleSourceProvider;
    namespace: string;
    baseUrl: string;
    homepage?: string;
    credentialId?: string;
    trusted?: boolean;
}

export const DEFAULT_TRUSTED_MODULE_SOURCE: Readonly<ModuleSource> =
    Object.freeze({
        uuid: "178271bf-5631-40df-82df-967f8a37a020",
        name: "Cognis Labs HQ",
        provider: "github",
        namespace: "Cognis-Labs-HQ",
        baseUrl: "https://api.github.com",
        homepage: "https://github.com/Cognis-Labs-HQ",
        trusted: true,
    });

export interface MarketplaceModule extends ModuleManifest {
    cloneUrl: string;
    sourceUuid: string;
    installed: boolean;
    readme?: string;
}

export class ModuleMarketplaceService {
    constructor(
        private readonly statePath: string,
        private readonly installRoot: string,
    ) {}

    async listSources(): Promise<ModuleSource[]> {
        try {
            const value = JSON.parse(await readFile(this.statePath, "utf8"));
            const stored = Array.isArray(value)
                ? (value as ModuleSource[])
                : [];
            const trustedOverride = stored.find(
                (source) => source.uuid === DEFAULT_TRUSTED_MODULE_SOURCE.uuid,
            );
            return [
                {
                    ...DEFAULT_TRUSTED_MODULE_SOURCE,
                    credentialId: trustedOverride?.credentialId,
                },
                ...stored.filter(
                    (source) =>
                        source.uuid !== DEFAULT_TRUSTED_MODULE_SOURCE.uuid,
                ),
            ];
        } catch (error) {
            if ((error as NodeJS.ErrnoException).code === "ENOENT") {
                return [{ ...DEFAULT_TRUSTED_MODULE_SOURCE }];
            }
            throw error;
        }
    }

    async saveSource(source: ModuleSource): Promise<ModuleSource> {
        if (source.uuid === DEFAULT_TRUSTED_MODULE_SOURCE.uuid) {
            const immutableFields = [
                "name",
                "provider",
                "namespace",
                "baseUrl",
                "homepage",
            ] as const;
            if (
                immutableFields.some(
                    (field) =>
                        source[field] !== DEFAULT_TRUSTED_MODULE_SOURCE[field],
                )
            ) {
                throw new Error("trusted_module_source_readonly");
            }
            source = {
                ...DEFAULT_TRUSTED_MODULE_SOURCE,
                credentialId: source.credentialId,
            };
        } else {
            source = { ...source, trusted: false };
        }
        this.assertSource(source);
        const sources = await this.listSources();
        const next = sources.filter((entry) => entry.uuid !== source.uuid);
        next.push(source);
        await mkdir(path.dirname(this.statePath), { recursive: true });
        await writeFile(this.statePath, JSON.stringify(next, null, 2), {
            mode: 0o600,
        });
        return source;
    }

    async removeSource(uuid: string): Promise<void> {
        if (uuid === DEFAULT_TRUSTED_MODULE_SOURCE.uuid) {
            throw new Error("trusted_module_source_readonly");
        }
        const sources = (await this.listSources()).filter(
            (source) => source.uuid !== uuid,
        );
        await mkdir(path.dirname(this.statePath), { recursive: true });
        await writeFile(this.statePath, JSON.stringify(sources, null, 2), {
            mode: 0o600,
        });
    }

    async discover(
        tokens: Record<string, string> = {},
        sourceUuids?: string[],
    ): Promise<MarketplaceModule[]> {
        const sources = await this.listSources();
        const selectedSources = sourceUuids
            ? sources.filter((source) => sourceUuids.includes(source.uuid))
            : sources;
        const results = await Promise.allSettled(
            selectedSources.map((source) =>
                this.discoverSource(
                    source,
                    source.credentialId
                        ? tokens[source.credentialId]
                        : undefined,
                ),
            ),
        );
        return results.flatMap((result) =>
            result.status === "fulfilled" ? result.value : [],
        );
    }

    async install(
        module: MarketplaceModule,
        token?: string,
    ): Promise<ModuleManifest> {
        const target = path.join(this.installRoot, module.uuid);
        const temporary = `${target}.installing`;
        await mkdir(this.installRoot, { recursive: true });
        await rm(temporary, { recursive: true, force: true });
        const cloneUrl = this.assertCloneUrl(module.cloneUrl);
        const gitEnvironment: NodeJS.ProcessEnv = {
            ...process.env,
            GIT_TERMINAL_PROMPT: "0",
        };
        if (token) {
            gitEnvironment.GIT_CONFIG_COUNT = "1";
            gitEnvironment.GIT_CONFIG_KEY_0 = "http.extraHeader";
            gitEnvironment.GIT_CONFIG_VALUE_0 = `Authorization: Basic ${Buffer.from(`oauth2:${token}`).toString("base64")}`;
        }
        try {
            await execFileAsync(
                "git",
                ["clone", "--depth=1", "--", cloneUrl, temporary],
                {
                    env: gitEnvironment,
                },
            );
            const manifest = this.parseManifest(
                await readFile(path.join(temporary, "manifest.json"), "utf8"),
            );
            if (manifest.uuid !== module.uuid)
                throw new Error("module_uuid_mismatch");
            await validateModuleRepository(temporary, manifest);
            await rm(target, { recursive: true, force: true });
            await rename(temporary, target);
            return manifest;
        } catch (error) {
            await rm(temporary, { recursive: true, force: true });
            throw error;
        }
    }

    async uninstall(uuid: string): Promise<void> {
        await rm(path.join(this.installRoot, uuid), {
            recursive: true,
            force: true,
        });
    }

    private async discoverSource(
        source: ModuleSource,
        token?: string,
    ): Promise<MarketplaceModule[]> {
        const headers: Record<string, string> = {
            accept: "application/json",
            "user-agent": "cognis-module-marketplace",
        };
        if (token) {
            if (source.provider === "github") {
                headers.authorization = `Bearer ${token}`;
            } else {
                headers["private-token"] = token;
            }
        }
        const endpoint =
            source.provider === "github"
                ? `${source.baseUrl}/orgs/${encodeURIComponent(source.namespace)}/repos?per_page=100`
                : `${source.baseUrl}/groups/${encodeURIComponent(source.namespace)}/projects?per_page=100&include_subgroups=true`;
        const response = await fetch(endpoint, { headers });
        if (!response.ok)
            throw new Error(
                `module_source_discovery_failed:${response.status}`,
            );
        const repositories = (await response.json()) as Array<
            Record<string, unknown>
        >;
        const candidates = await Promise.all(
            repositories.map(async (repository) => {
                const cloneUrl = String(
                    repository.clone_url ?? repository.http_url_to_repo ?? "",
                );
                const defaultBranch = String(
                    repository.default_branch ?? "main",
                );
                const projectPath = String(
                    repository.full_name ??
                        repository.path_with_namespace ??
                        "",
                );
                const rawUrl =
                    source.provider === "github"
                        ? `https://raw.githubusercontent.com/${projectPath}/${defaultBranch}/manifest.json`
                        : `${source.baseUrl}/projects/${encodeURIComponent(projectPath)}/repository/files/manifest.json/raw?ref=${encodeURIComponent(defaultBranch)}`;
                const manifestResponse = await fetch(rawUrl, { headers });
                if (!manifestResponse.ok) return null;
                let manifest: ModuleManifest;
                try {
                    manifest = this.parseManifest(
                        await manifestResponse.text(),
                    );
                } catch {
                    return null;
                }
                const readmeResponse = await fetch(
                    this.resolveRepositoryAssetUrl(
                        source,
                        projectPath,
                        defaultBranch,
                        "README.md",
                    ),
                    { headers },
                );
                const assets = manifest.assets
                    ? {
                          icon: manifest.assets.icon
                              ? this.resolveRepositoryAssetUrl(
                                    source,
                                    projectPath,
                                    defaultBranch,
                                    manifest.assets.icon,
                                )
                              : undefined,
                          banner: manifest.assets.banner
                              ? this.resolveRepositoryAssetUrl(
                                    source,
                                    projectPath,
                                    defaultBranch,
                                    manifest.assets.banner,
                                )
                              : undefined,
                          screenshots: (manifest.assets.screenshots ?? []).map(
                              (assetPath) =>
                                  this.resolveRepositoryAssetUrl(
                                      source,
                                      projectPath,
                                      defaultBranch,
                                      assetPath,
                                  ),
                          ),
                      }
                    : undefined;
                return {
                    ...manifest,
                    assets,
                    cloneUrl,
                    sourceUuid: source.uuid,
                    installed: false,
                    readme: readmeResponse.ok
                        ? await readmeResponse.text()
                        : undefined,
                };
            }),
        );
        return candidates.filter(
            (entry): entry is MarketplaceModule => entry !== null,
        );
    }

    private parseManifest(raw: string): ModuleManifest {
        const manifest = JSON.parse(raw) as ModuleManifest;
        if (
            !manifest.uuid ||
            !/^[0-9a-f]{8}-[0-9a-f-]{27}$/i.test(manifest.uuid) ||
            !manifest.id ||
            !manifest.name ||
            !manifest.version ||
            !manifest.publisher ||
            !manifest.summary ||
            !manifest.description ||
            !manifest.license ||
            !manifest.repository ||
            !manifest.coreApiVersion ||
            !["core", "extension"].includes(manifest.class) ||
            !Array.isArray(manifest.capabilities) ||
            !Array.isArray(manifest.categories) ||
            manifest.categories.length === 0 ||
            !Array.isArray(manifest.tags) ||
            manifest.tags.length === 0 ||
            typeof manifest.recommended !== "boolean" ||
            !manifest.entrypoints?.bootstrap ||
            !manifest.assets?.icon ||
            !manifest.assets?.banner
        ) {
            throw new Error("invalid_module_manifest");
        }
        return manifest;
    }

    private resolveRepositoryAssetUrl(
        source: ModuleSource,
        projectPath: string,
        defaultBranch: string,
        assetPath: string,
    ): string {
        const normalizedPath = assetPath.replaceAll("\\", "/");
        if (
            normalizedPath.startsWith("/") ||
            normalizedPath.split("/").includes("..")
        ) {
            throw new Error("invalid_module_asset_path");
        }
        if (source.provider === "github") {
            return `https://raw.githubusercontent.com/${projectPath}/${encodeURIComponent(defaultBranch)}/${normalizedPath}`;
        }
        return `${source.baseUrl}/projects/${encodeURIComponent(projectPath)}/repository/files/${encodeURIComponent(normalizedPath)}/raw?ref=${encodeURIComponent(defaultBranch)}`;
    }

    private assertSource(source: ModuleSource): void {
        if (!/^[0-9a-f]{8}-[0-9a-f-]{27}$/i.test(source.uuid))
            throw new Error("invalid_source_uuid");
        const url = new URL(source.baseUrl);
        if (url.protocol !== "https:" || !source.namespace.trim())
            throw new Error("invalid_module_source");
    }

    private assertCloneUrl(cloneUrl: string): string {
        const parsed = new URL(cloneUrl);
        if (
            parsed.protocol !== "https:" ||
            parsed.username ||
            parsed.password
        ) {
            throw new Error("unsupported_clone_url");
        }
        return parsed.toString();
    }
}
