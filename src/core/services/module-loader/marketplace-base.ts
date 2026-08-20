import { createHash } from "node:crypto";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import type { ModuleManifest } from "../../contracts/module-manifest.js";
import type {
    MarketplaceAsset,
    MarketplaceModule,
    ModuleMarketplaceLog,
    ModuleSource,
} from "./marketplace-service.js";

interface ModuleInstallProvenance {
    sourceUuid: string;
    cloneUrl: string;
    branch: string;
    commit: string;
}

export class MarketplaceServiceBase {
    protected readonly assets = new Map<string, MarketplaceAsset>();
    protected catalogMutation: Promise<void> = Promise.resolve();

    constructor(
        protected readonly statePath: string,
        protected readonly installRoot: string,
        protected readonly log: ModuleMarketplaceLog = () => undefined,
    ) {}

    protected get cacheRoot(): string {
        return path.join(this.installRoot, ".cache");
    }
    protected get catalogPath(): string {
        return path.join(this.cacheRoot, "catalog.json");
    }
    protected get scanAttemptsPath(): string {
        return path.join(this.cacheRoot, "scan-attempts.json");
    }
    protected get assetCacheRoot(): string {
        return path.join(this.cacheRoot, "assets");
    }
    protected get credentialBindingsPath(): string {
        return path.join(this.cacheRoot, "credential-bindings.json");
    }

