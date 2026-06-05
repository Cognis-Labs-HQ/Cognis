import test from "node:test";
import assert from "node:assert/strict";
import { dirname, resolve, join } from "node:path";
import { fileURLToPath } from "node:url";
import { readdirSync, readFileSync, statSync } from "node:fs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../../../../..");
const SOCIAL_MESSAGES_BASE = "/api/v1/social/messages";

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

function extractSocialMessagesApiPaths(source) {
    const extracted = new Set();
    const normalizedSource = source.replace(/\\\//g, "/");
    const pattern = /\/api\/v1\/social\/messages[\w/-]*/g;
    let match;
    while ((match = pattern.exec(normalizedSource)) !== null) {
        const normalizedPath = match[0].replace(/\/+$/, "");
        if (normalizedPath.startsWith(SOCIAL_MESSAGES_BASE)) {
            extracted.add(normalizedPath);
        }
    }
    return extracted;
}

function collectPaths(filePaths) {
    const paths = new Set();
    for (const filePath of filePaths) {
        const source = readFileSync(filePath, "utf8");
        for (const path of extractSocialMessagesApiPaths(source)) {
            paths.add(path);
        }
    }
    return [...paths].sort();
}

function hasRouteCoverage(firstPath, secondPath) {
    return (
        firstPath === secondPath ||
        firstPath.startsWith(`${secondPath}/`) ||
        secondPath.startsWith(`${firstPath}/`)
    );
}

const ROUTE_FILES = walk(resolve(ROOT, "src/adapters/social/messages/routes")).filter(
    (filePath) => filePath.endsWith(".ts") || filePath.endsWith(".js"),
);
const CALLER_FILES = [
    ...walk(resolve(ROOT, "src/adapters/social/messages/ui")).filter(
        (filePath) =>
            filePath.endsWith(".js") ||
            filePath.endsWith(".ts") ||
            filePath.endsWith(".mjs"),
    ),
    resolve(ROOT, "src/adapters/notify/internal/ui/navbar-plugin.js"),
    resolve(ROOT, "src/modules/jitsi-meet/ui/jitsi-chat.js"),
    resolve(ROOT, "src/adapters/social/profile/ui/profile-post-actions.js"),
];

test("social messages UI callers only reference defined API routes", () => {
    const calledPaths = collectPaths(CALLER_FILES);
    const definedPaths = collectPaths(ROUTE_FILES);
    const undefinedCalls = calledPaths.filter(
        (calledPath) =>
            !definedPaths.some((definedPath) =>
                hasRouteCoverage(calledPath, definedPath),
            ),
    );
    assert.deepEqual(
        undefinedCalls,
        [],
        `Undefined social messages API calls found:\n${undefinedCalls.join("\n")}`,
    );
});

test("social messages route definitions are referenced by UI callers", () => {
    const calledPaths = collectPaths(CALLER_FILES);
    const definedPaths = collectPaths(ROUTE_FILES).filter(
        (definedPath) => definedPath !== SOCIAL_MESSAGES_BASE,
    );
    const unusedDefinitions = definedPaths.filter(
        (definedPath) =>
            !calledPaths.some((calledPath) =>
                hasRouteCoverage(calledPath, definedPath),
            ),
    );
    assert.deepEqual(
        unusedDefinitions,
        [],
        `Unused social messages route definitions found:\n${unusedDefinitions.join("\n")}`,
    );
});
