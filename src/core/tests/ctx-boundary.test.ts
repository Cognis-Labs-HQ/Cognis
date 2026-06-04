/**
 * Ctx architecture boundary enforcement tests.
 *
 * These tests verify that the ctx-first import architecture is maintained.
 * Components must communicate through ctx capabilities and the public @cognis/core
 * surface rather than importing each other's internal implementations directly.
 *
 * Rules enforced:
 *   1. The core package (@cognis/core / src/core) must not import from gateway
 *      or API implementation files.
 *   2. No source file may use the deprecated flowCtx.on() shorthand — all flow
 *      hooks must go through addFlowStageHook().
 *   3. Gateway contract types (AuthContext, DatabaseGateway, etc.) must be
 *      defined only in src/core/contracts, not re-declared elsewhere.
 *   4. DB adapters must source DatabaseGateway/QueryResult from @cognis/core.
 *   5. File adapters must source FileStorageGateway/StoredObject from @cognis/core.
 *
 * When a violation is introduced, these tests fail loudly so it can be fixed
 * before it reaches production. When a known violation is resolved, remove it
 * from the allow-list below.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { readdir, readFile, stat } from "node:fs/promises";
import path from "node:path";

const srcRoot = path.resolve(import.meta.dirname, "../..");

/** Recursively collect all .ts files under a directory. */
async function findTsFiles(dir: string): Promise<string[]> {
    const results: string[] = [];
    let entries: string[];
    try {
        entries = await readdir(dir);
    } catch {
        return results;
    }
    for (const entry of entries) {
        const fullPath = path.join(dir, entry);
        const info = await stat(fullPath);
        if (info.isDirectory()) {
            results.push(...(await findTsFiles(fullPath)));
        } else if (entry.endsWith(".ts")) {
            results.push(fullPath);
        }
    }
    return results;
}

/** Extract all from-import paths from a TypeScript source file. */
function extractImportPaths(source: string): string[] {
    const paths: string[] = [];
    const importPattern =
        /(?:^|\n)\s*(?:import|export)\s+(?:type\s+)?(?:\{[^}]*\}|[\w*]+)\s+from\s+["']([^"']+)["']/g;
    let match: RegExpExecArray | null;
    while ((match = importPattern.exec(source)) !== null) {
        paths.push(match[1]);
    }
    return paths;
}

/** Check whether a relative import path from a source file resolves into
 *  a given directory (expressed as a path relative to srcRoot). */
function resolveImportDir(
    sourceFile: string,
    importPath: string,
): string | null {
    if (!importPath.startsWith(".")) {
        return null; // package import — not relative
    }
    const sourceDir = path.dirname(sourceFile);
    const resolved = path.resolve(sourceDir, importPath);
    return resolved;
}

// ---------------------------------------------------------------------------
// Rule 1: Core package must not import from gateway or API implementations
// ---------------------------------------------------------------------------

test("core package does not import from gateway or API implementations", async () => {
    const coreDir = path.join(srcRoot, "core");
    const gatewaysDir = path.join(srcRoot, "gateways");
    const apiDir = path.join(srcRoot, "api");
    const coreFiles = await findTsFiles(coreDir);

    const violations: string[] = [];
    for (const file of coreFiles) {
        const source = await readFile(file, "utf8");
        const importPaths = extractImportPaths(source);
        for (const importPath of importPaths) {
            const resolved = resolveImportDir(file, importPath);
            if (!resolved) continue;
            if (
                resolved.startsWith(gatewaysDir) ||
                resolved.startsWith(apiDir)
            ) {
                const rel = path.relative(srcRoot, file);
                violations.push(`${rel}: imports ${importPath}`);
            }
        }
    }

    assert.deepEqual(
        violations,
        [],
        "core/ must not import from gateways/ or api/. Move shared types to src/core/contracts/.",
    );
});

// ---------------------------------------------------------------------------
// Rule 2: No deprecated flowCtx.on() shorthand
// ---------------------------------------------------------------------------