    protected async discoverSource(
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
                            ? this.resolveGithubManifestUrl(
                                  source,
                                  projectPath,
                                  defaultBranch,
                              )
                            : `${source.baseUrl}/projects/${encodeURIComponent(projectPath)}/repository/files/manifest.json/raw?ref=${encodeURIComponent(defaultBranch)}`;
                    // default-manifest block: establishes the immutable UUID used for provenance lookup.
                    const manifestResponse = await fetch(rawUrl, { headers });
                    if (manifestResponse.status === 404)
                        return { cloneUrl, module: null };
                    if (!manifestResponse.ok) {
                        throw new Error(
                            `module_manifest_discovery_failed:${manifestResponse.status}`,
                        );
                    }
                    let manifest: ModuleManifest;
                    try {
                        const manifestText = await this.readRepositoryFile(
                            source,
                            manifestResponse,
                        );
                        manifest = this.parseManifest(manifestText);
                    } catch {
                        return { cloneUrl, module: null };
                    }
                    if (manifest.class === "core") {
                        return { cloneUrl, module: null };
                    }
                    const provenance = await this.readInstallProvenance(
                        manifest.uuid,
                    );
                    let catalogRef = provenance?.branch || defaultBranch;
                    if (catalogRef !== defaultBranch) {
                        const channelManifestResponse = await fetch(
                            source.provider === "github"
                                ? this.resolveGithubManifestUrl(
                                      source,
                                      projectPath,
                                      catalogRef,
                                  )
                                : `${source.baseUrl}/projects/${encodeURIComponent(projectPath)}/repository/files/manifest.json/raw?ref=${encodeURIComponent(catalogRef)}`,
                            { headers },
                        );
                        if (channelManifestResponse.ok) {
                            try {
                                const channelManifest = this.parseManifest(
                                    await this.readRepositoryFile(
                                        source,
                                        channelManifestResponse,
                                    ),
                                );
                                if (channelManifest.uuid === manifest.uuid) {
                                    manifest = channelManifest;
                                } else {
                                    catalogRef = defaultBranch;
                                }
                            } catch {
                                // Fall back to the default-manifest block above.
                                catalogRef = defaultBranch;
                            }
                        } else {
                            catalogRef = defaultBranch;
                        }
                    }
                    const [discoveredBranches, discoveredReleases] =
                        await Promise.all([
                            this.discoverBranches(source, projectPath, headers),
                            this.discoverReleases(source, projectPath, headers),
                        ]);
                    const [branches, releases] = await Promise.all([
                        this.attachVersions(
                            source,
                            projectPath,
                            discoveredBranches,
                            headers,
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
                            catalogRef,
                            "README.md",
                        ),
                        { headers },
                    );
                    const hasLicenseFile = await this.hasRootLicenseFile(
                        source,
                        projectPath,
                        catalogRef,
                        headers,
                    );
                    const media = await this.discoverRepositoryMedia(
                        source,
                        projectPath,
                        catalogRef,
                        headers,
                    );
                    const assetIds =
                        manifest.assets || media.length
                            ? {
                                  icon: manifest.assets.icon
                                      ? await this.cacheRepositoryImageAsset(
                                            source,
                                            projectPath,
                                            catalogRef,
                                            manifest.assets.icon,
                                            headers,
                                        )
                                      : undefined,
                                  banner: manifest.assets.banner
                                      ? await this.cacheRepositoryImageAsset(
                                            source,
                                            projectPath,
                                            catalogRef,
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
                                                  catalogRef,
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
                    const installedVersion = await this.readInstalledVersion(
                        manifest.uuid,
                    );
                    const channelVersion = [...branches, ...releases].find(
                        (channel) => channel.name === catalogRef,
                    )?.version;
                    return {
                        cloneUrl,
                        module: {
                            ...manifest,
                            version: channelVersion ?? manifest.version,
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
                                channelVersion &&
                                installedVersion !== channelVersion,
                            ),
                            readme: readmeResponse.ok
                                ? await this.readRepositoryFile(
                                      source,
                                      readmeResponse,
                                  )
                                : undefined,
                        } satisfies MarketplaceModule,
                    };
                } catch {
                    return { cloneUrl, module: null };
                }
            }),
        );
        const cached = await this.readCachedCatalog([source.uuid]);
        const fresh = candidates.flatMap((candidate) =>
            candidate.module ? [candidate.module] : [],
        );
        const inconclusiveCloneUrls = new Set(
            candidates
                .filter((candidate) => !candidate.module)
                .map((candidate) => candidate.cloneUrl),
        );
        const retained = cached.filter((module) =>
            inconclusiveCloneUrls.has(module.cloneUrl),
        );
        return [...fresh, ...retained];
    }

    protected async hasRootLicenseFile(
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

    protected async readCachedCatalog(
        sourceUuids?: string[],
    ): Promise<MarketplaceModule[]> {
        try {
            const value = JSON.parse(
                await readFile(this.catalogPath, "utf8"),
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

    protected async readScanAttempts(): Promise<Record<string, string>> {
        try {
            const value = JSON.parse(
                await readFile(this.scanAttemptsPath, "utf8"),
            ) as unknown;
            return value && typeof value === "object" && !Array.isArray(value)
                ? (value as Record<string, string>)
                : {};
        } catch (error) {
            if ((error as NodeJS.ErrnoException).code === "ENOENT") return {};
            throw error;
        }
    }

    protected async readCredentialBindings(): Promise<Record<string, string>> {
        try {
            const value = JSON.parse(
                await readFile(this.credentialBindingsPath, "utf8"),
            ) as unknown;
            return value && typeof value === "object" && !Array.isArray(value)
                ? (value as Record<string, string>)
                : {};
        } catch (error) {
            if ((error as NodeJS.ErrnoException).code === "ENOENT") return {};
            throw error;
        }
    }

    protected async saveCredentialBinding(
        sourceUuid: string,
        credentialId?: string,
    ): Promise<void> {
        const update = async () => {
            const bindings = await this.readCredentialBindings();
            if (credentialId) bindings[sourceUuid] = credentialId;
            else delete bindings[sourceUuid];
            await mkdir(this.cacheRoot, { recursive: true });
            await writeFile(
                this.credentialBindingsPath,
                JSON.stringify(bindings, null, 2),
                { mode: 0o600 },
            );
        };
        this.catalogMutation = this.catalogMutation.then(update, update);
        await this.catalogMutation;
    }

    protected async recordScanAttempt(sourceUuid: string): Promise<void> {
        const update = async () => {
            const attempts = await this.readScanAttempts();
            attempts[sourceUuid] = new Date().toISOString();
            await mkdir(this.cacheRoot, { recursive: true });
            await writeFile(
                this.scanAttemptsPath,
                JSON.stringify(attempts, null, 2),
                { mode: 0o600 },
            );
        };
        this.catalogMutation = this.catalogMutation.then(update, update);
        await this.catalogMutation;
    }

    protected async clearScanAttempt(sourceUuid: string): Promise<void> {
        const update = async () => {
            const attempts = await this.readScanAttempts();
            if (!(sourceUuid in attempts)) return;
            delete attempts[sourceUuid];
            await mkdir(this.cacheRoot, { recursive: true });
            await writeFile(
                this.scanAttemptsPath,
                JSON.stringify(attempts, null, 2),
                { mode: 0o600 },
            );
        };
        this.catalogMutation = this.catalogMutation.then(update, update);
        await this.catalogMutation;
    }

    protected async replaceCachedSource(
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
            await mkdir(this.cacheRoot, { recursive: true });
            await writeFile(
                this.catalogPath,
                JSON.stringify([...retained, ...modules], null, 2),
                { mode: 0o600 },
            );
        };
        this.catalogMutation = this.catalogMutation.then(replace, replace);
        await this.catalogMutation;
    }

    protected async updateCachedInstallation(
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
            await mkdir(this.cacheRoot, { recursive: true });
            await writeFile(
                this.catalogPath,
                JSON.stringify(modules, null, 2),
                { mode: 0o600 },
            );
        };
        this.catalogMutation = this.catalogMutation.then(update, update);
        await this.catalogMutation;
    }

    protected async updateCachedInstallState(
        uuid: string,
        branch: string,
        commit: string,
        version: string,
    ): Promise<void> {
        const update = async () => {
            const cached = await this.readCachedCatalog();
            const modules = cached.map((module) =>
                module.uuid === uuid
                    ? {
                          ...module,
                          installed: true,
                          installedBranch: branch,
                          installedCommit: commit,
                          installedVersion: version,
                          version,
                          updateAvailable: false,
                      }
                    : module,
            );
            await mkdir(this.cacheRoot, { recursive: true });
            await writeFile(
                this.catalogPath,
                JSON.stringify(modules, null, 2),
                {
                    mode: 0o600,
                },
            );
        };
        this.catalogMutation = this.catalogMutation.then(update, update);
        await this.catalogMutation;
    }

    protected async pruneCachedSources(
        configuredSourceUuids: Set<string>,
    ): Promise<void> {
        const prune = async () => {
            const cached = await this.readCachedCatalog();
            const modules = cached.filter((module) =>
                configuredSourceUuids.has(module.sourceUuid),
            );
            await mkdir(this.cacheRoot, { recursive: true });
            await writeFile(
                this.catalogPath,
                JSON.stringify(modules, null, 2),
                { mode: 0o600 },
            );
        };
        this.catalogMutation = this.catalogMutation.then(prune, prune);
        await this.catalogMutation;
    }

    protected async cacheRepositoryAsset(
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
        const githubPayload =
            source.provider === "github"
                ? ((await response.json()) as { content?: unknown })
                : undefined;
        const contentType = githubPayload
            ? this.repositoryAssetContentType(assetPath)
            : response.headers.get("content-type")?.split(";", 1)[0].trim();
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
        const body = githubPayload
            ? Buffer.from(
                  String(githubPayload.content ?? "").replace(/\s/g, ""),
                  "base64",
              )
            : Buffer.from(await response.arrayBuffer());
        const id = createHash("sha256").update(body).digest("hex");
        this.assets.set(id, { body, contentType });
        const assetRoot = this.assetCacheRoot;
        await mkdir(assetRoot, { recursive: true });
        await Promise.all([
            writeFile(path.join(assetRoot, id), body, { mode: 0o600 }),
            writeFile(
                path.join(assetRoot, `${id}.json`),
                JSON.stringify({ contentType }),
                { mode: 0o600 },
            ),
        ]);
        return id;
    }

    protected async cacheRepositoryImageAsset(
        source: ModuleSource,
        projectPath: string,
        defaultBranch: string,
        assetPath: string,
        headers: Record<string, string>,
    ): Promise<string | undefined> {
        const declared = await this.cacheRepositoryAsset(
            source,
            projectPath,
            defaultBranch,
            assetPath,
            headers,
        );
        if (declared) return declared;
        const extension = path.posix.extname(assetPath);
        const basename = extension
            ? assetPath.slice(0, -extension.length)
            : assetPath;
        for (const fallbackExtension of [
            ".png",
            ".webp",
            ".jpg",
            ".jpeg",
            ".svg",
        ]) {
            if (fallbackExtension === extension.toLowerCase()) continue;
            const fallbackPath = `${basename}${fallbackExtension}`;
            const fallback = await this.cacheRepositoryAsset(
                source,
                projectPath,
                defaultBranch,
                fallbackPath,
                headers,
            );
            if (fallback) {
                this.log("warn", "Module image asset used a fallback path.", {
                    sourceUuid: source.uuid,
                    projectPath,
                    declaredPath: assetPath,
                    resolvedPath: fallbackPath,
                });
                return fallback;
            }
        }
        return undefined;
    }

    protected async discoverRepositoryMedia(
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

    protected async discoverBranches(
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

    protected async attachVersions<T extends { name: string; commit: string }>(
        source: ModuleSource,
        projectPath: string,
        refs: T[],
        headers: Record<string, string>,
    ): Promise<Array<T & { version?: string }>> {
        return Promise.all(
            refs.map(async (ref) => {
                const response = await fetch(
                    source.provider === "github"
                        ? this.resolveGithubManifestUrl(
                              source,
                              projectPath,
                              ref.commit,
                          )
                        : this.resolveRepositoryAssetUrl(
                              source,
                              projectPath,
                              ref.commit,
                              "manifest.json",
                          ),
                    { headers },
                ).catch(() => undefined);
                if (!response?.ok) return ref;
                try {
                    return {
                        ...ref,
                        version: this.parseManifest(
                            await this.readRepositoryFile(source, response),
                        ).version,
                    };
                } catch {
                    return ref;
                }
            }),
        );
    }

    protected async readInstalledVersion(
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

    protected async discoverReleases(
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

    protected async fetchPaginated(
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

    protected async readInstallProvenance(
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

    protected parseManifest(raw: string): ModuleManifest {
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
            !manifest.assets?.banner ||
            (manifest.template !== undefined &&
                typeof manifest.template !== "boolean")
        ) {
            throw new Error("invalid_module_manifest");
        }
        return manifest;
    }

    protected resolveRepositoryAssetUrl(
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
            return `${source.baseUrl}/repos/${projectPath}/contents/${normalizedPath
                .split("/")
                .map(encodeURIComponent)
                .join("/")}?ref=${encodeURIComponent(defaultBranch)}`;
        }
        return `${source.baseUrl}/projects/${encodeURIComponent(projectPath)}/repository/files/${encodeURIComponent(normalizedPath)}/raw?ref=${encodeURIComponent(defaultBranch)}`;
    }

    protected async readRepositoryFile(
        source: ModuleSource,
        response: Response,
    ): Promise<string> {
        if (source.provider !== "github") return response.text();
        const payload = (await response.json()) as { content?: unknown };
        return Buffer.from(
            String(payload.content ?? "").replace(/\s/g, ""),
            "base64",
        ).toString("utf8");
    }

    protected repositoryAssetContentType(assetPath: string): string {
        const extension = path.extname(assetPath).toLowerCase();
        return (
            {
                ".svg": "image/svg+xml",
                ".png": "image/png",
                ".jpg": "image/jpeg",
                ".jpeg": "image/jpeg",
                ".webp": "image/webp",
                ".gif": "image/gif",
                ".mp4": "video/mp4",
                ".webm": "video/webm",
                ".ogg": "video/ogg",
            }[extension] ?? "application/octet-stream"
        );
    }

    protected resolveGithubManifestUrl(
        source: ModuleSource,
        projectPath: string,
        reference: string,
    ): string {
        return `${source.baseUrl}/repos/${projectPath}/contents/manifest.json?ref=${encodeURIComponent(reference)}`;
    }

    protected assertSource(source: ModuleSource): void {
        if (!/^[0-9a-f]{8}-[0-9a-f-]{27}$/i.test(source.uuid))
            throw new Error("invalid_source_uuid");
        const url = new URL(source.baseUrl);
        if (url.protocol !== "https:" || !source.namespace.trim())
            throw new Error("invalid_module_source");
    }

    protected assertCloneUrl(cloneUrl: string): string {
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
