import test from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";

const ROOT = process.cwd();
const COPILOT_INSTRUCTIONS_PATH = resolve(
    ROOT,
    ".github/copilot-instructions.md",
);

function walk(directoryPath) {
    const files = [];
    for (const entryName of readdirSync(directoryPath)) {
        const entryPath = join(directoryPath, entryName);
        const entryStats = statSync(entryPath);
        if (entryStats.isDirectory()) {
            files.push(...walk(entryPath));
            continue;
        }
        files.push(entryPath);
    }
    return files;
}

function walkDirectories(directoryPath) {
    const directories = [];
    for (const entryName of readdirSync(directoryPath)) {
        const entryPath = join(directoryPath, entryName);
        const entryStats = statSync(entryPath);
        if (!entryStats.isDirectory()) continue;
        directories.push(entryPath);
        directories.push(...walkDirectories(entryPath));
    }
    return directories;
}

function normalizePath(filePath) {
    return filePath.replace(/\\/g, "/");
}

function collectMissingIndexViolations({
    rootPath,
    indexFileName,
    flatEntryViolation,
    missingIndexViolation,
}) {
    const violations = [];
    for (const entryName of readdirSync(rootPath)) {
        const entryPath = join(rootPath, entryName);
        const entryStats = statSync(entryPath);

        if (entryStats.isFile() && flatEntryViolation) {
            const violation = flatEntryViolation(entryName);
            if (violation) violations.push(violation);
            continue;
        }

        if (!entryStats.isDirectory()) continue;

        const indexPath = join(entryPath, indexFileName);
        try {
            if (!statSync(indexPath).isFile()) {
                violations.push(missingIndexViolation(entryName));
            }
        } catch {
            violations.push(missingIndexViolation(entryName));
        }
    }
    return violations;
}

const SOURCE_EXTENSIONS = new Set([".js", ".ts", ".css", ".html"]);

const LEGACY_FLAT_UI_APP_ENTRIES = new Set([
    "src/adapters/social/messages/ui/app.js",
    "src/adapters/social/profile/ui/app.js",
    "src/adapters/study/classes/ui/app.js",
]);

function hasSourceExtension(filePath) {
    return Array.from(SOURCE_EXTENSIONS).some((extension) =>
        filePath.endsWith(extension),
    );
}

function extractImportPaths(source) {
    const importPaths = new Set();
    const patterns = [
        /(?:^|\n)\s*import\s+["']([^"']+)["']/g,
        /(?:^|\n)\s*(?:import|export)\s+(?:type\s+)?(?:[\w*\s{},]+)\s+from\s+["']([^"']+)["']/g,
        /(?:^|\n)\s*export\s+\*\s+from\s+["']([^"']+)["']/g,
        /\bimport\(\s*["']([^"']+)["']\s*\)/g,
    ];

    for (const pattern of patterns) {
        let match;
        pattern.lastIndex = 0;
        while ((match = pattern.exec(source)) !== null) {
            importPaths.add(match[1]);
        }
    }

    return Array.from(importPaths);
}

const FORBIDDEN_COMPONENT_IMPORT_ROOTS = [
    normalizePath(resolve(ROOT, "src/gateways")),
    normalizePath(resolve(ROOT, "src/adapters")),
];

function isDirectComponentImport(sourceFilePath, importPath) {
    if (importPath.startsWith(".")) {
        const resolvedImportPath = resolve(dirname(sourceFilePath), importPath);
        const normalizedImportPath = normalizePath(resolvedImportPath);
        return FORBIDDEN_COMPONENT_IMPORT_ROOTS.some(
            (forbiddenRoot) =>
                normalizedImportPath === forbiddenRoot ||
                normalizedImportPath.startsWith(`${forbiddenRoot}/`),
        );
    }

    return (
        importPath.startsWith("/static/gateways/") ||
        importPath.startsWith("/static/adapters/")
    );
}

