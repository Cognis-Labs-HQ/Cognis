import { readFile, realpath, stat } from "node:fs/promises";
import path from "node:path";

const SOURCE_EXTENSION_PATTERN = /\.(?:[cm]?[jt]s)$/;
const STATIC_IMPORT_PATTERN =
    /\b(?:import|export)\s+(?:[^"'`;]*?\s+from\s+)?["']([^"']+)["']/g;
const DYNAMIC_IMPORT_PATTERN = /\bimport\(\s*["']([^"']+)["']\s*\)/g;
const REQUIRE_PATTERN = /\brequire\(\s*["']([^"']+)["']\s*\)/g;
const INTERNAL_URL_PATTERN =
    /["'`]((?:\/static\/(?:reuse|gateways|adapters)|\/api\/v1\/)[^"'`]*)/g;

function isInside(root: string, candidate: string): boolean {
    const relative = path.relative(root, candidate);
    return (
        relative === "" ||
        (!relative.startsWith("..") && !path.isAbsolute(relative))
    );
}

async function resolveLocalImport(
    moduleRoot: string,
    importer: string,
    specifier: string,
): Promise<string> {
    const unresolved = path.resolve(path.dirname(importer), specifier);
    const candidates = path.extname(unresolved)
        ? [unresolved]
        : [
              unresolved,
              ...[".js", ".mjs", ".cjs", ".ts", ".mts", ".cts"].map(
                  (extension) => `${unresolved}${extension}`,
              ),
              ...["index.js", "index.mjs", "index.cjs", "index.ts"].map(
                  (name) => path.join(unresolved, name),
              ),
          ];
    for (const candidate of candidates) {
        const resolved = await realpath(candidate).catch(() => undefined);
        if (!resolved) continue;
        if (!isInside(moduleRoot, resolved))
            throw new Error(
                `module_boundary_violation\n${path.relative(moduleRoot, importer)}:internal_import:${specifier}`,
            );
        if (
            !(await stat(resolved)).isFile() ||
            !SOURCE_EXTENSION_PATTERN.test(resolved)
        )
            throw new Error(
                `module_boundary_violation\n${path.relative(moduleRoot, importer)}:unsupported_import:${specifier}`,
            );
        return resolved;
    }
    throw new Error(
        `module_boundary_violation\n${path.relative(moduleRoot, importer)}:missing_import:${specifier}`,
    );
}

/** Validate only the executable dependency graph of a disabled API entrypoint. */
export async function validateModuleEntrypointBoundary(
    moduleRoot: string,
    entrypoint: string,
    moduleId: string,
): Promise<void> {
    const canonicalRoot = await realpath(moduleRoot);
    const canonicalEntrypoint = await realpath(entrypoint);
    if (!isInside(canonicalRoot, canonicalEntrypoint))
        throw new Error("module_boundary_violation\nentrypoint:outside_module");
    const pending = [canonicalEntrypoint];
    const visited = new Set<string>();
    while (pending.length) {
        const filePath = pending.pop()!;
        if (visited.has(filePath)) continue;
        visited.add(filePath);
        const source = await readFile(filePath, "utf8");
        const relativePath = path.relative(canonicalRoot, filePath);
        const specifiers = new Set<string>();
        for (const pattern of [
            STATIC_IMPORT_PATTERN,
            DYNAMIC_IMPORT_PATTERN,
            REQUIRE_PATTERN,
        ]) {
            pattern.lastIndex = 0;
            for (const match of source.matchAll(pattern))
                specifiers.add(match[1]);
        }
        for (const specifier of specifiers) {
            if (
                specifier.startsWith("@cognis/") ||
                specifier.startsWith("/static/") ||
                specifier.startsWith("src/")
            )
                throw new Error(
                    `module_boundary_violation\n${relativePath}:internal_import:${specifier}`,
                );
            if (specifier.startsWith("."))
                pending.push(
                    await resolveLocalImport(
                        canonicalRoot,
                        filePath,
                        specifier,
                    ),
                );
        }
        for (const match of source.matchAll(INTERNAL_URL_PATTERN)) {
            const url = match[1];
            const ownedApiPrefix = `/api/v1/modules/${moduleId}`;
            if (url === ownedApiPrefix || url.startsWith(`${ownedApiPrefix}/`))
                continue;
            throw new Error(
                `module_boundary_violation\n${relativePath}:internal_url:${url}`,
            );
        }
    }
}
