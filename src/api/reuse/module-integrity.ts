export function isExcludedModuleIntegrityFile(relativePath: string): boolean {
    const normalizedPath = relativePath
        .replaceAll("\\", "/")
        .replace(/^\.\//, "");
    return (
        normalizedPath === "manifest.json" ||
        normalizedPath === "README.md" ||
        normalizedPath === ".cognis-install.json" ||
        normalizedPath.endsWith("/.cognis-install.json")
    );
}
