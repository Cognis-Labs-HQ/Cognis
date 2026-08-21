export function isExcludedModuleIntegrityFile(relativePath: string): boolean {
    return (
        relativePath === "manifest.json" ||
        relativePath === ".cognis-install.json" ||
        relativePath.endsWith("/.cognis-install.json")
    );
}
