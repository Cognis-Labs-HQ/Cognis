import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, relative, resolve, sep } from "node:path";

const ROOT = resolve(import.meta.dirname, "../../..");
const SOURCE_ROOTS = ["src/ui", "src/gateways", "src/adapters", "src/modules"];
const IMPORT_PATTERN =
    /^\s*(?:import|export)\s+(?:[^"']*?\s+from\s+)?["']([^"']+)["']/gm;
const DYNAMIC_IMPORT_PATTERN = /\bimport\(\s*["']([^"']+)["']\s*\)/g;
const COMPONENT_LANGUAGE_PATTERN =
    /["'](\/static\/adapters\/[^"']+\/languages)["']/g;

function collectJavaScriptFiles(directory) {
    return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
        const entryPath = resolve(directory, entry.name);
        if (entry.isDirectory()) {
            if (["node_modules", "tests"].includes(entry.name)) return [];
            return collectJavaScriptFiles(entryPath);
        }
        if (!entry.isFile() || !entry.name.endsWith(".js")) return [];
        const repositoryPath = relative(ROOT, entryPath).split(sep);
        return repositoryPath[1] === "ui" || repositoryPath.includes("ui")
            ? [entryPath]
            : [];
    });
}

function resolveStaticPath(staticPath) {
    const pathParts = staticPath.split("/").filter(Boolean);
    if (pathParts[0] !== "static") return null;
    if (["reuse", "layouts", "app", "styles"].includes(pathParts[1])) {
        return resolve(ROOT, "src/ui", ...pathParts.slice(1));
    }
    const surface = pathParts[1];
    if (surface === "gateways") {
        const componentRoot = resolve(ROOT, "src/gateways", pathParts[2]);
        const remainder = pathParts.slice(3);
        return [
            resolve(componentRoot, "ui", ...remainder),
            resolve(componentRoot, ...remainder),
        ].find(existsSync);
    }
    if (surface === "adapters") {
        const componentRoot = resolve(
            ROOT,
            "src/adapters",
            pathParts[2],
            pathParts[3],
        );
        const remainder = pathParts.slice(4);
        return [
            resolve(componentRoot, "ui", ...remainder),
            resolve(componentRoot, ...remainder),
        ].find(existsSync);
    }
    if (surface === "modules") {
        const componentRoot = resolve(ROOT, "src/modules", pathParts[2]);
        const remainder = pathParts.slice(3);
        return [
            resolve(componentRoot, "ui", ...remainder),
            resolve(componentRoot, ...remainder),
        ].find(existsSync);
    }
    return null;
}

function getAdapterOwner(filePath) {
    const repositoryPath = relative(ROOT, filePath).split(sep);
    if (repositoryPath[1] !== "adapters") return null;
    return `${repositoryPath[2]}/${repositoryPath[3]}`;
}

function getStaticAdapterOwner(staticPath) {
    const match = staticPath.match(/^\/static\/adapters\/([^/]+)\/([^/]+)/);
    return match ? `${match[1]}/${match[2]}` : null;
}

function getLocalImportRoot(filePath) {
    const repositoryPath = relative(ROOT, filePath).split(sep);
    if (repositoryPath[1] !== "adapters") return null;
    return resolve(ROOT, ...repositoryPath.slice(0, 5));
}

function isWithin(directory, filePath) {
    const pathFromDirectory = relative(directory, filePath);
    return (
        pathFromDirectory === "" ||
        (!pathFromDirectory.startsWith(`..${sep}`) &&
            pathFromDirectory !== "..")
    );
}

test("browser imports resolve and use consistent path forms", () => {
    const failures = [];
    const files = SOURCE_ROOTS.flatMap((sourceRoot) =>
        collectJavaScriptFiles(resolve(ROOT, sourceRoot)),
    );

    for (const filePath of files) {
        const source = readFileSync(filePath, "utf8");
        const importPaths = [
            ...source.matchAll(IMPORT_PATTERN),
            ...source.matchAll(DYNAMIC_IMPORT_PATTERN),
        ].map((match) => match[1]);
        for (const importPath of importPaths) {
            let targetPath = null;
            if (importPath.startsWith(".")) {
                targetPath = resolve(dirname(filePath), importPath);
                if (!existsSync(targetPath) || !statSync(targetPath).isFile()) {
                    failures.push(
                        `${relative(ROOT, filePath)}: ${importPath} does not resolve`,
                    );
                }
                continue;
            }
            if (!importPath.startsWith("/static/")) continue;
            targetPath = resolveStaticPath(importPath);
            if (!targetPath || !statSync(targetPath).isFile()) {
                failures.push(
                    `${relative(ROOT, filePath)}: ${importPath} is not served by the app`,
                );
                continue;
            }
            const localImportRoot = getLocalImportRoot(filePath);
            if (localImportRoot && isWithin(localImportRoot, targetPath)) {
                failures.push(
                    `${relative(ROOT, filePath)}: ${importPath} must be relative within its UI package`,
                );
            }
            const sourceAdapter = getAdapterOwner(filePath);
            const targetAdapter = getStaticAdapterOwner(importPath);
            if (
                sourceAdapter &&
                targetAdapter &&
                sourceAdapter !== targetAdapter
            ) {
                failures.push(
                    `${relative(ROOT, filePath)}: ${importPath} depends on an independently disabled adapter`,
                );
            }
        }

        for (const match of source.matchAll(COMPONENT_LANGUAGE_PATTERN)) {
            const languageBasePath = match[1];
            const englishStringsPath = resolveStaticPath(
                `${languageBasePath}/en/strings.xml`,
            );
            if (!englishStringsPath) {
                failures.push(
                    `${relative(ROOT, filePath)}: ${languageBasePath} has no served English strings`,
                );
            }
            const sourceAdapter = getAdapterOwner(filePath);
            const targetAdapter = getStaticAdapterOwner(languageBasePath);
            if (
                sourceAdapter &&
                targetAdapter &&
                sourceAdapter !== targetAdapter
            ) {
                failures.push(
                    `${relative(ROOT, filePath)}: ${languageBasePath} depends on an independently disabled adapter`,
                );
            }
        }
    }

    assert.deepEqual(failures, []);
});
