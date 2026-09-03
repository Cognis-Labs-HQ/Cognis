import test from "node:test";
import assert from "node:assert/strict";
import { dirname, resolve, join } from "node:path";
import { fileURLToPath } from "node:url";
import { readdirSync, readFileSync, statSync } from "node:fs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../../../../..");
const SOCIAL_MESSAGES_BASE = "/api/v1/social/messages";
const SEARCH_SOURCE = readFileSync(
    resolve(ROOT, "src/adapters/social/messages/ui/search/index.js"),
    "utf8",
);
const APP_SOURCE = readFileSync(
    resolve(ROOT, "src/adapters/social/messages/ui/app.js"),
    "utf8",
);

test("messages leaves host provider and navbar loading to the shared page lifecycle", () => {
    assert.doesNotMatch(APP_SOURCE, /ensureUiProvidersLoaded/);
    assert.doesNotMatch(APP_SOURCE, /ensureNavbarPluginsLoaded/);
});

test("global message search imports its authenticated API client", () => {
    assert.match(
        SEARCH_SOURCE,
        /import \{ apiFetch \} from "\/static\/reuse\/api-client\.js";/,
    );
});

function collectFilePathsRecursively(directoryPath) {
    const files = [];
    for (const entryName of readdirSync(directoryPath)) {
        const entryPath = join(directoryPath, entryName);
        const entryStats = statSync(entryPath);
        if (entryStats.isDirectory()) {
            files.push(...collectFilePathsRecursively(entryPath));
            continue;
        }
        files.push(entryPath);
    }
    return files;
}

function extractSocialMessagesApiPaths(source) {
    const matchedPaths = new Set();
    const normalizedSource = source.replace(/\\\//g, "/");
    const pattern = /\/api\/v1\/social\/messages[\w/-]*/g;
    let match;
    while ((match = pattern.exec(normalizedSource)) !== null) {
        const normalizedPath = match[0].replace(/\/+$/, "");
        if (normalizedPath.startsWith(SOCIAL_MESSAGES_BASE)) {
            matchedPaths.add(normalizedPath);
        }
    }
    return matchedPaths;
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

function isUiSourceFile(filePath) {
    if (!filePath.includes("/ui/")) return false;
    if (filePath.includes("/tests/")) return false;
    return (
        filePath.endsWith(".js") ||
        filePath.endsWith(".ts") ||
        filePath.endsWith(".mjs")
    );
}

const ROUTE_FILE_PATHS = collectFilePathsRecursively(
    resolve(ROOT, "src/adapters/social/messages/routes"),
).filter((filePath) => filePath.endsWith(".ts") || filePath.endsWith(".js"));
const CALLER_FILE_PATHS = [
    ...collectFilePathsRecursively(resolve(ROOT, "src/adapters")).filter(
        isUiSourceFile,
    ),
];

test("social messages UI callers only reference defined API routes", () => {
    const calledPaths = collectPaths(CALLER_FILE_PATHS);
    const definedPaths = collectPaths(ROUTE_FILE_PATHS);
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
    const calledPaths = collectPaths(CALLER_FILE_PATHS);
    const definedPaths = collectPaths(ROUTE_FILE_PATHS).filter(
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

const ROOM_RENDER_SOURCE = readFileSync(
    resolve(ROOT, "src/adapters/social/messages/ui/room-render.js"),
    "utf8",
);
const VOIP_SOURCE = readFileSync(
    resolve(ROOT, "src/adapters/social/messages/ui/voip.js"),
    "utf8",
);
const ROOM_STATE_SOURCE = readFileSync(
    resolve(ROOT, "src/adapters/social/messages/ui/room-state.js"),
    "utf8",
);

test("messages offers provider-neutral VoIP calling only when supplied", () => {
    assert.match(VOIP_SOURCE, /VOIP_PROVIDER_CAPABILITY = "voip:startCall"/);
    assert.match(VOIP_SOURCE, /uiCtx\.registerFlow\(FLOW_ID/);
    assert.match(VOIP_SOURCE, /supportedActions: \["component", "navigate"\]/);
    assert.match(VOIP_SOURCE, /resolveRoomCallAction/);
    assert.match(VOIP_SOURCE, /component-pages:spawn/);
    assert.match(VOIP_SOURCE, /ui:navigate/);
    assert.match(VOIP_SOURCE, /removeStageOnDiscard: true/);
    assert.match(VOIP_SOURCE, /threadList\.before\(stage\)/);
    assert.match(VOIP_SOURCE, /messages-voip-pip-button btn-neutral/);
    assert.match(VOIP_SOURCE, /handle\.restoreHostLayout\?\.\(\)/);
    assert.match(VOIP_SOURCE, /room\.members/);
    assert.match(ROOM_STATE_SOURCE, /await resolveCallAction\(room\)/);
    assert.match(
        ROOM_STATE_SOURCE,
        /showCallAction: Boolean\(selectedCallAction\)/,
    );
    assert.match(ROOM_RENDER_SOURCE, /showCallAction && \["dm", "group"\]/);
    assert.match(ROOM_RENDER_SOURCE, /messages-room-call-btn btn-confirm/);
    assert.match(ROOM_RENDER_SOURCE, /<svg viewBox="0 0 24 24"/);
});
