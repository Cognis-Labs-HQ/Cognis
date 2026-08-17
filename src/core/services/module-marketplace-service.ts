import { execFile } from "node:child_process";
import { mkdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";
import type { ModuleManifest } from "../contracts/module-manifest.js";

const execFileAsync = promisify(execFile);

export type ModuleSourceProvider = "github" | "gitlab";

export interface ModuleSource {
    uuid: string;
    name: string;
    provider: ModuleSourceProvider;
    namespace: string;
    baseUrl: string;
    credentialId?: string;
}

export interface MarketplaceModule extends ModuleManifest {
    cloneUrl: string;
    sourceUuid: string;
    installed: boolean;
}

export class ModuleMarketplaceService {
    constructor(
        private readonly statePath: string,
        private readonly installRoot: string,
    ) {}

    async listSources(): Promise<ModuleSource[]> {
        try {
            const value = JSON.parse(await readFile(this.statePath, "utf8"));
            return Array.isArray(value) ? value : [];
        } catch (error) {
            if ((error as NodeJS.ErrnoException).code === "ENOENT") return [];
            throw error;
        }
    }

    async saveSource(source: ModuleSource): Promise<ModuleSource> {
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
    ): Promise<MarketplaceModule[]> {
        const results = await Promise.all(
            (await this.listSources()).map((source) =>
                this.discoverSource(
                    source,
                    source.credentialId
                        ? tokens[source.credentialId]
                        : undefined,
                ),
            ),
        );
        return results.flat();
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
        await rm(target, { recursive: true, force: true });
        await rename(temporary, target);
        return manifest;
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
                const manifest = this.parseManifest(
                    await manifestResponse.text(),
                );
                return {
                    ...manifest,
                    cloneUrl,
                    sourceUuid: source.uuid,
                    installed: false,
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
            !manifest.version
        ) {
            throw new Error("invalid_module_manifest");
        }
        return manifest;
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
