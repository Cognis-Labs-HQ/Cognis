import { execFile } from "node:child_process";
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
import { promisify } from "node:util";
import type { ModuleManifest } from "../../../contracts/module-manifest.js";
import { validateModuleRepository } from "../repository-validator.js";
import { commandFailureText } from "../../reuse/command-failure-text.js";
import { MarketplaceServiceBase } from "./base.js";

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

export class ModuleMarketplaceService extends MarketplaceServiceBase {
    private readonly installationLocks = new Map<string, Promise<void>>();
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
                    ...(trustedOverride?.scanPrivateRepos === true
                        ? { scanPrivateRepos: true }
                        : {}),
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
                scanPrivateRepos: source.scanPrivateRepos === true,
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
        const privateScan = source.scanPrivateRepos === true;
        const endpoint =
            source.provider === "github"
                ? `${source.baseUrl}/orgs/${encodeURIComponent(source.namespace)}/repos?per_page=${privateScan ? "100" : "1"}&type=${privateScan ? "private" : "all"}`
                : `${source.baseUrl}/groups/${encodeURIComponent(source.namespace)}/projects?per_page=${privateScan ? "100" : "1"}&include_subgroups=true${privateScan ? "&visibility=private" : ""}`;
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
                const contentsResponse = await fetch(contentsEndpoint, {
                    headers,
                }).catch(() => undefined);
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

    async discoverWithReport(
        tokens: Record<string, string> = {},
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
        const configuredSourceUuids = new Set(
            sources.map((source) => source.uuid),
        );
        const discovered: MarketplaceModule[] = [];
        const sourceFailures: ModuleSourceScanFailure[] = [];
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
                    const token = source.credentialId
                        ? tokens[source.credentialId]
                        : undefined;
                    if (source.scanPrivateRepos === true && !token) {
                        throw new Error(
                            "private_repository_credential_missing",
                        );
                    }
                    modules = await this.discoverSource(source, token);
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
                            error: errorMessage,
                            privateRepositories:
                                source.scanPrivateRepos === true,
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
        return {
            modules: await Promise.all(
                discovered.map((module) => this.attachInstalledReadmes(module)),
            ),
            sourceFailures,
        };
    }

    async discover(
        tokens: Record<string, string> = {},
        sourceUuids?: string[],
        forceRefresh = false,
    ): Promise<MarketplaceModule[]> {
        return (
            await this.discoverWithReport(tokens, sourceUuids, forceRefresh)
        ).modules;
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
        token?: string,
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
            return await this.installUnlocked(
                module,
                token,
                branch,
                validateDependencies,
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
            if (typeof contentType !== "string") return undefined;
            return { body, contentType };
        } catch (error) {
            if ((error as NodeJS.ErrnoException).code === "ENOENT") {
                return undefined;
            }
            throw error;
        }
    }
}
