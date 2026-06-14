import test from "node:test";
import assert from "node:assert/strict";
import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { tmpdir } from "node:os";

const ROOT = process.cwd();
const HELPER_PATH = resolve(
    ROOT,
    "src/adapters/study/classes/ui/classroom/profile-avatar.js",
);
const SOCIAL_HELPER_PATH = "/static/gateways/social/reuse/profile-avatar.js";
const AVATAR_UTILS_PATH = "/static/reuse/avatar-utils.js";
const ESCAPE_HTML_PATH = "/static/reuse/escape-html.js";

function createTempModulePath(prefix) {
    return resolve(
        tmpdir(),
        `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}.mjs`,
    );
}

async function importLoaderModule(replacementModuleUrl) {
    const helperSource = await readFile(HELPER_PATH, "utf8");
    const avatarUtilsModulePath = createTempModulePath(
        "classroom-avatar-utils",
    );
    const escapeHtmlModulePath = createTempModulePath("classroom-escape-html");
    await writeFile(
        avatarUtilsModulePath,
        [
            "export function getInitialsText(value) {",
            '    return String(value ?? "")',
            "        .split(/\\s+/)",
            "        .filter(Boolean)",
            '        .map((segment) => segment[0]?.toUpperCase() ?? "")',
            '        .join("")',
            "        .slice(0, 2);",
            "}",
            "export function pickInitialsColor() {",
            '    return "#123456";',
            "}",
            "",
        ].join("\n"),
        "utf8",
    );
    await writeFile(
        escapeHtmlModulePath,
        [
            "export function escapeHtml(value) {",
            '    return String(value ?? "");',
            "}",
            "",
        ].join("\n"),
        "utf8",
    );
    const rewrittenSource = helperSource
        .replace(SOCIAL_HELPER_PATH, replacementModuleUrl)
        .replace(AVATAR_UTILS_PATH, pathToFileURL(avatarUtilsModulePath).href)
        .replace(ESCAPE_HTML_PATH, pathToFileURL(escapeHtmlModulePath).href);
    const tempModulePath = createTempModulePath(
        "classroom-profile-avatar-loader",
    );
    await writeFile(tempModulePath, rewrittenSource, "utf8");
    return import(pathToFileURL(tempModulePath).href);
}

test("loadProfileAvatarHelpers returns avatar helpers when the Social UI module is available", async () => {
    const socialModulePath = createTempModulePath(
        "classroom-social-avatar-helpers",
    );
    await writeFile(
        socialModulePath,
        [
            "export function handleProfileAvatarError() {}",
            "export async function hydrateProfileAvatars() {}",
            'export function buildProfileAvatarMarkup() { return "<social-avatar>"; }',
            'export async function fetchProfileAvatarBlobUrl() { return "blob:test"; }',
            "",
        ].join("\n"),
        "utf8",
    );
    const loaderModule = await importLoaderModule(
        pathToFileURL(socialModulePath).href,
    );

    const helpers = await loaderModule.loadProfileAvatarHelpers();
    const markup = loaderModule.buildProfileAvatarMarkup({
        avatarClass: "avatar",
        fallbackClass: "fallback",
        label: "Alice Example",
        colorSeed: "alice",
    });
    const avatarBlobUrl =
        await loaderModule.fetchProfileAvatarBlobUrl("avatar-key");

    assert.equal(typeof helpers.handleProfileAvatarError, "function");
    assert.equal(typeof helpers.hydrateProfileAvatars, "function");
    assert.equal(markup, "<social-avatar>");
    assert.equal(avatarBlobUrl, "blob:test");
});

test("loadProfileAvatarHelpers falls back cleanly when the Social UI module is unavailable", async () => {
    const loaderModule = await importLoaderModule(
        pathToFileURL(
            resolve(tmpdir(), "missing-classroom-social-avatar-helpers.mjs"),
        ).href,
    );
    const originalWarn = console.warn;
    const warnings = [];
    console.warn = (...messageParts) => warnings.push(messageParts);

    try {
        const helpers = await loaderModule.loadProfileAvatarHelpers();
        const markup = loaderModule.buildProfileAvatarMarkup({
            avatarClass: "avatar",
            fallbackClass: "fallback",
            label: "Alice Example",
            colorSeed: "alice",
            profileHandle: "@alice",
        });
        const avatarBlobUrl =
            await loaderModule.fetchProfileAvatarBlobUrl("avatar-key");

        assert.equal(typeof helpers.handleProfileAvatarError, "function");
        assert.equal(typeof helpers.hydrateProfileAvatars, "function");
        assert.equal(avatarBlobUrl, null);
        assert.match(markup, /class="avatar"/);
        assert.match(markup, /class="fallback"/);
        assert.match(markup, /href="\/profile\/alice"/);
        assert.match(markup, />AE</);
        assert.doesNotThrow(() =>
            helpers.handleProfileAvatarError({ target: null }),
        );
        await assert.doesNotReject(() => helpers.hydrateProfileAvatars(null));
        assert.equal(warnings.length, 1);
        assert.match(
            String(warnings[0][0]),
            /Failed to load profile avatar helpers/,
        );
    } finally {
        console.warn = originalWarn;
    }
});
