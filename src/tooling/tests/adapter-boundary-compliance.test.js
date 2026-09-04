import test from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";

const ROOT = process.cwd();
const SRC_ROOT = resolve(ROOT, "src");
const ADAPTERS_ROOT = resolve(SRC_ROOT, "adapters");
const GATEWAYS_ROOT = resolve(SRC_ROOT, "gateways");
const SOURCE_EXTENSIONS = [".js", ".mjs", ".ts"];

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

function hasSourceExtension(filePath) {
    return SOURCE_EXTENSIONS.some((extension) => filePath.endsWith(extension));
}

function normalizePath(filePath) {
    return filePath.replace(/\\/g, "/");
}

function extractImportPaths(source) {
    const paths = new Set();
    const patterns = [
        /(?:^|\n)\s*import\s+["']([^"']+)["']/g,
        /(?:^|\n)\s*(?:import|export)\s+(?:type\s+)?(?:[\w*\s{},]+)\s+from\s+["']([^"']+)["']/g,
        /\bimport\(\s*["']([^"']+)["']\s*\)/g,
    ];

    for (const pattern of patterns) {
        let match;
        pattern.lastIndex = 0;
        while ((match = pattern.exec(source)) !== null) {
            paths.add(match[1]);
        }
    }
    return Array.from(paths);
}

function resolveAdapterOwner(filePath) {
    const normalizedFilePath = normalizePath(filePath);
    const normalizedAdaptersRoot = `${normalizePath(ADAPTERS_ROOT)}/`;
    if (!normalizedFilePath.startsWith(normalizedAdaptersRoot)) {
        return null;
    }
    const relativePath = normalizedFilePath.slice(
        normalizedAdaptersRoot.length,
    );
    const [gatewayId, adapterId] = relativePath.split("/");
    if (!gatewayId || !adapterId) {
        return null;
    }
    return {
        gatewayId,
        adapterId,
        adapterRoot: resolve(ADAPTERS_ROOT, gatewayId, adapterId),
    };
}

function sourceOwnsAdapterImport(sourceFilePath, adapterOwner) {
    const normalizedSourceFilePath = normalizePath(sourceFilePath);
    const normalizedAdapterRoot = `${normalizePath(adapterOwner.adapterRoot)}/`;
    if (normalizedSourceFilePath.startsWith(normalizedAdapterRoot)) {
        return true;
    }

    const owningGatewayRoot = `${normalizePath(resolve(GATEWAYS_ROOT, adapterOwner.gatewayId))}/`;
    return normalizedSourceFilePath.startsWith(owningGatewayRoot);
}

test("direct adapter imports stay inside the owning gateway or adapter", () => {
    const violations = [];

    for (const filePath of walk(SRC_ROOT)) {
        if (!hasSourceExtension(filePath)) continue;
        if (normalizePath(filePath).includes("/tests/")) continue;

        const source = readFileSync(filePath, "utf8");
        const importPaths = extractImportPaths(source);
        for (const importPath of importPaths) {
            if (!importPath.startsWith(".")) continue;

            const resolvedImportPath = resolve(dirname(filePath), importPath);
            const adapterOwner = resolveAdapterOwner(resolvedImportPath);
            if (!adapterOwner) continue;
            if (sourceOwnsAdapterImport(filePath, adapterOwner)) continue;

            violations.push(
                `${relative(ROOT, filePath).replace(/\\/g, "/")} -> ${relative(ROOT, resolvedImportPath).replace(/\\/g, "/")}`,
            );
        }
    }

    assert.deepEqual(
        violations,
        [],
        [
            "Direct adapter imports are forbidden outside the adapter itself and its owning gateway.",
            "Use the gateway or ctx capabilities instead of reaching into a concrete adapter.",
            ...violations,
        ].join("\n"),
    );
});

test("raw SQL execution stays inside the database gateway boundary", () => {
    const violations = [];
    const databaseGatewayRoot = `${normalizePath(resolve(GATEWAYS_ROOT, "db"))}/`;
    const databaseAdaptersRoot = `${normalizePath(resolve(ADAPTERS_ROOT, "db"))}/`;

    for (const filePath of walk(SRC_ROOT)) {
        if (!hasSourceExtension(filePath)) continue;
        const normalizedFilePath = normalizePath(filePath);
        if (normalizedFilePath.includes("/tests/")) continue;
        if (normalizedFilePath.startsWith(databaseGatewayRoot)) continue;
        if (
            normalizedFilePath.startsWith(databaseAdaptersRoot) &&
            normalizedFilePath.endsWith("/index.ts")
        ) {
            continue;
        }

        const source = readFileSync(filePath, "utf8");
        if (/\.execute\s*\(/.test(source)) {
            violations.push(relative(ROOT, filePath).replace(/\\/g, "/"));
        }
    }

    assert.deepEqual(
        violations,
        [],
        [
            "Raw SQL execution is restricted to the database gateway and owning adapter executors.",
            "Consumers must use executeCommand(), ensureTable(), or transaction() from the DB gateway capability.",
        ].join("\n"),
    );
});
