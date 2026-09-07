import { mkdir, readFile, writeFile } from "node:fs/promises";
import type { ModuleManifest } from "../../../contracts/module-manifest.js";
import type { MarketplaceModule, ModuleSource } from "./index.js";
import { MarketplaceRepository } from "./repository.js";

const MARKETPLACE_STRING_LOCALES = ["de", "en", "id", "ja"];

export class MarketplaceServiceBase extends MarketplaceRepository {
    protected catalogMutation: Promise<void> = Promise.resolve();

    protected applyCachedSelectedBranches(
        modules: MarketplaceModule[],
        cached: MarketplaceModule[],
    ): MarketplaceModule[] {
        const selectedBranches = new Map(
            cached.map((module) => [module.uuid, module.selectedBranch]),
        );
        return modules.map((module) => ({
            ...module,
            ...(selectedBranches.get(module.uuid)
                ? { selectedBranch: selectedBranches.get(module.uuid) }
                : {}),
        }));
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
        const repositories = (
            await this.listSourceRepositories(source, headers)
        ).filter(
            (repository) =>
                source.scanPrivateRepos === true ||
                (repository.private !== true &&
                    repository.visibility !== "private" &&
                    repository.visibility !== "internal"),
        );
        const candidates = await Promise.all(
            repositories.map(async (repository) => {
                const privateRepository =
                    repository.private === true ||
                    repository.visibility === "private" ||
                    repository.visibility === "internal";
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
                    } catch (error) {
                        this.log(
                            "warn",
                            "Repository manifest was excluded from marketplace discovery.",
                            {
                                sourceUuid: source.uuid,
                                sourceName: source.name,
                                repository: projectPath,
                                privateRepository,
                                error: "invalid_module_manifest",
                                detail:
                                    error instanceof Error
                                        ? error.message
                                        : String(error),
                            },
                        );
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
                        manifest.assets ||
                        media.length ||
                        manifest.ui?.stringsBaseUrl
                            ? {
                                  icon: manifest.assets?.icon
                                      ? await this.cacheRepositoryImageAsset(
                                            source,
                                            projectPath,
                                            catalogRef,
                                            manifest.assets?.icon,
                                            headers,
                                        )
                                      : undefined,
                                  banner: manifest.assets?.banner
                                      ? await this.cacheRepositoryImageAsset(
                                            source,
                                            projectPath,
                                            catalogRef,
                                            manifest.assets?.banner,
                                            headers,
                                        )
                                      : undefined,
                                  screenshots: (
                                      await Promise.all(
                                          (
                                              manifest.assets?.screenshots ?? []
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
                                  strings: manifest.ui?.stringsBaseUrl
                                      ? Object.fromEntries(
                                            (
                                                await Promise.all(
                                                    MARKETPLACE_STRING_LOCALES.map(
                                                        async (locale) => {
                                                            const id =
                                                                await this.cacheRepositoryStringAsset(
                                                                    source,
                                                                    projectPath,
                                                                    catalogRef,
                                                                    `ui/languages/${locale}/strings.xml`,
                                                                    headers,
                                                                );
                                                            return [
                                                                locale,
                                                                id,
                                                            ] as const;
                                                        },
                                                    ),
                                                )
                                            ).filter((entry) => entry[1]),
                                        )
                                      : undefined,
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
                } catch (error) {
                    if (
                        source.scanPrivateRepos === true &&
                        privateRepository &&
                        error instanceof Error &&
                        /module_manifest_discovery_failed:(401|403)/.test(
                            error.message,
                        )
                    ) {
                        throw new Error(
                            "private_repository_contents_access_failed",
                        );
                    }
                    this.log(
                        "warn",
                        "Module repository was excluded from marketplace discovery.",
                        {
                            sourceUuid: source.uuid,
                            sourceName: source.name,
                            repository: String(
                                repository.full_name ??
                                    repository.path_with_namespace ??
                                    cloneUrl,
                            ),
                            privateRepository,
                            error:
                                error instanceof Error
                                    ? error.message
                                    : String(error),
                        },
                    );
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

    private async listSourceRepositories(
        source: ModuleSource,
        headers: Record<string, string>,
    ): Promise<Array<Record<string, unknown>>> {
        const namespace = encodeURIComponent(source.namespace);
        const sourceEndpoint =
            source.provider === "github"
                ? `${source.baseUrl}/orgs/${namespace}/repos?per_page=100&type=all`
                : `${source.baseUrl}/groups/${namespace}/projects?per_page=100&include_subgroups=true`;
        const repositories = await this.fetchPaginated(sourceEndpoint, headers);
        if (source.provider !== "github" || source.scanPrivateRepos !== true) {
            return repositories;
        }

        const accessiblePrivateRepositories = await this.fetchPaginated(
            `${source.baseUrl}/user/repos?per_page=100&visibility=private`,
            headers,
        );
        const normalizedNamespace = source.namespace.toLowerCase();
        const matchingPrivateRepositories =
            accessiblePrivateRepositories.filter((repository) => {
                const owner = repository.owner as
                    Record<string, unknown> | undefined;
                const ownerLogin = String(owner?.login ?? "").toLowerCase();
                const fullNameOwner = String(repository.full_name ?? "")
                    .split("/", 1)[0]
                    .toLowerCase();
                return (
                    ownerLogin === normalizedNamespace ||
                    fullNameOwner === normalizedNamespace
                );
            });
        const repositoriesByIdentity = new Map(
            repositories.map((repository) => [
                String(repository.id ?? repository.full_name ?? ""),
                repository,
            ]),
        );
        for (const repository of matchingPrivateRepositories) {
            repositoriesByIdentity.set(
                String(repository.id ?? repository.full_name ?? ""),
                repository,
            );
        }
        return [...repositoriesByIdentity.values()];
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
                JSON.stringify(
                    [
                        ...retained,
                        ...this.applyCachedSelectedBranches(modules, cached),
                    ],
                    null,
                    2,
                ),
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

    protected async updateCachedSelectedBranch(
        uuid: string,
        branch: string,
    ): Promise<void> {
        const update = async () => {
            const cached = await this.readCachedCatalog();
            const modules = cached.map((module) => {
                if (module.uuid !== uuid) return module;
                const available = [
                    ...(module.branches ?? []),
                    ...(module.releases ?? []),
                ].some((entry) => entry.name === branch);
                if (!available) throw new Error("invalid_module_branch");
                return { ...module, selectedBranch: branch };
            });
            if (!modules.some((module) => module.uuid === uuid)) {
                throw new Error("module_not_found");
            }
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
                          selectedBranch: branch,
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
}