test("source files stay under the 1000-line guardrail", () => {
    const hits = [];
    for (const filePath of walk(resolve(ROOT, "src"))) {
        if (!hasSourceExtension(filePath)) continue;
        const repoPath = relative(ROOT, filePath).replace(/\\/g, "/");
        const lineCount = readFileSync(filePath, "utf8").split("\n").length;
        if (lineCount <= 1000) continue;
        hits.push(`${repoPath} (${lineCount} lines)`);
    }

    assert.deepEqual(
        hits,
        [],
        `Files above 1000 lines must be split into subdirectories:\n${hits.join("\n")}`,
    );
});

test("anti-monolith guardrail warns above 1250 LOC and fails above 1750 LOC", () => {
    const warningHits = [];
    const failureHits = [];

    for (const filePath of walk(resolve(ROOT, "src"))) {
        if (!hasSourceExtension(filePath)) continue;
        const repoPath = relative(ROOT, filePath).replace(/\\/g, "/");
        const lineCount = readFileSync(filePath, "utf8").split("\n").length;
        if (lineCount > 1250) {
            warningHits.push(`${repoPath} (${lineCount} lines)`);
        }
        if (lineCount > 1750) {
            failureHits.push(`${repoPath} (${lineCount} lines)`);
        }
    }

    if (warningHits.length > 0) {
        console.warn(
            [
                "Anti-monolith warning: files above 1250 LOC should be split.",
                "Create a directory with index.js and break logic into purpose-named files.",
                ...warningHits,
            ].join("\n"),
        );
    }

    assert.deepEqual(
        failureHits,
        [],
        [
            "Anti-monolith guardrail failure: files above 1750 LOC are forbidden.",
            "Create a directory with index.js and break logic into purpose-named files.",
            ...failureHits,
        ].join("\n"),
    );
});

test("ui app page entries use folder/index.js structure", () => {
    const appRoot = resolve(ROOT, "src/ui/app");
    const violations = collectMissingIndexViolations({
        rootPath: appRoot,
        indexFileName: "index.js",
        flatEntryViolation: (entryName) =>
            entryName.endsWith(".js")
                ? `flat page entry is not allowed: src/ui/app/${entryName}`
                : null,
        missingIndexViolation: (entryName) =>
            `missing index.js page entry: src/ui/app/${entryName}`,
    });

    assert.deepEqual(
        violations,
        [],
        `UI page structure violations found:\n${violations.join("\n")}`,
    );
});

test("api route handlers use domain/index.ts structure", () => {
    const routesRoot = resolve(ROOT, "src/api/routes");
    const violations = collectMissingIndexViolations({
        rootPath: routesRoot,
        indexFileName: "index.ts",
        flatEntryViolation: (entryName) =>
            `route entry must be directory: src/api/routes/${entryName}`,
        missingIndexViolation: (entryName) =>
            `missing route index.ts: src/api/routes/${entryName}`,
    });

    assert.deepEqual(
        violations,
        [],
        `API route structure violations found:\n${violations.join("\n")}`,
    );
});

test("module and adapter ui app entries use ui/app/index.js structure", () => {
    const scanRoots = [resolve(ROOT, "src/adapters")];
    const violations = [];

    for (const scanRoot of scanRoots) {
        for (const filePath of walk(scanRoot)) {
            const normalizedFilePath = filePath.replace(/\\/g, "/");
            if (!normalizedFilePath.endsWith("/ui/app.js")) continue;
            const repoPath = relative(ROOT, filePath).replace(/\\/g, "/");
            if (LEGACY_FLAT_UI_APP_ENTRIES.has(repoPath)) continue;
            violations.push(`flat ui app entry is not allowed: ${repoPath}`);
        }
    }

    assert.deepEqual(
        violations,
        [],
        `Module/adapter UI entry violations found:\n${violations.join("\n")}`,
    );
});

const ALLOWED_CORE_GATEWAY_IMPORT_FILES = new Set([
    "src/api/bootstrap/db-init.ts",
    "src/api/bootstrap/gateway.ts",
    "src/api/reuse/logger.ts",
    "src/api/main.ts",
    "src/api/reuse/route-context.ts",
    "src/core/index.ts",
]);

