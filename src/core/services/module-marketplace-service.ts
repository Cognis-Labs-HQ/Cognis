import { execFile } from "node:child_process";
import { createHash } from "node:crypto";
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
    branches: Array<{ name: string; commit: string; version?: string }>;
    releases: Array<{ name: string; commit: string; version?: string }>;
    defaultBranch: string;
    installedBranch?: string;
    installedCommit?: string;
    installedVersion?: string;
    updateAvailable: boolean;
    assetIds?: {
        icon?: string;
        banner?: string;
        screenshots?: string[];
        media?: Array<{ id: string; contentType: string }>;
    };
    readme?: string;
}

export interface MarketplaceAsset {
    body: Buffer;
    contentType: string;
}

export interface ModuleMarketplaceSettings {
    recommendedModulesUrl: string;
}

export const DEFAULT_RECOMMENDED_MODULES_URL =
    "https://cognis.study/static/recommended-modules.json";

interface ModuleInstallProvenance {
    sourceUuid: string;
    cloneUrl: string;
    branch: string;
    commit: string;
}

export class ModuleMarketplaceService {
    private readonly assets = new Map<string, MarketplaceAsset>();
    private catalogMutation: Promise<void> = Promise.resolve();

    constructor(
        private readonly statePath: string,
        private readonly installRoot: string,
    ) {}

    async getSettings(): Promise<ModuleMarketplaceSettings> {
        try {
            return JSON.parse(
                await readFile(`${this.statePath}.settings`, "utf8"),
            ) as ModuleMarketplaceSettings;
        } catch (error) {
            if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
            return { recommendedModulesUrl: DEFAULT_RECOMMENDED_MODULES_URL };
        }
    }

    async saveSettings(
        settings: ModuleMarketplaceSettings,
    ): Promise<ModuleMarketplaceSettings> {
        const url = new URL(settings.recommendedModulesUrl);
        if (url.protocol !== "https:")
            throw new Error("invalid_recommended_modules_url");
        const value = { recommendedModulesUrl: url.toString() };
        await mkdir(path.dirname(this.statePath), { recursive: true });
        await writeFile(
            `${this.statePath}.settings`,
            JSON.stringify(value, null, 2),
            { mode: 0o600 },
        );
        return value;
    }

