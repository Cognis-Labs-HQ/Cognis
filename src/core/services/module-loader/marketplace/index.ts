import { fetchMarketplaceResource } from "./request.js";
import {
    ModuleSourceRegistry,
    type SourceCredentialChange,
} from "./sources.js";
import { createHash } from "node:crypto";
import {
    mkdir,
    readFile,
    readdir,
    rename,
    rm,
    writeFile,
} from "node:fs/promises";
import path from "node:path";
import type { ModuleManifest } from "../../../contracts/module-manifest.js";
import { validateModuleRepository } from "../repository-validator.js";
import { checkoutModuleRepository } from "./checkout.js";
import { MarketplaceServiceBase } from "./base.js";

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
    credentialConfigured?: boolean;
    revision?: string;
    scanPrivateRepos?: boolean;
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
        scanPrivateRepos: false,
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
    selectedBranch?: string;
    updateAvailable: boolean;
    assetIds?: {
        icon?: string;
        banner?: string;
        screenshots?: string[];
        media?: Array<{ id: string; contentType: string }>;
        strings?: Record<string, string>;
    };
    readme?: string;
    readmes?: Record<string, string>;
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

export interface ModuleSourceScanFailure {
    sourceUuid: string;
    sourceName: string;
    code:
        | "private_repository_credential_missing"
        | "private_repository_access_failed"
        | "private_repository_contents_access_failed";
}

export interface ModuleDiscoveryResult {
    modules: MarketplaceModule[];
    sourceFailures: ModuleSourceScanFailure[];
}

export type ModuleMarketplaceLog = (
    level: "info" | "warn" | "error",
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
    manifestSha256: string;
}

export class ModuleMarketplaceService extends MarketplaceServiceBase {
    private readonly installationLocks = new Map<string, Promise<void>>();
    private readonly sourceScans = new Map<
        string,
        { revision?: string; request: Promise<MarketplaceModule[]> }
    >();
    private readonly sources = new ModuleSourceRegistry(
        this.statePath,
        this.context,
        DEFAULT_TRUSTED_MODULE_SOURCE,
        (source, token) => this.validateSourceCredential(source, token),
    );

    async saveSelectedBranch(
        moduleUuid: string,
        branch: string,
    ): Promise<void> {
        await this.updateCachedSelectedBranch(moduleUuid, branch);
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
        const response = await fetchMarketplaceResource(
            recommendedModulesUrl,
        ).catch(() => undefined);
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
        return this.sources.list();
    }

    async saveSource(
        source: ModuleSource,
        credential: SourceCredentialChange = {},
    ): Promise<ModuleSource> {
        const saved = await this.sources.mutate({
            action: "save",
            source,
            credential,
        });
        return saved!;
    }

    async validateSourceCredential(
        source: ModuleSource,
        token?: string,
    ): Promise<ModuleCredentialValidation> {
        source = this.sources.normalize(source);
        const normalizedToken = (
            token ??
            (await this.sources.token(source.uuid, source)) ??
            ""
        ).trim();
        return this.credentialContext.run(normalizedToken, () =>
            this.validateCredential(source, normalizedToken),
        );
    }

