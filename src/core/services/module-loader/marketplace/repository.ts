import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import type { ModuleManifest } from "../../../contracts/module-manifest.js";
import type { ModuleMarketplaceLog, ModuleSource } from "./index.js";

interface ModuleInstallProvenance {
    sourceUuid: string;
    cloneUrl: string;
    branch: string;
    commit: string;
}

const MAX_MARKETPLACE_ASSET_BYTES = 10 * 1024 * 1024;
const CANONICAL_UUID =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export class MarketplaceRepository {
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
        const declaredLength = Number(response.headers.get("content-length"));
        if (
            Number.isFinite(declaredLength) &&
            declaredLength > MAX_MARKETPLACE_ASSET_BYTES
        ) {
            await response.body?.cancel();
            return undefined;
        }
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
                "application/xml",
                "text/xml",
            ].includes(contentType)
        ) {
            return undefined;
        }
        const body = githubPayload
            ? Buffer.from(
                  String(githubPayload.content ?? "").replace(/\s/g, ""),
                  "base64",
              )
            : await this.readBoundedAsset(response);
        if (!body || body.length > MAX_MARKETPLACE_ASSET_BYTES)
            return undefined;
        return this.writeCachedAsset(body, contentType);
    }

    protected async cacheRepositoryStringAsset(
        source: ModuleSource,
        projectPath: string,
        defaultBranch: string,
        assetPath: string,
        headers: Record<string, string>,
    ): Promise<string | undefined> {
        if (
            source.provider !== "github" ||
            source.baseUrl !== "https://api.github.com" ||
            source.scanPrivateRepos === true
        ) {
            return this.cacheRepositoryAsset(
                source,
                projectPath,
                defaultBranch,
                assetPath,
                headers,
            );
        }
        const normalizedPath = assetPath.replaceAll("\\", "/");
        if (
            normalizedPath.startsWith("/") ||
            normalizedPath.split("/").includes("..")
        ) {
            throw new Error("invalid_module_asset_path");
        }
        const encodedProjectPath = projectPath
            .split("/")
            .map(encodeURIComponent)
            .join("/");
        const assetUrl = `https://raw.githubusercontent.com/${encodedProjectPath}/${encodeURIComponent(defaultBranch)}/${normalizedPath
            .split("/")
            .map(encodeURIComponent)
            .join("/")}`;
        const response = await fetch(assetUrl, { headers }).catch(
            () => undefined,
        );
        if (!response?.ok) return undefined;
        const body = await this.readBoundedAsset(response);
        if (!body || body.length > MAX_MARKETPLACE_ASSET_BYTES) {
            return undefined;
        }
        return this.writeCachedAsset(body, "application/xml");
    }

    private async writeCachedAsset(
        body: Buffer,
        contentType: string,
    ): Promise<string> {
        const id = createHash("sha256").update(body).digest("hex");
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

    private async readBoundedAsset(response: Response): Promise<Buffer | null> {
        if (!response.body) return Buffer.alloc(0);
        const reader = response.body.getReader();
        const chunks: Uint8Array[] = [];
        let size = 0;
        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            size += value.byteLength;
            if (size > MAX_MARKETPLACE_ASSET_BYTES) {
                await reader.cancel();
                return null;
            }
            chunks.push(value);
        }
        return Buffer.concat(chunks, size);
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
                        contentType: this.repositoryAssetContentType(mediaPath),
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
            const response = await fetch(nextUrl, {
                headers,
                cache: "no-store",
            });
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
            !CANONICAL_UUID.test(manifest.uuid) ||
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
            !this.isDependencyList(manifest.hardDependencies) ||
            !this.isDependencyList(manifest.softDependencies) ||
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

    private isDependencyList(value: unknown): boolean {
        return (
            value === undefined ||
            (Array.isArray(value) &&
                value.every(
                    (dependency) =>
                        typeof dependency === "string" &&
                        dependency.trim().length > 0,
                ))
        );
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
                ".xml": "application/xml",
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
        if (
            url.protocol !== "https:" ||
            !source.namespace.trim() ||
            (source.scanPrivateRepos !== undefined &&
                typeof source.scanPrivateRepos !== "boolean")
        )
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
