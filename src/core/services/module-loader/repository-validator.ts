import { createHash } from "node:crypto";
import { lstat, readFile } from "node:fs/promises";
import path from "node:path";
import type { ModuleManifest } from "../../contracts/module-manifest.js";

const ICON_PATTERN = /^assets\/icon\.(?:svg|png)$/i;
const BANNER_PATTERN = /^assets\/banner\.(?:svg|png|jpe?g)$/i;

export async function validateModuleRepository(
    root: string,
    manifest: ModuleManifest,
): Promise<void> {
    const packageManifest = JSON.parse(
        await readFile(path.join(root, "package.json"), "utf8"),
    ) as Record<string, unknown>;
    const routes = JSON.parse(
        await readFile(path.join(root, "routes.json"), "utf8"),
    ) as unknown;
    if (
        packageManifest.version !== manifest.version ||
        packageManifest.type !== "module" ||
        !Array.isArray(routes) ||
        !manifest.entrypoints.bootstrap
    ) {
        throw new Error("invalid_module_repository_layout");
    }
    if (
        !ICON_PATTERN.test(manifest.assets?.icon ?? "") ||
        !BANNER_PATTERN.test(manifest.assets?.banner ?? "")
    ) {
        throw new Error("invalid_module_asset_convention");
    }
    if (manifest.license && !(await hasRootLicenseFile(root))) {
        throw new Error("missing_module_license_file");
    }

    const declaredPaths = [
        ...Object.values(manifest.entrypoints).filter(
            (value): value is string => typeof value === "string",
        ),
        manifest.assets?.icon,
        manifest.assets?.banner,
        ...(manifest.assets?.screenshots ?? []),
    ].filter((value): value is string => typeof value === "string");
    for (const declaredPath of declaredPaths) {
        await assertRepositoryFile(root, declaredPath);
    }
    for (const file of manifest.files ?? []) {
        if (file.path.replace(/^\.\//, "").toLowerCase() === "readme.md") {
            continue;
        }
        const filePath = await assertRepositoryFile(root, file.path);
        const digest = createHash("sha256")
            .update(await readFile(filePath))
            .digest("hex");
        if (digest !== file.sha256.toLowerCase()) {
            throw new Error(`module_file_checksum_mismatch:${file.path}`);
        }
    }
}

async function hasRootLicenseFile(root: string): Promise<boolean> {
    for (const filename of ["LICENSE", "LICENSE.md", "LICENSE.txt"]) {
        try {
            const status = await lstat(path.join(root, filename));
            if (status.isFile() && !status.isSymbolicLink()) return true;
        } catch (error) {
            if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
        }
    }
    return false;
}

async function assertRepositoryFile(
    root: string,
    repositoryPath: string,
): Promise<string> {
    const normalized = repositoryPath
        .replaceAll("\\", "/")
        .replace(/^\.\//, "");
    if (
        !normalized ||
        path.posix.isAbsolute(normalized) ||
        normalized.split("/").includes("..")
    ) {
        throw new Error("invalid_module_repository_path");
    }
    const absolutePath = path.resolve(root, normalized);
    const relativePath = path.relative(path.resolve(root), absolutePath);
    if (relativePath.startsWith("..") || path.isAbsolute(relativePath)) {
        throw new Error("invalid_module_repository_path");
    }
    let fileStatus;
    try {
        fileStatus = await lstat(absolutePath);
    } catch (error) {
        if ((error as NodeJS.ErrnoException).code === "ENOENT") {
            throw new Error(`missing_module_repository_file:${normalized}`);
        }
        throw error;
    }
    if (fileStatus.isSymbolicLink() || !fileStatus.isFile()) {
        throw new Error(`missing_module_repository_file:${normalized}`);
    }
    return absolutePath;
}
