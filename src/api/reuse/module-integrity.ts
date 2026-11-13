import { realpath, stat } from "node:fs/promises";
import path from "node:path";

export function isExcludedModuleIntegrityFile(relativePath: string): boolean {
    const normalizedPath = relativePath
        .replaceAll("\\", "/")
        .replace(/^\.\//, "");
    return (
        normalizedPath === "manifest.json" ||
        normalizedPath === "README.md" ||
        normalizedPath === "CHANGELOG.md" ||
        normalizedPath.startsWith("changelog/") ||
        normalizedPath.includes("/changelog/") ||
        normalizedPath.startsWith("docs/changelog/") ||
        normalizedPath === ".cognis-install.json" ||
        normalizedPath.endsWith("/.cognis-install.json")
    );
}

export async function resolveModuleIntegrityFile(
    moduleRoot: string,
    relativePath: string,
): Promise<string | null> {
    const candidate = path.resolve(moduleRoot, relativePath);
    const lexicalRelative = path.relative(path.resolve(moduleRoot), candidate);
    if (lexicalRelative.startsWith("..") || path.isAbsolute(lexicalRelative)) {
        return null;
    }
    try {
        const [resolvedRoot, resolvedCandidate] = await Promise.all([
            realpath(moduleRoot),
            realpath(candidate),
        ]);
        const resolvedRelative = path.relative(resolvedRoot, resolvedCandidate);
        if (
            resolvedRelative.startsWith("..") ||
            path.isAbsolute(resolvedRelative)
        ) {
            return null;
        }
        return (await stat(resolvedCandidate)).isFile()
            ? resolvedCandidate
            : null;
    } catch {
        return null;
    }
}

export function isVerifiedModuleIntegrityAlias(
    isSymbolicLink: boolean,
    resolvedFile: string | null,
    declaredTargets: ReadonlySet<string>,
): boolean {
    return Boolean(
        isSymbolicLink && resolvedFile && declaredTargets.has(resolvedFile),
    );
}