test("no source file uses the deprecated flowCtx.on() or ctx.on() flow hook shorthand", async () => {
    const allFiles = [
        ...(await findTsFiles(path.join(srcRoot, "core"))),
        ...(await findTsFiles(path.join(srcRoot, "gateways"))),
        ...(await findTsFiles(path.join(srcRoot, "adapters"))),
        ...(await findTsFiles(path.join(srcRoot, "api"))),
        ...(await findTsFiles(path.join(srcRoot, "modules"))),
        // Exclude this test file from the scan to avoid self-matching on the
        // pattern strings defined in this file.
    ].filter(
        (f) => f !== path.resolve(import.meta.dirname, "ctx-boundary.test.ts"),
    );

    // Matches flowCtx.on( or ctx.on( followed by a quoted string (flow ID),
    // indicating use of the non-existent 3-argument shorthand.
    const brokenPattern = /\b(?:flowCtx|ctx)\.on\(\s*["'`]/;

    const violations: string[] = [];
    for (const file of allFiles) {
        const source = await readFile(file, "utf8");
        if (brokenPattern.test(source)) {
            violations.push(path.relative(srcRoot, file));
        }
    }

    assert.deepEqual(
        violations,
        [],
        "Use addFlowStageHook() instead of the deprecated .on() shorthand. " +
            "The Ctx interface does not expose .on().",
    );
});

// ---------------------------------------------------------------------------
// Rule 3: Gateway contract types must be sourced from @cognis/core
// ---------------------------------------------------------------------------

// Contract types that must only be imported from @cognis/core (not from their
// former gateway home files).
const CONTRACT_TYPES = [
    "AuthContext",
    "AuthGateway",
    "DatabaseGateway",
    "QueryResult",
    "FileStorageGateway",
    "StoredObject",
] as const;

test("gateway contract types are sourced from @cognis/core, not gateway files", async () => {
    // Scan adapter files that are type-checked (have tsconfig.json).
    const checkedAdapterDirs = [
        path.join(srcRoot, "adapters", "auth"),
        path.join(srcRoot, "adapters", "db"),
        path.join(srcRoot, "adapters", "file"),
    ];
    const apiDir = path.join(srcRoot, "api");

    const filesToCheck = [
        ...(await Promise.all(checkedAdapterDirs.map(findTsFiles))).flat(),
        ...(await findTsFiles(apiDir)),
    ];

    // Forbidden import sources — importing contract types from these files
    // is a violation (they must come from @cognis/core instead).
    const forbiddenSources = [
        "gateways/auth/gateway",
        "gateways/db/gateway",
        "gateways/files/gateway",
    ];

    const violations: string[] = [];
    for (const file of filesToCheck) {
        const source = await readFile(file, "utf8");
        const importPaths = extractImportPaths(source);
        for (const importPath of importPaths) {
            if (!importPath.startsWith(".")) continue;
            const sourceDir = path.dirname(file);
            const resolved = path.resolve(sourceDir, importPath);
            const relResolved = path.relative(srcRoot, resolved);

            const isForbidden = forbiddenSources.some((forbidden) =>
                relResolved.startsWith(forbidden),
            );
            if (!isForbidden) continue;

            // Check whether this import statement actually brings in contract types
            const importMatch = source.match(
                new RegExp(
                    `import[^;]*from\\s+["']${importPath.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}["']`,
                    "s",
                ),
            );
            if (!importMatch) continue;
            const importStatement = importMatch[0];
            const usesContractType = CONTRACT_TYPES.some((t) =>
                importStatement.includes(t),
            );
            if (usesContractType) {
                const rel = path.relative(srcRoot, file);
                violations.push(
                    `${rel}: imports contract type from ${importPath} — use @cognis/core instead`,
                );
            }
        }
    }

    assert.deepEqual(
        violations,
        [],
        "Contract types must be imported from @cognis/core.",
    );
});

// ---------------------------------------------------------------------------
// Rule 4: Cross-gateway production imports are prohibited
// ---------------------------------------------------------------------------

test("gateway implementations do not import production code from other gateways", async () => {
    const gatewaysDir = path.join(srcRoot, "gateways");
    const gatewayNames = await readdir(gatewaysDir);

    // Exception: gateways may import from gateways/db/reuse/ (the shared DB
    // executor layer, intentionally cross-boundary per its own documentation),
    // from gateways/db/tests/ in test files, from gateways/shared.ts (the
    // common gateway bootstrap utility layer), and from gateways/reuse/.
    const allowedCrossBoundary = [
        path.join(gatewaysDir, "db", "reuse"),
        path.join(gatewaysDir, "db", "tests"),
        path.join(gatewaysDir, "shared.ts"),
        path.join(gatewaysDir, "reuse"),
    ];

    const violations: string[] = [];

    for (const gwName of gatewayNames) {
        const gwDir = path.join(gatewaysDir, gwName);
        const gwStat = await stat(gwDir).catch(() => null);
        if (!gwStat?.isDirectory()) continue;

        const files = await findTsFiles(gwDir);
        for (const file of files) {
            const source = await readFile(file, "utf8");
            const importPaths = extractImportPaths(source);

            for (const importPath of importPaths) {
                const resolved = resolveImportDir(file, importPath);
                if (!resolved) continue;
                if (!resolved.startsWith(gatewaysDir)) continue;
                if (resolved.startsWith(gwDir)) continue; // own gateway — ok

                const isAllowed = allowedCrossBoundary.some((allowed) => {
                    const resolvedBase = resolved.replace(/\.[jt]s$/, "");
                    const allowedBase = allowed.replace(/\.[jt]s$/, "");
                    return resolvedBase.startsWith(allowedBase);
                });
                if (isAllowed) continue;

                // Test files may use test helpers from other gateways
                const isTestFile =
                    file.includes("/tests/") || file.endsWith(".test.ts");
                if (isTestFile) continue;

                const rel = path.relative(srcRoot, file);
                violations.push(
                    `${rel}: imports from other gateway: ${importPath}`,
                );
            }
        }
    }

    assert.deepEqual(
        violations,
        [],
        "Gateways must not import production code from other gateways. " +
            "Use ctx capabilities to share functionality across gateways.",
    );
});
