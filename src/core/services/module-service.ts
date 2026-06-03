import {
    mkdtemp,
    mkdir,
    readFile,
    readdir,
    rm,
    stat,
    symlink,
    unlink,
    writeFile,
} from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import type { ModuleRuntimeGateway } from "../../modules/gateway.js";
import type { ModuleManifest } from "../contracts/module-manifest.js";

export interface ModulePathResolver {
    internalModulesPath: string;
    externalModulesPath: string;
    enabledPointersPath: string;
    runtimeExtractPath?: string;
}

export interface GithubModuleImportInput {
    repositoryUrl: string;
    versionTag: string;
}

export class ModuleService {
    private readonly runtimeExtractPath: string;

    constructor(
        private readonly runtime: ModuleRuntimeGateway,
        private readonly resolver?: ModulePathResolver,
    ) {
        this.runtimeExtractPath =
            resolver?.runtimeExtractPath ??
            path.join(os.tmpdir(), "cognis-module-runtime");
    }

    async list(): Promise<ModuleManifest[]> {
        return this.runtime.listManifests();
    }

    async enable(
        moduleId: string,
        options?: { acknowledgeExternalDisclaimer?: boolean },
    ): Promise<{ moduleId: string; enabled: boolean }> {
        const manifests = await this.runtime.listManifests();
        const found = manifests.find((manifest) => manifest.id === moduleId);

        if (!found) {
            throw new Error(`Unknown module: ${moduleId}`);
        }

        this.assertToggleAllowed(found);
        if (!this.resolver) return this.runtime.enable(moduleId);

        const resolvedPath = await this.resolveModulePath(moduleId);
        if (!resolvedPath)
            throw new Error(
                `Module artifact not found in configured module paths: ${moduleId}`,
            );

        if (resolvedPath.kind === "external") {
            if (!options?.acknowledgeExternalDisclaimer) {
                throw new Error(
                    `External module ${moduleId} requires disclaimer acknowledgement before enabling`,
                );
            }
            this.assertSupportedArchive(resolvedPath.path);
        }

        const activationPath = await this.materializeActivationPath(
            moduleId,
            resolvedPath,
        );
        await this.ensureRouteSafety(moduleId, activationPath);
        await this.writePointer(moduleId, activationPath);

        return this.runtime.enable(moduleId);
    }

    async disable(
        moduleId: string,
    ): Promise<{ moduleId: string; enabled: boolean }> {
        const manifests = await this.runtime.listManifests();
        const found = manifests.find((manifest) => manifest.id === moduleId);

        if (!found) {
            throw new Error(`Unknown module: ${moduleId}`);
        }

        this.assertToggleAllowed(found);
        if (this.resolver) {
            await this.removePointer(moduleId);
            await rm(path.join(this.runtimeExtractPath, moduleId), {
                recursive: true,
                force: true,
            });
        }
        return this.runtime.disable(moduleId);
    }

    async importFromGithub(
        input: GithubModuleImportInput,
    ): Promise<ModuleManifest> {
        const repository = this.parseGithubRepositoryUrl(input.repositoryUrl);
        const versionTag = String(input.versionTag ?? "").trim();
        if (!versionTag) {
            throw new Error("GitHub module import requires a non-empty versionTag");
        }

        const archiveUrl = `https://codeload.github.com/${repository.owner}/${repository.repo}/tar.gz/refs/tags/${encodeURIComponent(versionTag)}`;
        const response = await fetch(archiveUrl, {
            headers: {
                "user-agent": "cognis-module-importer",
                accept: "application/octet-stream",
            },
        });
        if (!response.ok) {
            throw new Error(
                `Failed to fetch GitHub module archive (${response.status} ${response.statusText})`,
            );
        }

        const bytes = new Uint8Array(await response.arrayBuffer());
        if (bytes.length === 0) {
            throw new Error("Downloaded GitHub module archive is empty");
        }

        return this.runtime.installFromZip(bytes);
    }

    private assertToggleAllowed(manifest: ModuleManifest): void {
        if (manifest.class === "core")
            throw new Error(
                `Core module ${manifest.id} cannot be toggled at runtime`,
            );
    }

    private async resolveModulePath(
        moduleId: string,
    ): Promise<{ kind: "internal" | "external"; path: string } | null> {
        const internalPath = path.join(
            this.resolver!.internalModulesPath,
            moduleId,
        );
        if (await this.existsDirectory(internalPath))
            return { kind: "internal", path: internalPath };

        const externalItems = await this.safeReaddir(
            this.resolver!.externalModulesPath,
        );
        const artifact = externalItems.find(
            (item) =>
                item === `${moduleId}.zip` || item === `${moduleId}.tar.gz`,
        );
        if (!artifact) return null;
        return {
            kind: "external",
            path: path.join(this.resolver!.externalModulesPath, artifact),
        };
    }

