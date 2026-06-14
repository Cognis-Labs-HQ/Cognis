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

function createTempModulePath(prefix) {
    return resolve(
        tmpdir(),
        `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}.mjs`,
    );
}

async function importLoaderModule(replacementModuleUrl) {
    const helperSource = await readFile(HELPER_PATH, "utf8");
    const rewrittenSource = helperSource.replace(
        SOCIAL_HELPER_PATH,
        replacementModuleUrl,
    );
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
            "",
        ].join("\n"),
        "utf8",
    );
    const loaderModule = await importLoaderModule(
        pathToFileURL(socialModulePath).href,
    );

    const helpers = await loaderModule.loadProfileAvatarHelpers();

    assert.equal(typeof helpers.handleProfileAvatarError, "function");
    assert.equal(typeof helpers.hydrateProfileAvatars, "function");
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

        assert.equal(helpers.handleProfileAvatarError, null);
        assert.equal(helpers.hydrateProfileAvatars, null);
        assert.equal(warnings.length, 1);
        assert.match(
            String(warnings[0][0]),
            /Failed to load profile avatar helpers/,
        );
    } finally {
        console.warn = originalWarn;
    }
});
