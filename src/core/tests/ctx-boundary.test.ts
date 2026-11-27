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

const sourceRoot = path.resolve(import.meta.dirname, "../..");

/** Recursively collect all .ts files under a directory. */
async function findTypeScriptFiles(directory: string): Promise<string[]> {
    const results: string[] = [];
    let entries: string[];
    try {
        entries = await readdir(directory);
    } catch {
        return results;
    }
    for (const entry of entries) {
        const fullPath = path.join(directory, entry);
        const info = await stat(fullPath);
        if (info.isDirectory()) {
            results.push(...(await findTypeScriptFiles(fullPath)));
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
function resolveImportDirectory(
    sourceFile: string,
    importPath: string,
): string | null {
    if (!importPath.startsWith(".")) {
        return null; // package import — not relative
    }
    const sourceDirectory = path.dirname(sourceFile);
    const resolved = path.resolve(sourceDirectory, importPath);
    return resolved;
}

// ---------------------------------------------------------------------------
// Rule 1: Core package must not import from gateway or API implementations
// ---------------------------------------------------------------------------

test("core package does not import from gateway or API implementations", async () => {
    const coreDirectory = path.join(sourceRoot, "core");
    const gatewaysDirectory = path.join(sourceRoot, "gateways");
    const apiDirectory = path.join(sourceRoot, "api");
    const coreFiles = await findTypeScriptFiles(coreDirectory);

    const violations: string[] = [];
    for (const file of coreFiles) {
        const source = await readFile(file, "utf8");
        const importPaths = extractImportPaths(source);
        for (const importPath of importPaths) {
            const resolved = resolveImportDirectory(file, importPath);
            if (!resolved) continue;
            if (
                resolved.startsWith(gatewaysDirectory) ||
                resolved.startsWith(apiDirectory)
            ) {
                const relativePath = path.relative(sourceRoot, file);
                violations.push(`${relativePath}: imports ${importPath}`);
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
        ...(await findTypeScriptFiles(path.join(sourceRoot, "core"))),
        ...(await findTypeScriptFiles(path.join(sourceRoot, "gateways"))),
        ...(await findTypeScriptFiles(path.join(sourceRoot, "adapters"))),
        ...(await findTypeScriptFiles(path.join(sourceRoot, "api"))),
        ...(await findTypeScriptFiles(path.join(sourceRoot, "modules"))),
        // Exclude this test file from the scan to avoid self-matching on the
        // pattern strings defined in this file.
    ].filter(
        (file) =>
            file !== path.resolve(import.meta.dirname, "ctx-boundary.test.ts"),
    );

    // Matches flowCtx.on( or ctx.on( followed by a quoted string (flow ID),
    // indicating use of the non-existent 3-argument shorthand.
    const brokenPattern = /\b(?:flowCtx|ctx)\.on\(\s*["'`]/;

    const violations: string[] = [];
    for (const file of allFiles) {
        const source = await readFile(file, "utf8");
        if (brokenPattern.test(source)) {
            violations.push(path.relative(sourceRoot, file));
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
    const checkedAdapterDirectories = [
        path.join(sourceRoot, "adapters", "auth"),
        path.join(sourceRoot, "adapters", "db"),
        path.join(sourceRoot, "adapters", "file"),
    ];
    const apiDirectory = path.join(sourceRoot, "api");

    const filesToCheck = [
        ...(
            await Promise.all(
                checkedAdapterDirectories.map(findTypeScriptFiles),
            )
        ).flat(),
        ...(await findTypeScriptFiles(apiDirectory)),
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
            const sourceDirectory = path.dirname(file);
            const resolved = path.resolve(sourceDirectory, importPath);
            const relativePathResolved = path.relative(sourceRoot, resolved);

            const isForbidden = forbiddenSources.some((forbidden) =>
                relativePathResolved.startsWith(forbidden),
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
            const usesContractType = CONTRACT_TYPES.some((contractType) =>
                importStatement.includes(contractType),
            );
            if (usesContractType) {
                const relativePath = path.relative(sourceRoot, file);
                violations.push(
                    `${relativePath}: imports contract type from ${importPath} — use @cognis/core instead`,
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
    const gatewaysDirectory = path.join(sourceRoot, "gateways");
    const gatewayNames = await readdir(gatewaysDirectory);

    // Exception: gateways may import from gateways/db/reuse/ (the shared DB
    // executor layer, intentionally cross-boundary per its own documentation),
    // from gateways/db/tests/ in test files, from gateways/shared.ts (the
    // common gateway bootstrap utility layer), and from gateways/reuse/.
    const allowedCrossBoundary = [
        path.join(gatewaysDirectory, "db", "reuse"),
        path.join(gatewaysDirectory, "db", "tests"),
        path.join(gatewaysDirectory, "shared.ts"),
        path.join(gatewaysDirectory, "reuse"),
    ];

    const violations: string[] = [];

    for (const gatewayName of gatewayNames) {
        const gatewayDirectory = path.join(gatewaysDirectory, gatewayName);
        const gatewayStat = await stat(gatewayDirectory).catch(() => null);
        if (!gatewayStat?.isDirectory()) continue;

        const files = await findTypeScriptFiles(gatewayDirectory);
        for (const file of files) {
            const source = await readFile(file, "utf8");
            const importPaths = extractImportPaths(source);

            for (const importPath of importPaths) {
                const resolved = resolveImportDirectory(file, importPath);
                if (!resolved) continue;
                if (!resolved.startsWith(gatewaysDirectory)) continue;
                if (resolved.startsWith(gatewayDirectory)) continue; // own gateway — ok

                const isAllowed = allowedCrossBoundary.some((allowed) => {
                    const resolvedBase = resolved.replace(/\.[jt]s$/, "");
                    const allowedBase = allowed.replace(/\.[jt]s$/, "");
                    return resolvedBase.startsWith(allowedBase);
                });
                if (isAllowed) continue;

                // Public provider-owned declarations contain types only; executable
                // cross-component integration must still go through ctx.
                const relative = path.relative(gatewaysDirectory, resolved);
                const isPublicContract = /^[^/]+\/contracts\/[^/]+\.js$/.test(
                    relative,
                );
                const typeOnly = new RegExp(
                    `(?:import|export)\\s+type\\s+\\{[^}]*\\}\\s+from\\s+["']${importPath.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}["']`,
                ).test(source);
                if (isPublicContract && typeOnly) continue;

                // Test files may use test helpers from other gateways
                const isTestFile =
                    file.includes("/tests/") || file.endsWith(".test.ts");
                if (isTestFile) continue;

                const relativePath = path.relative(sourceRoot, file);
                violations.push(
                    `${relativePath}: imports from other gateway: ${importPath}`,
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

// ---------------------------------------------------------------------------
// Rule 5: ensureCtxCapability must not be used outside of core
// ---------------------------------------------------------------------------

test("no source file outside core uses the removed ensureCtxCapability helper", async () => {
    const allFiles = [
        ...(await findTypeScriptFiles(path.join(sourceRoot, "gateways"))),
        ...(await findTypeScriptFiles(path.join(sourceRoot, "adapters"))),
        ...(await findTypeScriptFiles(path.join(sourceRoot, "api"))),
        ...(await findTypeScriptFiles(path.join(sourceRoot, "modules"))),
    ].filter(
        (file) =>
            file !== path.resolve(import.meta.dirname, "ctx-boundary.test.ts"),
    );

    const pattern = /\bensureCtxCapability\b/;

    const violations: string[] = [];
    for (const file of allFiles) {
        const source = await readFile(file, "utf8");
        if (pattern.test(source)) {
            violations.push(path.relative(sourceRoot, file));
        }
    }

    assert.deepEqual(
        violations,
        [],
        "ensureCtxCapability has been removed. Use ctx.flow.exists() / ctx.flow.extend() instead.",
    );
});

// ---------------------------------------------------------------------------
// Rule 6: Prefer ctx.flow over raw addFlowStageHook calls
// ---------------------------------------------------------------------------

test("no source file outside core calls addFlowStageHook directly", async () => {
    const allFiles = [
        ...(await findTypeScriptFiles(path.join(sourceRoot, "gateways"))),
        ...(await findTypeScriptFiles(path.join(sourceRoot, "adapters"))),
        ...(await findTypeScriptFiles(path.join(sourceRoot, "api"))),
        ...(await findTypeScriptFiles(path.join(sourceRoot, "modules"))),
    ].filter(
        (file) =>
            file !== path.resolve(import.meta.dirname, "ctx-boundary.test.ts"),
    );

    const pattern = /\.addFlowStageHook\(/;

    const violations: string[] = [];
    for (const file of allFiles) {
        const source = await readFile(file, "utf8");
        if (pattern.test(source)) {
            violations.push(path.relative(sourceRoot, file));
        }
    }

    assert.deepEqual(
        violations,
        [],
        "Use ctx.flow.extend() instead of calling addFlowStageHook() directly.",
    );
});