    private assertSupportedArchive(filePath: string): void {
        if (!filePath.endsWith(".zip") && !filePath.endsWith(".tar.gz"))
            throw new Error(
                "External modules must be .zip or .tar.gz archives",
            );
    }

    private async materializeActivationPath(
        moduleId: string,
        resolved: { kind: "internal" | "external"; path: string },
    ): Promise<string> {
        if (resolved.kind === "internal") return resolved.path;

        const extractRoot = path.join(this.runtimeExtractPath, moduleId);
        await rm(extractRoot, { recursive: true, force: true });
        await mkdir(extractRoot, { recursive: true });
        const artifactName = path.basename(resolved.path);
        await writeFile(
            path.join(extractRoot, ".artifact"),
            artifactName,
            "utf8",
        );
        return extractRoot;
    }

    private async writePointer(
        moduleId: string,
        activationPath: string,
    ): Promise<void> {
        await mkdir(this.resolver!.enabledPointersPath, { recursive: true });
        const pointerPath = path.join(
            this.resolver!.enabledPointersPath,
            `${moduleId}.load`,
        );
        await rm(pointerPath, { force: true });
        await symlink(activationPath, pointerPath);
    }

    private async removePointer(moduleId: string): Promise<void> {
        const pointerPath = path.join(
            this.resolver!.enabledPointersPath,
            `${moduleId}.load`,
        );
        await unlink(pointerPath).catch(() => undefined);
    }

    private async ensureRouteSafety(
        moduleId: string,
        activationPath: string,
    ): Promise<void> {
        const routeFile = path.join(activationPath, "routes.json");
        try {
            const raw = await readFile(routeFile, "utf8");
            const declaredRoutes = JSON.parse(raw) as unknown;
            const routes = Array.isArray(declaredRoutes)
                ? declaredRoutes
                      .map((entry) => {
                          if (typeof entry === "string") return entry;
                          if (
                              !entry ||
                              typeof entry !== "object" ||
                              Array.isArray(entry)
                          ) {
                              return null;
                          }
                          const pathValue = (entry as { path?: unknown }).path;
                          return typeof pathValue === "string"
                              ? pathValue
                              : null;
                      })
                      .filter((route): route is string => Boolean(route))
                : [];
            const blockedPrefixes = [
                "/api/v1/system",
                "/api/v1/auth",
                "/api/v1/users",
                "/public",
                "/ui",
            ];
            const conflict = routes.find((route) =>
                blockedPrefixes.some((prefix) => route.startsWith(prefix)),
            );
            if (conflict)
                throw new Error(
                    `Module ${moduleId} attempts to register protected route: ${conflict}`,
                );
        } catch (error) {
            if ((error as NodeJS.ErrnoException).code === "ENOENT") return;
            throw error;
        }
    }

    private async existsDirectory(candidate: string): Promise<boolean> {
        try {
            const info = await stat(candidate);
            return info.isDirectory();
        } catch {
            return false;
        }
    }

    private async safeReaddir(dirPath: string): Promise<string[]> {
        try {
            return await readdir(dirPath);
        } catch {
            return [];
        }
    }

    private parseGithubRepositoryUrl(input: string): {
        owner: string;
        repo: string;
    } {
        const raw = String(input ?? "").trim();
        if (!raw) throw new Error("GitHub module import requires repositoryUrl");

        let parsed: URL;
        try {
            parsed = new URL(raw);
        } catch {
            throw new Error("repositoryUrl must be a valid GitHub URL");
        }

        if (parsed.protocol !== "https:" || parsed.hostname !== "github.com") {
            throw new Error(
                "repositoryUrl must point to an https://github.com/<owner>/<repo> repository",
            );
        }

        const parts = parsed.pathname
            .split("/")
            .map((segment) => segment.trim())
            .filter(Boolean);
        if (parts.length < 2) {
            throw new Error(
                "repositoryUrl must include both owner and repository name",
            );
        }

        const owner = parts[0];
        const repo = parts[1].replace(/\.git$/i, "");
        if (!owner || !repo) {
            throw new Error(
                "repositoryUrl must include both owner and repository name",
            );
        }

        return { owner, repo };
    }
}
