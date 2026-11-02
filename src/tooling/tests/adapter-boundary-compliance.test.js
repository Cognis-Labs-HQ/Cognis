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

function extractImports(source) {
    const imports = [];
    for (const match of source.matchAll(
        /(?:^|\n)\s*(?:import|export)\s+(type\s+)?[\w*\s{},]+\s+from\s+["']([^"']+)["']/g,
    ))
        imports.push({ path: match[2], typeOnly: Boolean(match[1]) });
    for (const pattern of [
        /(?:^|\n)\s*import\s+["']([^"']+)["']/g,
        /\bimport\(\s*["']([^"']+)["']\s*\)/g,
    ])
        for (const match of source.matchAll(pattern))
            imports.push({ path: match[1], typeOnly: false });
    return imports;
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
        const imports = extractImports(source);
        for (const { path: importPath, typeOnly } of imports) {
            if (!importPath.startsWith(".")) continue;

            const resolvedImportPath = resolve(dirname(filePath), importPath);
            const adapterOwner = resolveAdapterOwner(resolvedImportPath);
            if (!adapterOwner) continue;
            if (sourceOwnsAdapterImport(filePath, adapterOwner)) continue;
            const contractRoot = `${normalizePath(resolve(adapterOwner.adapterRoot, "contracts"))}/`;
            if (
                typeOnly &&
                normalizePath(resolvedImportPath).startsWith(contractRoot)
            )
                continue;

            violations.push(
                `${relative(ROOT, filePath).replace(/\\/g, "/")} -> ${relative(ROOT, resolvedImportPath).replace(/\\/g, "/")}`,
            );
        }
    }

    assert.deepEqual(
        violations,
        [],
        [
            "Runtime adapter imports are forbidden outside the adapter itself and its owning gateway; only type-only public contracts may cross that boundary.",
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

test("adapter import classification keeps value and dynamic imports distinct from public authoring types", () => {
    assert.deepEqual(
        extractImports(`import type { Contract } from "./contracts/api.js";
import { execute } from "./contracts/api.js";
const load = () => import("./contracts/api.js");`),
        [
            { path: "./contracts/api.js", typeOnly: true },
            { path: "./contracts/api.js", typeOnly: false },
            { path: "./contracts/api.js", typeOnly: false },
        ],
    );
});