const GATEWAY_IMPORT_RE = /from\s+['\"](?:\.\.\/|\.\/)*\.\.\/gateways\//;

test("api and core avoid new direct gateway imports", () => {
    const scanRoots = [resolve(ROOT, "src/api"), resolve(ROOT, "src/core")];
    const violations = [];

    for (const scanRoot of scanRoots) {
        for (const filePath of walk(scanRoot)) {
            if (!filePath.endsWith(".ts") && !filePath.endsWith(".js"))
                continue;
            if (filePath.includes("/tests/")) continue;

            const repoPath = relative(ROOT, filePath).replace(/\\/g, "/");
            if (ALLOWED_CORE_GATEWAY_IMPORT_FILES.has(repoPath)) continue;

            const source = readFileSync(filePath, "utf8");
            if (GATEWAY_IMPORT_RE.test(source)) {
                violations.push(repoPath);
            }
        }
    }

    assert.deepEqual(
        violations,
        [],
        `Direct gateway imports in api/core must be removed and replaced by ctx/capabilities:\n${violations.join("\n")}`,
    );
});

test("route handlers and module routers avoid direct gateway or adapter imports", () => {
    const scanRoots = [resolve(ROOT, "src/api/routes")];
    const violations = [];

    for (const scanRoot of scanRoots) {
        for (const filePath of walk(scanRoot)) {
            if (!filePath.endsWith(".ts") && !filePath.endsWith(".js")) {
                continue;
            }
            if (normalizePath(filePath).includes("/tests/")) continue;

            const source = readFileSync(filePath, "utf8");
            const importPaths = extractImportPaths(source);
            const hasDirectComponentImport = importPaths.some((importPath) =>
                isDirectComponentImport(filePath, importPath),
            );
            if (!hasDirectComponentImport) continue;

            violations.push(normalizePath(relative(ROOT, filePath)));
        }
    }

    assert.deepEqual(
        violations,
        [],
        [
            "Route handlers and module routers must consume capabilities through route context instead of importing gateway or adapter internals.",
            ...violations,
        ].join("\n"),
    );
});

const REQUIRED_INSTRUCTION_SNIPPETS = [
    "Use `ctx` as the only cross-component import surface for both core-to-component and inter-component interactions.",
    "A gateway is the only component that may interact directly with its adapters.",
    "Never name such a directory `shared/`, `utils/`, `helpers/`, or `common/`",
    'For gateway-owned API spaces, each gateway must claim its canonical API prefix with `ctx.routeRegistry.registerPrefix("/api/v1/<gateway-id>", "<gateway-id>")` during bootstrap,',
    "Adding thousands of lines in a pull request is **not** an indicator of quality, velocity, or correctness.",
    "Any safe opportunity to reduce LOC through consolidation and reusable abstractions should be taken",
    "Move code out of `reuse/` when it only serves one feature surface; keep `reuse/` strictly cross-cutting.",
    "Keep HTML and JS/TS in separate files; do not embed page markup as feature-sized string templates in JS/TS modules.",
    "Runtime extension modules must use a consistent root layout:",
    "Version updates are atomic repository-wide changes.",
];

test("ai instructions keep the compliance guardrails explicit", () => {
    const source = readFileSync(COPILOT_INSTRUCTIONS_PATH, "utf8");
    for (const snippet of REQUIRED_INSTRUCTION_SNIPPETS) {
        assert.ok(
            source.includes(snippet),
            `missing required instruction snippet: ${snippet}`,
        );
    }
});

const GATEWAY_COMPLIANCE_EXEMPTIONS = new Set(["db", "reuse", "tests"]);

test("gateways with API routes claim canonical /api/v1/<gateway-id> prefixes", () => {
    const gatewaysRoot = resolve(ROOT, "src/gateways");
    const violations = [];

    for (const entryName of readdirSync(gatewaysRoot)) {
        if (GATEWAY_COMPLIANCE_EXEMPTIONS.has(entryName)) continue;

        const gatewayPath = join(gatewaysRoot, entryName);
        const gatewayStats = statSync(gatewayPath);
        if (!gatewayStats.isDirectory()) continue;

        const sourceFiles = walk(gatewayPath).filter(
            (filePath) =>
                (filePath.endsWith(".js") || filePath.endsWith(".ts")) &&
                !filePath.includes("/tests/"),
        );
        const hasRouteRegistration = sourceFiles.some((filePath) =>
            readFileSync(filePath, "utf8").includes("routeRegistry.register("),
        );
        if (!hasRouteRegistration) continue;

        const canonicalPrefixSnippet = `ctx.routeRegistry.registerPrefix("/api/v1/${entryName}", "${entryName}")`;
        const hasCanonicalPrefix = sourceFiles.some((filePath) =>
            readFileSync(filePath, "utf8").includes(canonicalPrefixSnippet),
        );
        if (!hasCanonicalPrefix) {
            violations.push(
                `${entryName} gateway must register ${canonicalPrefixSnippet}; see ${relative(ROOT, gatewayPath).replace(/\\/g, "/")}`,
            );
        }
    }

    assert.deepEqual(
        violations,
        [],
        [
            "Gateway route prefixes must match their canonical /api/v1/<gateway-id> ownership.",
            ...violations,
        ].join("\n"),
    );
});

test("adapter directories do not introduce internal reuse folders", () => {
    const adaptersRoot = resolve(ROOT, "src/adapters");
    const violations = [];

    for (const filePath of walk(adaptersRoot)) {
        const normalizedFilePath = filePath.replace(/\\/g, "/");
        if (!normalizedFilePath.includes("/reuse/")) continue;
        violations.push(relative(ROOT, filePath).replace(/\\/g, "/"));
    }

    assert.deepEqual(
        violations,
        [],
        `Adapters must keep adapter-local logic at adapter root instead of reuse/:\n${violations.join("\n")}`,
    );
});

test("source tree avoids generic helper directory names", () => {
    const forbiddenDirectoryNames = new Set([
        "shared",
        "utils",
        "helpers",
        "common",
    ]);
    const violations = walkDirectories(resolve(ROOT, "src"))
        .map((directoryPath) =>
            relative(ROOT, directoryPath).replace(/\\/g, "/"),
        )
        .filter((directoryPath) =>
            forbiddenDirectoryNames.has(directoryPath.split("/").at(-1)),
        );

    assert.deepEqual(
        violations,
        [],
        [
            "Use `reuse/` instead of generic helper directory names under src.",
            ...violations,
        ].join("\n"),
    );
});

test("internal dependency ceilings include local workspace versions", () => {
    const packagePaths = [
        resolve(ROOT, "package.json"),
        ...walk(resolve(ROOT, "src")),
    ].filter((filePath) => filePath.endsWith("package.json"));
    const packages = packagePaths.map((filePath) => ({
        filePath,
        manifest: JSON.parse(readFileSync(filePath, "utf8")),
    }));
    const localVersions = new Map(
        packages
            .filter(({ manifest }) => manifest.name && manifest.version)
            .map(({ manifest }) => [manifest.name, manifest.version]),
    );
    const violations = [];
    const isVersionIncluded = (versionRange, localVersion) => {
        if (!versionRange.startsWith("<=")) return false;
        const ceilingParts = versionRange.slice(2).split(".").map(Number);
        const localParts = localVersion.split(".").map(Number);
        for (let i = 0; i < 3; i += 1) {
            if (localParts[i] < ceilingParts[i]) return true;
            if (localParts[i] > ceilingParts[i]) return false;
        }
        return true;
    };

    for (const { filePath, manifest } of packages) {
        for (const dependencyGroup of [
            manifest.dependencies,
            manifest.devDependencies,
            manifest.optionalDependencies,
        ]) {
            for (const [dependencyName, versionRange] of Object.entries(
                dependencyGroup ?? {},
            )) {
                const localVersion = localVersions.get(dependencyName);
                if (
                    !localVersion ||
                    isVersionIncluded(versionRange, localVersion)
                ) {
                    continue;
                }
                violations.push(
                    `${normalizePath(relative(ROOT, filePath))}: ${dependencyName} ${versionRange} excludes local ${localVersion}`,
                );
            }
        }
    }

    assert.deepEqual(
        violations,
        [],
        `Internal dependency ceilings must match tested workspace versions:\n${violations.join("\n")}`,
    );
});

test("component versions match manifests, lockfile, and translated indexes", () => {
    const packagePaths = walk(resolve(ROOT, "src")).filter((filePath) =>
        filePath.endsWith("package.json"),
    );
    const packageVersionsByPath = new Map();
    const violations = [];

    for (const packagePath of packagePaths) {
        const packageManifest = JSON.parse(readFileSync(packagePath, "utf8"));
        const componentPath = dirname(packagePath);
        packageVersionsByPath.set(
            `${normalizePath(relative(ROOT, componentPath))}/`,
            packageManifest.version,
        );
        const adjacentManifestPath = resolve(componentPath, "manifest.json");
        try {
            const adjacentManifest = JSON.parse(
                readFileSync(adjacentManifestPath, "utf8"),
            );
            if (adjacentManifest.version !== packageManifest.version) {
                violations.push(
                    `${normalizePath(relative(ROOT, adjacentManifestPath))}: ${adjacentManifest.version} != ${packageManifest.version}`,
                );
            }
        } catch (error) {
            if (error?.code !== "ENOENT") throw error;
        }
    }

    const lockfile = JSON.parse(
        readFileSync(resolve(ROOT, "package-lock.json"), "utf8"),
    );
    for (const [componentPath, version] of packageVersionsByPath) {
        const lockEntry = lockfile.packages?.[componentPath.slice(0, -1)];
        if (lockEntry && lockEntry.version !== version) {
            violations.push(
                `package-lock.json: ${componentPath} ${lockEntry.version} != ${version}`,
            );
        }
    }

    for (const language of ["de", "en", "id", "ja"]) {
        const versionsPath = resolve(ROOT, `src/docs/versions.${language}.md`);
        const source = readFileSync(versionsPath, "utf8");
        for (const [componentPath, version] of packageVersionsByPath) {
            if (!source.includes(`\`${componentPath}\``)) continue;
            const escapedPath = componentPath.replace(
                /[.*+?^${}()|[\]\\]/g,
                "\\$&",
            );
            const rowPattern = new RegExp(
                `\\|[^\\n]*\\\`${escapedPath}\\\`[^\\n]*\\\`${version.replaceAll(".", "\\.")}\\\`[^\\n]*\\|`,
            );
            if (!rowPattern.test(source)) {
                violations.push(
                    `${normalizePath(relative(ROOT, versionsPath))}: ${componentPath} must report ${version}`,
                );
            }
        }
    }

    assert.deepEqual(
        violations,
        [],
        `Component versions must be synchronized repository-wide:\n${violations.join("\n")}`,
    );
});

test("html files keep scripts in external JS/TS files", () => {
    const violations = [];
    const scriptBlockRe = /<script\b([^>]*)>([\s\S]*?)<\/script(?:\s[^>]*)?>/gi;

    for (const filePath of walk(resolve(ROOT, "src"))) {
        if (!filePath.endsWith(".html")) continue;
        const source = readFileSync(filePath, "utf8");
        let match;
        scriptBlockRe.lastIndex = 0;
        while ((match = scriptBlockRe.exec(source))) {
            const attributes = match[1] ?? "";
            const body = match[2] ?? "";
            if (/\bsrc\s*=/.test(attributes)) continue;
            if (!body.trim()) continue;
            const repoPath = relative(ROOT, filePath).replace(/\\/g, "/");
            violations.push(repoPath);
            break;
        }
    }

    assert.deepEqual(
        violations,
        [],
        `Inline html script blocks are forbidden; move logic to JS/TS files:\n${violations.join("\n")}`,
    );
});