    private async validateCredential(
        source: ModuleSource,
        normalizedToken: string,
    ): Promise<ModuleCredentialValidation> {
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
        const privateScan = source.scanPrivateRepos === true;
        const endpoint =
            source.provider === "github"
                ? `${source.baseUrl}/orgs/${encodeURIComponent(source.namespace)}/repos?per_page=${privateScan ? "100" : "1"}&type=${privateScan ? "private" : "all"}`
                : `${source.baseUrl}/groups/${encodeURIComponent(source.namespace)}/projects?per_page=${privateScan ? "100" : "1"}&include_subgroups=true${privateScan ? "&visibility=private" : ""}`;
        const response = await fetchMarketplaceResource(endpoint, {
            headers,
            redirect: "error",
        }).catch(() => undefined);
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
            privateScan &&
            source.provider === "github" &&
            scopes.length > 0 &&
            !scopes.includes("repo")
        ) {
            warnings.push("github_repo_scope_missing");
        }
        if (!response.ok && warnings.length === 0) {
            warnings.push("source_access_failed");
        }
        if (response.ok) {
            const repositories = (await response.json()) as Array<
                Record<string, unknown>
            >;
            if (privateScan && repositories.length === 0) {
                warnings.push("private_repository_not_visible");
            }
            const repository = repositories[0];
            if (privateScan && repository) {
                const contentsEndpoint =
                    source.provider === "github"
                        ? `${source.baseUrl}/repos/${String(repository.full_name ?? "")}/contents`
                        : `${source.baseUrl}/projects/${encodeURIComponent(String(repository.id ?? ""))}/repository/tree?per_page=1`;
                const contentsResponse = await fetchMarketplaceResource(
                    contentsEndpoint,
                    {
                        headers,
                    },
                ).catch(() => undefined);
                if (!contentsResponse?.ok) {
                    warnings.push("private_repository_contents_read_missing");
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
        uuid = uuid.toLowerCase();
        if (uuid === DEFAULT_TRUSTED_MODULE_SOURCE.uuid) {
            throw new Error("trusted_module_source_readonly");
        }
        await this.sources.mutate({ action: "remove", uuid });
        const sources = await this.listSources();
        await this.pruneCachedSources(
            new Set(sources.map((source) => source.uuid)),
        );
    }

    private scanConfiguredSource(
        source: ModuleSource,
    ): Promise<MarketplaceModule[]> {
        const previous = this.sourceScans.get(source.uuid);
        if (previous && previous.revision === source.revision)
            return previous.request;
        const request = (async () => {
            const token = await this.sources.token(source.uuid, source);
            if (source.scanPrivateRepos === true && !token)
                throw new Error("private_repository_credential_missing");
            return this.credentialContext.run(token, () =>
                this.discoverSource(source, token),
            );
        })();
        const record = { revision: source.revision, request };
        this.sourceScans.set(source.uuid, record);
        const cleanup = () => {
            if (this.sourceScans.get(source.uuid) === record)
                this.sourceScans.delete(source.uuid);
        };
        void request.then(cleanup, cleanup);
        return request;
    }

    async discoverWithReport(
        sourceUuids?: string[],
        forceRefresh = false,
    ): Promise<ModuleDiscoveryResult> {
        const sources = await this.listSources();
        const selectedSources = (
            sourceUuids
                ? sources.filter((source) => sourceUuids.includes(source.uuid))
                : sources
        ).sort(
            (left, right) =>
                Number(Boolean(right.trusted)) - Number(Boolean(left.trusted)),
        );
        const discovered: MarketplaceModule[] = [];
        const sourceFailures: ModuleSourceScanFailure[] = [];
        const claimedUuids = new Map<
            string,
            { module: MarketplaceModule; cached: boolean }
        >();
        for (const source of selectedSources) {
            const cachedModules = await this.readCachedCatalog([source.uuid]);
            const lastAttemptAt = (await this.readScanAttempts())[
                `${source.uuid}:${source.revision ?? "default"}`
            ];
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
                await this.recordScanAttempt(source.uuid, source.revision);
                this.log("info", "Module source scan started.", {
                    sourceUuid: source.uuid,
                    sourceName: source.name,
                });
                try {
                    modules = await this.scanConfiguredSource(source);
                } catch (error) {
                    modules = cachedModules;
                    const errorMessage =
                        error instanceof Error ? error.message : String(error);
                    if (source.scanPrivateRepos === true) {
                        const code = errorMessage.includes(
                            "private_repository_contents_access_failed",
                        )
                            ? "private_repository_contents_access_failed"
                            : errorMessage.includes(
                                    "private_repository_credential_missing",
                                )
                              ? "private_repository_credential_missing"
                              : "private_repository_access_failed";
                        sourceFailures.push({
                            sourceUuid: source.uuid,
                            sourceName: source.name,
                            code,
                        });
                    }
                    this.log(
                        "warn",
                        "Module source scan failed; cached results retained.",
                        {
                            sourceUuid: source.uuid,
                            sourceName: source.name,
                            modulesRetained: modules.length,
                            errorName:
                                error instanceof Error ? error.name : "Error",
                            privateRepositories:
                                source.scanPrivateRepos === true,
                        },
                    );
                }
            }
            const currentSource = (await this.listSources()).find(
                (entry) => entry.uuid === source.uuid,
            );
            if (!currentSource || currentSource.revision !== source.revision) {
                this.log(
                    "info",
                    "Discarded a module scan after its source configuration changed.",
                    { sourceUuid: source.uuid },
                );
                continue;
            }
            modules = this.applyCachedSelectedBranches(modules, cachedModules);
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
            if (
                !(await this.replaceCachedSource(
                    source.uuid,
                    accepted,
                    () => this.listSources(),
                    source.revision,
                ))
            )
                continue;
            this.log("info", "Module source scan completed.", {
                sourceUuid: source.uuid,
                sourceName: source.name,
                catalogModulesFound: accepted.length,
            });
            discovered.push(...accepted);
        }
        return {
            modules: await Promise.all(
                discovered.map((module) => this.attachInstalledReadmes(module)),
            ),
            sourceFailures,
        };
    }

    async discover(
        sourceUuids?: string[],
        forceRefresh = false,
    ): Promise<MarketplaceModule[]> {
        return (await this.discoverWithReport(sourceUuids, forceRefresh))
            .modules;
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
        const modules = (await this.readCachedCatalog())
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
        return Promise.all(
            modules.map((module) => this.attachInstalledReadmes(module)),
        );
    }

    private async attachInstalledReadmes(
        module: MarketplaceModule,
    ): Promise<MarketplaceModule> {
        const moduleRoot = path.join(this.installRoot, module.uuid);
        try {
            const readmeNames = (await readdir(moduleRoot)).filter((name) =>
                /^README(?:\.[A-Za-z0-9-]+)?\.md$/i.test(name),
            );
            const readmes = Object.fromEntries(
                await Promise.all(
                    readmeNames.map(async (name) => {
                        const locale =
                            name
                                .match(/^README\.([A-Za-z0-9-]+)\.md$/i)?.[1]
                                ?.toLowerCase() ?? "default";
                        return [
                            locale,
                            await readFile(path.join(moduleRoot, name), "utf8"),
                        ];
                    }),
                ),
            );
            return Object.keys(readmes).length
                ? { ...module, readmes }
                : module;
        } catch {
            return module;
        }
    }

    async install(
        module: MarketplaceModule,
        branch?: string,
        validateDependencies?: (manifest: ModuleManifest) => Promise<void>,
    ): Promise<ModuleManifest> {
        const previous =
            this.installationLocks.get(module.uuid) ?? Promise.resolve();
        let release!: () => void;
        const current = new Promise<void>((resolve) => {
            release = resolve;
        });
        this.installationLocks.set(module.uuid, current);
        await previous;
        try {
            const catalogModule = (await this.listCachedModules()).find(
                (entry) => entry.uuid === module.uuid,
            );
            if (
                !catalogModule ||
                catalogModule.sourceUuid !== module.sourceUuid ||
                catalogModule.cloneUrl !== module.cloneUrl
            )
                throw new Error("module_catalog_entry_required");
            const source = (await this.listSources()).find(
                (entry) => entry.uuid === catalogModule.sourceUuid,
            );
            if (!source) throw new Error("module_source_unavailable");
            const clone = new URL(catalogModule.cloneUrl);
            const base = new URL(source.baseUrl);
            const repositoryHost =
                source.provider === "github" &&
                base.hostname === "api.github.com"
                    ? "github.com"
                    : base.hostname;
            const deploymentPrefix =
                source.provider === "gitlab"
                    ? base.pathname
                          .replace(/\/api\/v4\/?$/, "")
                          .replace(/\/$/, "")
                    : "";
            const repositoryPrefix =
                `${deploymentPrefix}/${source.namespace}/`.toLowerCase();
            if (
                clone.protocol !== "https:" ||
                clone.hostname !== repositoryHost ||
                clone.port !== base.port ||
                clone.username ||
                clone.password ||
                clone.search ||
                clone.hash ||
                !clone.pathname.toLowerCase().startsWith(repositoryPrefix)
            )
                throw new Error("module_source_repository_mismatch");
            const token = await this.sources.token(source.uuid, source);
            return await this.credentialContext.run(token, () =>
                this.installUnlocked(
                    catalogModule,
                    token,
                    branch,
                    validateDependencies,
                ),
            );
        } finally {
            release();
            if (this.installationLocks.get(module.uuid) === current) {
                this.installationLocks.delete(module.uuid);
            }
        }
    }

    private async installUnlocked(
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
            gitEnvironment.GIT_CONFIG_COUNT = "2";
            gitEnvironment.GIT_CONFIG_KEY_0 = `http.${cloneUrl}.extraHeader`;
            gitEnvironment.GIT_CONFIG_KEY_1 = "http.followRedirects";
            gitEnvironment.GIT_CONFIG_VALUE_1 = "false";
            gitEnvironment.GIT_CONFIG_VALUE_0 = `Authorization: Basic ${Buffer.from(`oauth2:${token}`).toString("base64")}`;
        }
        try {
            const commit = await checkoutModuleRepository({
                cloneUrl,
                commit: selectedRef.commit,
                root: temporary,
                environment: gitEnvironment,
                log: this.log,
            });
            const rawManifest = await readFile(
                path.join(temporary, "manifest.json"),
                "utf8",
            );
            const manifest = this.parseManifest(rawManifest);
            if (manifest.uuid !== module.uuid)
                throw new Error("module_uuid_mismatch");
            const installedEntries = await readdir(this.installRoot, {
                withFileTypes: true,
            });
            for (const entry of installedEntries) {
                if (
                    !entry.isDirectory() ||
                    entry.name === module.uuid ||
                    !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
                        entry.name,
                    )
                )
                    continue;
                const installedManifest = await readFile(
                    path.join(this.installRoot, entry.name, "manifest.json"),
                    "utf8",
                )
                    .then((raw) => this.parseManifest(raw))
                    .catch(() => null);
                if (installedManifest?.id === manifest.id) {
                    throw new Error("module_id_conflict");
                }
            }
            await validateModuleRepository(temporary, manifest);
            await validateDependencies?.(manifest);
            const provenance: ModuleInstallProvenance = {
                sourceUuid: module.sourceUuid,
                cloneUrl,
                branch: selectedBranch,
                commit,
                manifestSha256: createHash("sha256")
                    .update(rawManifest, "utf8")
                    .digest("hex"),
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

    async uninstall(uuid: string): Promise<void> {
        if (
            !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
                uuid,
            )
        ) {
            throw new Error("Module UUID is invalid");
        }
        const installRoot = path.resolve(this.installRoot);
        const target = path.resolve(installRoot, uuid);
        if (path.dirname(target) !== installRoot) {
            throw new Error(
                "Module uninstall path is outside the install root",
            );
        }
        await rm(target, {
            recursive: true,
            force: true,
        });
        await this.updateCachedInstallation(uuid, false);
    }

    async getAsset(id: string): Promise<MarketplaceAsset | undefined> {
        if (!/^[a-f0-9]{64}$/i.test(id)) return undefined;
        try {
            const [body, metadata] = await Promise.all([
                readFile(path.join(this.assetCacheRoot, id)),
                readFile(path.join(this.assetCacheRoot, `${id}.json`), "utf8"),
            ]);
            const { contentType } = JSON.parse(metadata) as {
                contentType?: unknown;
            };
            if (!body.length || typeof contentType !== "string") {
                this.log("error", "Module asset cache entry is invalid.", {
                    component: "module-marketplace",
                    operation: "readAsset",
                    assetId: id,
                    reason: !body.length
                        ? "asset_empty"
                        : "asset_metadata_invalid",
                });
                return undefined;
            }
            return { body, contentType };
        } catch (error) {
            this.log("error", "Module asset cache read failed.", {
                component: "module-marketplace",
                operation: "readAsset",
                assetId: id,
                reason:
                    (error as NodeJS.ErrnoException).code ??
                    "asset_metadata_unreadable",
            });
            if ((error as NodeJS.ErrnoException).code === "ENOENT") {
                return undefined;
            }
            throw error;
        }
    }
}
