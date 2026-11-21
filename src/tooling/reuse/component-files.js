import { readdirSync } from "node:fs";
import { dirname, resolve, sep } from "node:path";

export function sourceFiles(
    directory,
    {
        excludeDirectories = [
            "node_modules",
            ".git",
            "dist",
            "tests",
            "fixtures",
        ],
    } = {},
) {
    return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
        if (excludeDirectories.includes(entry.name) || entry.isSymbolicLink())
            return [];
        const path = resolve(directory, entry.name);
        return entry.isDirectory()
            ? sourceFiles(path, { excludeDirectories })
            : [path];
    });
}

export function componentManifestFiles(root) {
    const files = sourceFiles(root);
    const manifests = files.filter((path) =>
        path.endsWith(`${sep}manifest.json`),
    );
    const owned = new Set(manifests.map(dirname));
    return [
        ...manifests,
        ...files.filter(
            (path) =>
                path.endsWith(`${sep}package.json`) &&
                !owned.has(dirname(path)),
        ),
    ];
}
