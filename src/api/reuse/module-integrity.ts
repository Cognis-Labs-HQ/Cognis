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
