import { execFile } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";
import type { ModuleManifest } from "../contracts/module-manifest.js";
import { validateModuleRepository } from "./module-repository-validator.js";
import { commandFailureText } from "./reuse/command-failure-text.js";

const execFileAsync = promisify(execFile);
const GIT_CLONE_ATTEMPTS = 3;
const GIT_CLONE_TIMEOUT_MS = 30_000;
const GIT_CLONE_RETRY_DELAYS_MS = [250, 1_000];
const TRANSIENT_GIT_FAILURE =
    /connection reset|recv failure|could not resolve host|failed to connect|connection timed out|operation timed out|tls connection|gnutls|http\/2 stream|remote end hung up|unexpected disconnect/i;
const SOURCE_SCAN_INTERVAL_MS = 60 * 60 * 1000;
const GITHUB_PAT_PERMISSION_DOCS =
    "https://docs.github.com/rest/authentication/permissions-required-for-fine-grained-personal-access-tokens";
const GITHUB_SSO_DOCS =
    "https://docs.github.com/authentication/authenticating-with-single-sign-on/authorizing-a-personal-access-token-for-use-with-single-sign-on";

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

export interface ModuleCredentialValidation {
    valid: boolean;
    warnings: string[];
    scopes: string[];
}

export type ModuleMarketplaceLog = (
    level: "info" | "warn",
    message: string,
    meta: Record<string, unknown>,
) => void;

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
        private readonly log: ModuleMarketplaceLog = () => undefined,
    ) {}

    private get cacheRoot(): string {
        return path.join(this.installRoot, ".cache");
    }

    private get catalogPath(): string {
        return path.join(this.cacheRoot, "catalog.json");
    }

    private get scanAttemptsPath(): string {
        return path.join(this.cacheRoot, "scan-attempts.json");
    }

    private get assetCacheRoot(): string {
        return path.join(this.cacheRoot, "assets");
    }

    private get credentialBindingsPath(): string {
        return path.join(this.cacheRoot, "credential-bindings.json");
    }

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
            const credentialBindings = await this.readCredentialBindings();
            return [
                {
                    ...DEFAULT_TRUSTED_MODULE_SOURCE,
                    credentialId:
                        trustedOverride?.credentialId ??
                        credentialBindings[DEFAULT_TRUSTED_MODULE_SOURCE.uuid],
                },
                ...stored.filter(
                    (source) =>
                        source.uuid !== DEFAULT_TRUSTED_MODULE_SOURCE.uuid,
                ),
            ];
        } catch (error) {
            if ((error as NodeJS.ErrnoException).code === "ENOENT") {
                const credentialBindings = await this.readCredentialBindings();
                return [
                    {
                        ...DEFAULT_TRUSTED_MODULE_SOURCE,
                        credentialId:
                            credentialBindings[
                                DEFAULT_TRUSTED_MODULE_SOURCE.uuid
                            ],
                    },
                ];
            }
            throw error;
        }
    }

    async saveSource(source: ModuleSource): Promise<ModuleSource> {
        if (source.uuid === DEFAULT_TRUSTED_MODULE_SOURCE.uuid) {
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
        await this.saveCredentialBinding(source.uuid, source.credentialId);
        await this.clearScanAttempt(source.uuid);
        return source;
    }

    async validateSourceCredential(
        source: ModuleSource,
        token: string,
    ): Promise<ModuleCredentialValidation> {
        this.assertSource(source);
        const normalizedToken = token.trim();
        if (!normalizedToken) {
            return { valid: false, warnings: ["credential_empty"], scopes: [] };
        }
        const headers: Record<string, string> = {
            accept: "application/json",
            "user-agent": "cognis-module-marketplace",
        };
        if (source.provider === "github") {
            headers.authorization = `Bearer ${normalizedToken}`;
        } else {
            headers["private-token"] = normalizedToken;
        }
        const endpoint =
            source.provider === "github"
                ? `${source.baseUrl}/orgs/${encodeURIComponent(source.namespace)}/repos?per_page=1&type=all`
                : `${source.baseUrl}/groups/${encodeURIComponent(source.namespace)}/projects?per_page=1&include_subgroups=true`;
        const response = await fetch(endpoint, { headers }).catch(
            () => undefined,
        );
        if (!response) {
            return {
                valid: false,
                warnings: ["credential_check_unavailable"],
                scopes: [],
            };
        }
        const scopes = (response.headers.get("x-oauth-scopes") ?? "")
            .split(",")
            .map((scope) => scope.trim())
            .filter(Boolean);
        const warnings: string[] = [];
        if (response.status === 401) warnings.push("credential_invalid");
        if (response.status === 403) warnings.push("source_access_denied");
        if (
            source.provider === "github" &&
            scopes.length > 0 &&
            !scopes.includes("repo")
        ) {
            warnings.push("github_repo_scope_missing");
        }
        if (!response.ok && warnings.length === 0) {
            warnings.push("source_access_failed");
        }
        if (source.provider === "github" && response.ok) {
            const repositories = (await response.json()) as Array<{
                full_name?: unknown;
            }>;
            const repository = String(repositories[0]?.full_name ?? "");
            if (repository) {
                const contentsResponse = await fetch(
                    `${source.baseUrl}/repos/${repository}/contents/manifest.json`,
                    { headers },
                ).catch(() => undefined);
                if (contentsResponse?.status === 403) {
                    warnings.push("github_contents_read_missing");
                }
            }
        }
        if (warnings.length > 0) {
            this.log("warn", "Module source credential validation failed.", {
                sourceUuid: source.uuid,
                sourceName: source.name,
                provider: source.provider,
                namespace: source.namespace,
                issues: warnings,
                grantedClassicScopes: scopes,
                requiredPermissions:
                    source.provider === "github"
                        ? {
                              fineGrained:
                                  "Repository access to every module repository; Metadata: read; Contents: read",
                              classic: "repo scope for private repositories",
                              organization:
                                  "Authorize the token for organization SSO when SAML SSO is enforced",
                          }
                        : {
                              token: "read_api and read_repository",
                          },
                references:
                    source.provider === "github"
                        ? [GITHUB_PAT_PERMISSION_DOCS, GITHUB_SSO_DOCS]
                        : [
                              "https://docs.gitlab.com/user/profile/personal_access_tokens/#personal-access-token-scopes",
                          ],
            });
        }
        return {
            valid: response.ok && warnings.length === 0,
            warnings,
            scopes,
        };
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
        await this.saveCredentialBinding(uuid, undefined);
        await this.pruneCachedSources(
            new Set(sources.map((source) => source.uuid)),
        );
    }

    async discover(
        tokens: Record<string, string> = {},
        sourceUuids?: string[],
        forceRefresh = false,
    ): Promise<MarketplaceModule[]> {
        const sources = await this.listSources();
        const selectedSources = (
            sourceUuids
                ? sources.filter((source) => sourceUuids.includes(source.uuid))
                : sources
        ).sort(
            (left, right) =>
                Number(Boolean(right.trusted)) - Number(Boolean(left.trusted)),
        );
        const configuredSourceUuids = new Set(
            sources.map((source) => source.uuid),
        );
        const discovered: MarketplaceModule[] = [];
        const claimedUuids = new Map<
            string,
            { module: MarketplaceModule; cached: boolean }
        >();
        for (const source of selectedSources) {
            const cachedModules = await this.readCachedCatalog([source.uuid]);
            const lastAttemptAt = (await this.readScanAttempts())[source.uuid];
            let modules: MarketplaceModule[];
            if (
                !forceRefresh &&
                lastAttemptAt &&
                Date.now() - Date.parse(lastAttemptAt) < SOURCE_SCAN_INTERVAL_MS
            ) {
                this.log("info", "Module source scan served from cache.", {
                    sourceUuid: source.uuid,
                    sourceName: source.name,
                    modulesFound: cachedModules.length,
                    nextScanAt: new Date(
                        Date.parse(lastAttemptAt) + SOURCE_SCAN_INTERVAL_MS,
                    ).toISOString(),
                });
                modules = cachedModules;
            } else {
                await this.recordScanAttempt(source.uuid);
                this.log("info", "Module source scan started.", {
                    sourceUuid: source.uuid,
                    sourceName: source.name,
                });
                try {
                    modules = await this.discoverSource(
                        source,
                        source.credentialId
                            ? tokens[source.credentialId]
                            : undefined,
                    );
                } catch (error) {
                    modules = cachedModules;
                    this.log(
                        "warn",
                        "Module source scan failed; cached results retained.",
                        {
                            sourceUuid: source.uuid,
                            sourceName: source.name,
                            modulesRetained: modules.length,
                            error:
                                error instanceof Error
                                    ? error.message
                                    : String(error),
                        },
                    );
                }
            }
            const accepted = modules.filter((module) => {
                const claim = claimedUuids.get(module.uuid);
                const claimed = claim?.module;
                if (!claimed) {
                    claimedUuids.set(module.uuid, { module, cached: false });
                    return true;
                }
                if (claim.cached && claimed.cloneUrl === module.cloneUrl) {
                    claimedUuids.set(module.uuid, { module, cached: false });
                    return true;
                }
                this.log("warn", "Duplicate module UUID rejected.", {
                    moduleUuid: module.uuid,
                    acceptedCloneUrl: claimed.cloneUrl,
                    rejectedCloneUrl: module.cloneUrl,
                    rejectedSourceUuid: source.uuid,
                });
                return false;
            });
            await this.replaceCachedSource(
                source.uuid,
                accepted,
                configuredSourceUuids,
            );
            this.log("info", "Module source scan completed.", {
                sourceUuid: source.uuid,
                sourceName: source.name,
                modulesFound: accepted.length,
            });
            discovered.push(...accepted);
        }
        return discovered;
    }

    async listCachedModules(): Promise<MarketplaceModule[]> {
        const sources = await this.listSources();
        const configuredSourceUuids = new Set(
            sources.map((source) => source.uuid),
        );
        const priority = new Map(
            sources.map((source) => [source.uuid, source.trusted ? 0 : 1]),
        );
        const claimed = new Set<string>();
        return (await this.readCachedCatalog())
            .filter((module) => configuredSourceUuids.has(module.sourceUuid))
            .sort(
                (left, right) =>
                    (priority.get(left.sourceUuid) ?? 1) -
                    (priority.get(right.sourceUuid) ?? 1),
            )
            .filter((module) => {
                if (claimed.has(module.uuid)) return false;
                claimed.add(module.uuid);
                return true;
            });
    }

    async install(
        module: MarketplaceModule,
        token?: string,
        branch?: string,
        validateDependencies?: (manifest: ModuleManifest) => Promise<void>,
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
        const selectedRef = installRefs.find(
            (entry) => entry.name === selectedBranch,
        );
        if (!selectedRef) {
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
            await this.cloneRepository(
                cloneUrl,
                selectedBranch,
                selectedRef.commit,
                temporary,
                gitEnvironment,
            );
            const manifest = this.parseManifest(
                await readFile(path.join(temporary, "manifest.json"), "utf8"),
            );
            if (manifest.uuid !== module.uuid)
                throw new Error("module_uuid_mismatch");
            await validateModuleRepository(temporary, manifest);
            await validateDependencies?.(manifest);
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
            await this.updateCachedInstallState(
                module.uuid,
                selectedBranch,
                provenance.commit,
                manifest.version,
            );
            return manifest;
        } catch (error) {
            await rm(temporary, { recursive: true, force: true });
            throw error;
        }
    }

    private async cloneRepository(
        cloneUrl: string,
        branch: string,
        expectedCommit: string,
        temporary: string,
        environment: NodeJS.ProcessEnv,
    ): Promise<void> {
        if (!/^[a-f0-9]{7,64}$/i.test(expectedCommit)) {
            throw new Error("invalid_module_commit");
        }
        let lastError: unknown;
        for (let attempt = 1; attempt <= GIT_CLONE_ATTEMPTS; attempt += 1) {
            await rm(temporary, { recursive: true, force: true });
            try {
                await execFileAsync(
                    "git",
                    [
                        "-c",
                        "http.version=HTTP/1.1",
                        "clone",
                        "--depth=1",
                        "--branch",
                        branch,
                        "--",
                        cloneUrl,
                        temporary,
                    ],
                    { env: environment, timeout: GIT_CLONE_TIMEOUT_MS },
                );
                const { stdout: clonedCommit } = await execFileAsync(
                    "git",
                    ["-C", temporary, "rev-parse", "HEAD"],
                    { env: environment },
                );
                if (clonedCommit.trim() !== expectedCommit) {
                    await execFileAsync(
                        "git",
                        [
                            "-C",
                            temporary,
                            "fetch",
                            "--depth=1",
                            "origin",
                            expectedCommit,
                        ],
                        { env: environment, timeout: GIT_CLONE_TIMEOUT_MS },
                    );
                    await execFileAsync(
                        "git",
                        [
                            "-C",
                            temporary,
                            "checkout",
                            "--detach",
                            expectedCommit,
                        ],
                        { env: environment },
                    );
                }
                return;
            } catch (error) {
                lastError = error;
                const output = commandFailureText(error);
                if (
                    attempt === GIT_CLONE_ATTEMPTS ||
                    !TRANSIENT_GIT_FAILURE.test(output)
                ) {
                    if (
                        new URL(cloneUrl).hostname === "github.com" &&
                        /timed out|operation timed out/i.test(output)
                    ) {
                        (error as Error & { code?: string }).code =
                            "github_connection_timeout";
                    }
                    throw error;
                }
                await new Promise((resolve) =>
                    setTimeout(resolve, GIT_CLONE_RETRY_DELAYS_MS[attempt - 1]),
                );
            }
        }
        throw lastError;
    }

    async uninstall(uuid: string): Promise<void> {
        await rm(path.join(this.installRoot, uuid), {
            recursive: true,
            force: true,
        });
        await this.updateCachedInstallation(uuid, false);
    }

    async getAsset(id: string): Promise<MarketplaceAsset | undefined> {
        const cached = this.assets.get(id);
        if (cached) return cached;
        try {
            const [body, metadata] = await Promise.all([
                readFile(path.join(this.assetCacheRoot, id)),
                readFile(path.join(this.assetCacheRoot, `${id}.json`), "utf8"),
            ]);
            const { contentType } = JSON.parse(metadata) as {
                contentType?: unknown;
            };
            if (typeof contentType !== "string") return undefined;
            const asset = { body, contentType };
            this.assets.set(id, asset);
            return asset;
        } catch (error) {
            if ((error as NodeJS.ErrnoException).code === "ENOENT") {
                return undefined;
            }
            throw error;
        }
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
                            ? this.resolveGithubManifestUrl(
                                  source,
                                  projectPath,
                                  defaultBranch,
                              )
                            : `${source.baseUrl}/projects/${encodeURIComponent(projectPath)}/repository/files/manifest.json/raw?ref=${encodeURIComponent(defaultBranch)}`;
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
                                      ? await this.cacheRepositoryImageAsset(
                                            source,
                                            projectPath,
                                            defaultBranch,
                                            manifest.assets.icon,
                                            headers,
                                        )
                                      : undefined,
                                  banner: manifest.assets.banner
                                      ? await this.cacheRepositoryImageAsset(
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
                        module: {
                            ...manifest,
                            version: defaultVersion ?? manifest.version,
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
                    return { cloneUrl, module: null };
                }
            }),
        );
        const cached = await this.readCachedCatalog([source.uuid]);
        const fresh = candidates.flatMap((candidate) =>
            candidate.module ? [candidate.module] : [],
        );
        const refreshedCloneUrls = new Set(
            fresh.map((module) => module.cloneUrl),
        );
        const retained = cached.filter(
            (module) => !refreshedCloneUrls.has(module.cloneUrl),
        );
        if (retained.length > 0) {
            this.log("warn", "Module scan retained cached entries.", {
                sourceUuid: source.uuid,
                sourceName: source.name,
                modulesRetained: retained.length,
            });
        }
        return [...fresh, ...retained];
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

    private async readScanAttempts(): Promise<Record<string, string>> {
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

    private async readCredentialBindings(): Promise<Record<string, string>> {
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

    private async saveCredentialBinding(
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

    private async recordScanAttempt(sourceUuid: string): Promise<void> {
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

    private async clearScanAttempt(sourceUuid: string): Promise<void> {
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

    private async updateCachedInstallState(
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

    private async pruneCachedSources(
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

    private async cacheRepositoryImageAsset(
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
            !manifest.assets?.banner ||
            (manifest.template !== undefined &&
                typeof manifest.template !== "boolean")
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

    private async readRepositoryFile(
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

    private resolveGithubManifestUrl(
        source: ModuleSource,
        projectPath: string,
        reference: string,
    ): string {
        return `${source.baseUrl}/repos/${projectPath}/contents/manifest.json?ref=${encodeURIComponent(reference)}`;
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
