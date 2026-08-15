import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { extname, join, resolve } from "node:path";
import test from "node:test";

import {
    buildProfileAvatarMarkup,
    fetchProfileAvatarBlobUrl,
    getInitialsText,
    hydrateProfileAvatars,
    pickInitialsColor,
} from "../avatar-utils.js";
import { uiCtx } from "../ui-ctx.js";

const calls = [];
uiCtx.capabilities.contribute("ui:profileAvatarRenderer", {
    buildMarkup(options) {
        calls.push(["markup", options]);
        return "<span>CTX avatar</span>";
    },
    fetch(avatarKey) {
        calls.push(["fetch", avatarKey]);
        return Promise.resolve("blob:ctx");
    },
    getInitials(label) {
        calls.push(["initials", label]);
        return "CTX";
    },
    getInitialsColor(seed) {
        calls.push(["color", seed]);
        return "profile-color";
    },
    hydrate(container) {
        calls.push(["hydrate", container]);
    },
});

test("avatar utilities delegate every avatar operation to the profile capability", async () => {
    const container = {};
    const options = { label: "Alice Smith" };

    assert.equal(buildProfileAvatarMarkup(options), "<span>CTX avatar</span>");
    assert.equal(await fetchProfileAvatarBlobUrl("avatars/alice"), "blob:ctx");
    assert.equal(getInitialsText("Alice Smith"), "CTX");
    assert.equal(pickInitialsColor("alice"), "profile-color");
    await hydrateProfileAvatars(container);
    assert.deepEqual(calls, [
        ["markup", options],
        ["fetch", "avatars/alice"],
        ["initials", "Alice Smith"],
        ["color", "alice"],
        ["hydrate", container],
    ]);
});

function sourceFiles(directory) {
    return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
        const path = join(directory, entry.name);
        if (entry.isDirectory()) {
            return entry.name === "docs" ? [] : sourceFiles(path);
        }
        return [".js", ".ts"].includes(extname(entry.name)) ? [path] : [];
    });
}

test("UI source contains no legacy avatar provider or competing initials function", () => {
    const sourceRoot = resolve(process.cwd(), "src");
    const canonicalSource = resolve(
        sourceRoot,
        "adapters/social/profile/ui/profile-avatar.js",
    );
    for (const path of sourceFiles(sourceRoot)) {
        const source = readFileSync(path, "utf8");
        assert.doesNotMatch(
            source,
            /\/static\/gateways\/social\/reuse\/profile-avatar\.js/,
            `legacy profile-avatar provider imported by ${path}`,
        );
        if (
            path !== canonicalSource &&
            !path.endsWith("avatar-utils.test.js")
        ) {
            assert.doesNotMatch(
                source,
                /function\s+\w*Initials\s*\(/,
                `competing initials implementation found in ${path}`,
            );
            assert.doesNotMatch(
                source,
                /apiFetch\([^)]*["'`]\/api\/v1\/files\/profile\//,
                `direct profile avatar fetch found in ${path}`,
            );
        }
    }
});