    async listRecommendedModuleUuids(): Promise<string[]> {
        const { recommendedModulesUrl } = await this.getSettings();
        const response = await fetch(recommendedModulesUrl).catch(
            () => undefined,
        );
        if (!response?.ok) return [];
        const value = (await response.json()) as unknown;
        return Array.isArray(value)
            ? value.filter(
                  (uuid): uuid is string =>
                      typeof uuid === "string" &&
                      /^[0-9a-f]{8}-[0-9a-f-]{27}$/i.test(uuid),
              )
            : [];
    }

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
        await this.pruneCachedSources(
            new Set(sources.map((source) => source.uuid)),
        );
    }

    async discover(
        tokens: Record<string, string> = {},
        sourceUuids?: string[],
    ): Promise<MarketplaceModule[]> {
        const sources = await this.listSources();
        const selectedSources = sourceUuids
            ? sources.filter((source) => sourceUuids.includes(source.uuid))
            : sources;
        const configuredSourceUuids = new Set(
            sources.map((source) => source.uuid),
        );
        const results = await Promise.all(
            selectedSources.map(async (source) => {
                try {
                    const modules = await this.discoverSource(
                        source,
                        source.credentialId
                            ? tokens[source.credentialId]
                            : undefined,
                    );
                    await this.replaceCachedSource(
                        source.uuid,
                        modules,
                        configuredSourceUuids,
                    );
                    return modules;
                } catch {
                    return this.readCachedCatalog([source.uuid]);
                }
            }),
        );
        return results.flat();
    }

    async listCachedModules(): Promise<MarketplaceModule[]> {
        const configuredSourceUuids = new Set(
            (await this.listSources()).map((source) => source.uuid),
        );
        return (await this.readCachedCatalog()).filter((module) =>
            configuredSourceUuids.has(module.sourceUuid),
        );
    }

    async install(
        module: MarketplaceModule,
        token?: string,
        branch?: string,
    ): Promise<ModuleManifest> {
        const target = path.join(this.installRoot, module.uuid);
        const temporary = `${target}.installing`;
        await mkdir(this.installRoot, { recursive: true });
        await rm(temporary, { recursive: true, force: true });
        const cloneUrl = this.assertCloneUrl(module.cloneUrl);
        const selectedBranch = branch ?? module.defaultBranch;
        const installRefs = [
            ...(module.branches ?? []),
            ...(module.releases ?? []),
        ];
        if (!installRefs.some((entry) => entry.name === selectedBranch)) {
            throw new Error("invalid_module_branch");
        }
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
                [
                    "clone",
                    "--depth=1",
                    "--branch",
                    selectedBranch,
                    "--",
                    cloneUrl,
                    temporary,
                ],
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
            const { stdout: commit } = await execFileAsync(
                "git",
                ["-C", temporary, "rev-parse", "HEAD"],
                { env: gitEnvironment },
            );
            const provenance: ModuleInstallProvenance = {
                sourceUuid: module.sourceUuid,
                cloneUrl,
                branch: selectedBranch,
                commit: commit.trim(),
            };
            await writeFile(
                path.join(temporary, ".cognis-install.json"),
                JSON.stringify(provenance, null, 2),
                { mode: 0o600 },
            );
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
        await this.updateCachedInstallation(uuid, false);
    }

    getAsset(id: string): MarketplaceAsset | undefined {
        return this.assets.get(id);
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
        const repositories = await this.fetchPaginated(endpoint, headers);
        const candidates = await Promise.all(
            repositories.map(async (repository) => {
                const cloneUrl = String(
                    repository.clone_url ?? repository.http_url_to_repo ?? "",
                );
                try {
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
                    if (manifestResponse.status === 404)
                        return { cloneUrl, module: null, confirmed: true };
                    if (!manifestResponse.ok) {
                        throw new Error(
                            `module_manifest_discovery_failed:${manifestResponse.status}`,
                        );
                    }
                    let manifest: ModuleManifest;
                    try {
                        manifest = this.parseManifest(
                            await manifestResponse.text(),
                        );
                    } catch {
                        return { cloneUrl, module: null, confirmed: true };
                    }
                    if (manifest.class === "core") {
                        return { cloneUrl, module: null, confirmed: true };
                    }
                    const [discoveredBranches, discoveredReleases] =
                        await Promise.all([
                            this.discoverBranches(source, projectPath, headers),
                            this.discoverReleases(source, projectPath, headers),
                        ]);
                    const [branches, releases] = await Promise.all([
                        Promise.resolve(
                            discoveredBranches.map((branch) => ({
                                ...branch,
                                version:
                                    branch.name === defaultBranch
                                        ? manifest.version
                                        : undefined,
                            })),
                        ),
                        this.attachVersions(
                            source,
                            projectPath,
                            discoveredReleases,
                            headers,
                        ),
                    ]);
                    const readmeResponse = await fetch(
                        this.resolveRepositoryAssetUrl(
                            source,
                            projectPath,
                            defaultBranch,
                            "README.md",
                        ),
                        { headers },
                    );
                    const hasLicenseFile = await this.hasRootLicenseFile(
                        source,
                        projectPath,
                        defaultBranch,
                        headers,
                    );
                    const media = await this.discoverRepositoryMedia(
                        source,
                        projectPath,
                        defaultBranch,
                        headers,
                    );
                    const assetIds =
                        manifest.assets || media.length
                            ? {
                                  icon: manifest.assets.icon
                                      ? await this.cacheRepositoryAsset(
                                            source,
                                            projectPath,
                                            defaultBranch,
                                            manifest.assets.icon,
                                            headers,
                                        )
                                      : undefined,
                                  banner: manifest.assets.banner
                                      ? await this.cacheRepositoryAsset(
                                            source,
                                            projectPath,
                                            defaultBranch,
                                            manifest.assets.banner,
                                            headers,
                                        )
                                      : undefined,
                                  screenshots: (
                                      await Promise.all(
                                          (
                                              manifest.assets.screenshots ?? []
                                          ).map((assetPath) =>
                                              this.cacheRepositoryAsset(
                                                  source,
                                                  projectPath,
                                                  defaultBranch,
                                                  assetPath,
                                                  headers,
                                              ),
                                          ),
                                      )
                                  ).filter(
                                      (assetId): assetId is string =>
                                          typeof assetId === "string",
                                  ),
                                  media,
                              }
                            : undefined;
                    const provenance = await this.readInstallProvenance(
                        manifest.uuid,
                    );
                    const installedVersion = await this.readInstalledVersion(
                        manifest.uuid,
                    );
                    const defaultVersion = branches.find(
                        (branch) => branch.name === defaultBranch,
                    )?.version;
                    return {
                        cloneUrl,
                        confirmed: true,
                        module: {
                            ...manifest,
                            license: hasLicenseFile
                                ? manifest.license
                                : undefined,
                            assetIds,
                            cloneUrl,
                            sourceUuid: source.uuid,
                            installed: Boolean(provenance),
                            branches,
                            releases,
                            defaultBranch,
                            installedBranch: provenance?.branch,
                            installedCommit: provenance?.commit,
                            installedVersion,
                            updateAvailable: Boolean(
                                provenance &&
                                installedVersion &&
                                defaultVersion &&
                                installedVersion !== defaultVersion,
                            ),
                            readme: readmeResponse.ok
                                ? await readmeResponse.text()
                                : undefined,
                        } satisfies MarketplaceModule,
                    };
                } catch {
                    return { cloneUrl, module: null, confirmed: false };
                }
            }),
        );
        const cached = await this.readCachedCatalog([source.uuid]);
        const uncertainCloneUrls = new Set(
            candidates
                .filter((candidate) => !candidate.confirmed)
                .map((candidate) => candidate.cloneUrl),
        );
        return [
            ...candidates.flatMap((candidate) =>
                candidate.module ? [candidate.module] : [],
            ),
            ...cached.filter((module) =>
                uncertainCloneUrls.has(module.cloneUrl),
            ),
        ];
    }

    private async hasRootLicenseFile(
        source: ModuleSource,
        projectPath: string,
        defaultBranch: string,
        headers: Record<string, string>,
    ): Promise<boolean> {
        for (const filename of ["LICENSE", "LICENSE.md", "LICENSE.txt"]) {
            const response = await fetch(
                this.resolveRepositoryAssetUrl(
                    source,
                    projectPath,
                    defaultBranch,
                    filename,
                ),
                { headers },
            ).catch(() => undefined);
            if (response?.ok) return true;
        }
        return false;
    }

    private async readCachedCatalog(
        sourceUuids?: string[],
    ): Promise<MarketplaceModule[]> {
        try {
            const value = JSON.parse(
                await readFile(`${this.statePath}.catalog`, "utf8"),
            ) as MarketplaceModule[];
            if (!Array.isArray(value)) return [];
            return sourceUuids
                ? value.filter((module) =>
                      sourceUuids.includes(module.sourceUuid),
                  )
                : value;
        } catch (error) {
            if ((error as NodeJS.ErrnoException).code === "ENOENT") return [];
            throw error;
        }
    }

    private async replaceCachedSource(
        sourceUuid: string,
        modules: MarketplaceModule[],
        configuredSourceUuids: Set<string>,
    ): Promise<void> {
        const replace = async () => {
            const cached = await this.readCachedCatalog();
            const retained = cached.filter(
                (module) =>
                    module.sourceUuid !== sourceUuid &&
                    configuredSourceUuids.has(module.sourceUuid),
            );
            await mkdir(path.dirname(this.statePath), { recursive: true });
            await writeFile(
                `${this.statePath}.catalog`,
                JSON.stringify([...retained, ...modules], null, 2),
                { mode: 0o600 },
            );
        };
        this.catalogMutation = this.catalogMutation.then(replace, replace);
        await this.catalogMutation;
    }

    private async updateCachedInstallation(
        uuid: string,
        installed: boolean,
    ): Promise<void> {
        const update = async () => {
            const cached = await this.readCachedCatalog();
            const modules = cached.map((module) =>
                module.uuid === uuid
                    ? {
                          ...module,
                          installed,
                          installedBranch: undefined,
                          installedCommit: undefined,
                          updateAvailable: false,
                      }
                    : module,
            );
            await mkdir(path.dirname(this.statePath), { recursive: true });
            await writeFile(
                `${this.statePath}.catalog`,
                JSON.stringify(modules, null, 2),
                { mode: 0o600 },
            );
        };
        this.catalogMutation = this.catalogMutation.then(update, update);
        await this.catalogMutation;
    }

    private async pruneCachedSources(
        configuredSourceUuids: Set<string>,
    ): Promise<void> {
        const prune = async () => {
            const cached = await this.readCachedCatalog();
            const modules = cached.filter((module) =>
                configuredSourceUuids.has(module.sourceUuid),
            );
            await mkdir(path.dirname(this.statePath), { recursive: true });
            await writeFile(
                `${this.statePath}.catalog`,
                JSON.stringify(modules, null, 2),
                { mode: 0o600 },
            );
        };
        this.catalogMutation = this.catalogMutation.then(prune, prune);
        await this.catalogMutation;
    }

    private async cacheRepositoryAsset(
        source: ModuleSource,
        projectPath: string,
        defaultBranch: string,
        assetPath: string,
        headers: Record<string, string>,
    ): Promise<string | undefined> {
        const assetUrl = this.resolveRepositoryAssetUrl(
            source,
            projectPath,
            defaultBranch,
            assetPath,
        );
        const response = await fetch(assetUrl, { headers }).catch(
            () => undefined,
        );
        if (!response) return undefined;
        if (!response.ok) return undefined;
        const contentType = response.headers
            .get("content-type")
            ?.split(";", 1)[0]
            .trim();
        if (
            !contentType ||
            ![
                "image/svg+xml",
                "image/png",
                "image/jpeg",
                "image/webp",
                "image/gif",
                "video/mp4",
                "video/webm",
                "video/ogg",
            ].includes(contentType)
        ) {
            return undefined;
        }
        const body = Buffer.from(await response.arrayBuffer());
        const id = createHash("sha256").update(assetUrl).digest("hex");
        this.assets.set(id, { body, contentType });
        return id;
    }

    private async discoverRepositoryMedia(
        source: ModuleSource,
        projectPath: string,
        defaultBranch: string,
        headers: Record<string, string>,
    ): Promise<Array<{ id: string; contentType: string }>> {
        const endpoint =
            source.provider === "github"
                ? `${source.baseUrl}/repos/${projectPath}/contents/media?ref=${encodeURIComponent(defaultBranch)}`
                : `${source.baseUrl}/projects/${encodeURIComponent(projectPath)}/repository/tree?path=media&ref=${encodeURIComponent(defaultBranch)}&per_page=100`;
        const response = await fetch(endpoint, { headers }).catch(
            () => undefined,
        );
        if (!response?.ok) return [];
        const payload = await response.json();
        if (!Array.isArray(payload)) return [];
        const entries = payload as Array<Record<string, unknown>>;
        const cached = await Promise.all(
            entries
                .filter((entry) =>
                    source.provider === "github"
                        ? entry.type === "file"
                        : entry.type === "blob",
                )
                .map(async (entry) => {
                    const mediaPath = String(
                        entry.path ?? `media/${String(entry.name ?? "")}`,
                    );
                    const id = await this.cacheRepositoryAsset(
                        source,
                        projectPath,
                        defaultBranch,
                        mediaPath,
                        headers,
                    );
                    if (!id) return undefined;
                    return {
                        id,
                        contentType: this.assets.get(id)!.contentType,
                    };
                }),
        );
        return cached.filter(
            (entry): entry is { id: string; contentType: string } =>
                entry !== undefined,
        );
    }

    private async discoverBranches(
        source: ModuleSource,
        projectPath: string,
        headers: Record<string, string>,
    ): Promise<Array<{ name: string; commit: string }>> {
        const endpoint =
            source.provider === "github"
                ? `${source.baseUrl}/repos/${projectPath}/branches?per_page=100`
                : `${source.baseUrl}/projects/${encodeURIComponent(projectPath)}/repository/branches?per_page=100`;
        return (await this.fetchPaginated(endpoint, headers))
            .map((branch) => ({
                name: String(branch.name ?? ""),
                commit: String(
                    (branch.commit as Record<string, unknown> | undefined)
                        ?.sha ??
                        (branch.commit as Record<string, unknown> | undefined)
                            ?.id ??
                        "",
                ),
            }))
            .filter((branch) => branch.name && branch.commit);
    }

    private async attachVersions<T extends { name: string; commit: string }>(
        source: ModuleSource,
        projectPath: string,
        refs: T[],
        headers: Record<string, string>,
    ): Promise<Array<T & { version?: string }>> {
        return Promise.all(
            refs.map(async (ref) => {
                const response = await fetch(
                    this.resolveRepositoryAssetUrl(
                        source,
                        projectPath,
                        ref.name,
                        "manifest.json",
                    ),
                    { headers },
                ).catch(() => undefined);
                if (!response?.ok) return ref;
                try {
                    return {
                        ...ref,
                        version: this.parseManifest(await response.text())
                            .version,
                    };
                } catch {
                    return ref;
                }
            }),
        );
    }

    private async readInstalledVersion(
        moduleUuid: string,
    ): Promise<string | undefined> {
        try {
            const manifest = this.parseManifest(
                await readFile(
                    path.join(this.installRoot, moduleUuid, "manifest.json"),
                    "utf8",
                ),
            );
            return manifest.version;
        } catch {
            return undefined;
        }
    }

    private async discoverReleases(
        source: ModuleSource,
        projectPath: string,
        headers: Record<string, string>,
    ): Promise<Array<{ name: string; commit: string }>> {
        const endpoint =
            source.provider === "github"
                ? `${source.baseUrl}/repos/${projectPath}/tags?per_page=100`
                : `${source.baseUrl}/projects/${encodeURIComponent(projectPath)}/repository/tags?per_page=100`;
        return (await this.fetchPaginated(endpoint, headers))
            .map((tag) => ({
                name: String(tag.name ?? ""),
                commit: String(
                    (tag.commit as Record<string, unknown> | undefined)?.sha ??
                        (tag.commit as Record<string, unknown> | undefined)
                            ?.id ??
                        "",
                ),
            }))
            .filter((tag) => tag.name && tag.commit);
    }

    private async fetchPaginated(
        initialUrl: string,
        headers: Record<string, string>,
    ): Promise<Array<Record<string, unknown>>> {
        const results: Array<Record<string, unknown>> = [];
        let nextUrl = initialUrl;
        while (nextUrl) {
            const response = await fetch(nextUrl, { headers });
            if (!response.ok) {
                throw new Error(
                    `module_source_discovery_failed:${response.status}`,
                );
            }
            results.push(
                ...((await response.json()) as Array<Record<string, unknown>>),
            );
            const githubNext = response.headers
                .get("link")
                ?.split(",")
                .map((entry) => entry.trim())
                .find((entry) => entry.endsWith('rel="next"'))
                ?.match(/^<([^>]+)>/)?.[1];
            const gitlabNextPage = response.headers.get("x-next-page");
            if (githubNext) {
                nextUrl = githubNext;
            } else if (gitlabNextPage) {
                const pagedUrl = new URL(nextUrl);
                pagedUrl.searchParams.set("page", gitlabNextPage);
                nextUrl = pagedUrl.toString();
            } else {
                nextUrl = "";
            }
        }
        return results;
    }

    private async readInstallProvenance(
        uuid: string,
    ): Promise<ModuleInstallProvenance | null> {
        try {
            return JSON.parse(
                await readFile(
                    path.join(this.installRoot, uuid, ".cognis-install.json"),
                    "utf8",
                ),
            ) as ModuleInstallProvenance;
        } catch (error) {
            if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
            throw error;
        }
    }

    private parseManifest(raw: string): ModuleManifest {
        const manifest = JSON.parse(raw) as ModuleManifest;
        delete (manifest as ModuleManifest & { recommended?: unknown })
            .recommended;
        if (
            !manifest.uuid ||
            !/^[0-9a-f]{8}-[0-9a-f-]{27}$/i.test(manifest.uuid) ||
            !manifest.id ||
            !manifest.name ||
            !manifest.version ||
            !manifest.publisher ||
            !manifest.summary ||
            !manifest.description ||
            !manifest.repository ||
            !manifest.coreApiVersion ||
            !["core", "extension"].includes(manifest.class) ||
            !Array.isArray(manifest.capabilities) ||
            !Array.isArray(manifest.categories) ||
            manifest.categories.length === 0 ||
            !Array.isArray(manifest.tags) ||
            manifest.tags.length === 0 ||
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
