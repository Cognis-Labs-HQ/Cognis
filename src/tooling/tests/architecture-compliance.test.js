import test from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, resolve } from "node:path";

const ROOT = process.cwd();

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

const GRANDFATHERED_LARGE_FILES = new Set([
    "src/adapters/social/messages/routes.ts",
    "src/adapters/social/messages/store.ts",
    "src/adapters/social/messages/ui/app.js",
    "src/adapters/social/profile/ui/app.js",
    "src/adapters/social/profile/ui/profile.css",
    "src/adapters/study/classes/store.ts",
    "src/api/tests/ui/ui-routes.test.ts",
    "src/gateways/auth/bootstrap.ts",
    "src/gateways/auth/tests/auth-gateway.test.ts",
    "src/gateways/notify/bootstrap.ts",
    "src/modules/jitsi-meet/api/index.js",
    "src/modules/jitsi-meet/ui/app.js",
    "src/tooling/cli/index.ts",
    "src/ui/app/administration/index.js",
    "src/ui/reuse/page-composer.js",
    "src/ui/styles/page-builder.css",
]);

const SOURCE_EXTENSIONS = new Set([".js", ".ts", ".css", ".html"]);

function hasSourceExtension(filePath) {
    return Array.from(SOURCE_EXTENSIONS).some((extension) =>
        filePath.endsWith(extension),
    );
}

test("source files stay under the 1000-line guardrail", () => {
    const hits = [];
    for (const filePath of walk(resolve(ROOT, "src"))) {
        if (!hasSourceExtension(filePath)) continue;
        const repoPath = relative(ROOT, filePath).replace(/\\/g, "/");
        const lineCount = readFileSync(filePath, "utf8").split("\n").length;
        if (lineCount <= 1000) continue;
        if (GRANDFATHERED_LARGE_FILES.has(repoPath)) continue;
        hits.push(`${repoPath} (${lineCount} lines)`);
    }

    assert.deepEqual(
        hits,
        [],
        `Files above 1000 lines must be split into subdirectories:\n${hits.join("\n")}`,
    );
});

test("ui app page entries use folder/index.js structure", () => {
    const appRoot = resolve(ROOT, "src/ui/app");
    const violations = [];

    for (const entryName of readdirSync(appRoot)) {
        const entryPath = join(appRoot, entryName);
        const entryStats = statSync(entryPath);

        if (entryStats.isFile() && entryName.endsWith(".js")) {
            violations.push(
                `flat page entry is not allowed: src/ui/app/${entryName}`,
            );
            continue;
        }

        if (!entryStats.isDirectory()) continue;

        const indexPath = join(entryPath, "index.js");
        try {
            const indexStats = statSync(indexPath);
            if (!indexStats.isFile()) {
                violations.push(
                    `missing index.js page entry: src/ui/app/${entryName}`,
                );
            }
        } catch {
            violations.push(
                `missing index.js page entry: src/ui/app/${entryName}`,
            );
        }
    }

    assert.deepEqual(
        violations,
        [],
        `UI page structure violations found:\n${violations.join("\n")}`,
    );
});

test("api route handlers use domain/index.ts structure", () => {
    const routesRoot = resolve(ROOT, "src/api/routes");
    const violations = [];

    for (const entryName of readdirSync(routesRoot)) {
        const entryPath = join(routesRoot, entryName);
        const entryStats = statSync(entryPath);

        if (!entryStats.isDirectory()) {
            violations.push(
                `route entry must be directory: src/api/routes/${entryName}`,
            );
            continue;
        }

        const indexPath = join(entryPath, "index.ts");
        try {
            const indexStats = statSync(indexPath);
            if (!indexStats.isFile()) {
                violations.push(
                    `missing route index.ts: src/api/routes/${entryName}`,
                );
            }
        } catch {
            violations.push(
                `missing route index.ts: src/api/routes/${entryName}`,
            );
        }
    }

    assert.deepEqual(
        violations,
        [],
        `API route structure violations found:\n${violations.join("\n")}`,
    );
});

const ALLOWED_CORE_GATEWAY_IMPORT_FILES = new Set([
    "src/api/bootstrap/db-init.ts",
    "src/api/gateway-bootstrap.ts",
    "src/api/logger.ts",
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
