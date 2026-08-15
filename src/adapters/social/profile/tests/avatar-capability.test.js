import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { extname, join, resolve } from "node:path";
import test from "node:test";

function sourceFiles(directory) {
    return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
        const path = join(directory, entry.name);
        if (entry.isDirectory()) {
            return entry.name === "docs" ? [] : sourceFiles(path);
        }
        return [".js", ".ts"].includes(extname(entry.name)) ? [path] : [];
    });
}

test("Profile adapter owns the complete avatar UI capability", () => {
    const source = readFileSync(
        resolve(
            process.cwd(),
            "src/adapters/social/profile/ui/profile-avatar.js",
        ),
        "utf8",
    );
    for (const method of [
        "buildMarkup",
        "fetch",
        "getInitials",
        "getInitialsColor",
        "handleError",
        "hydrate",
        "isUnavailable",
    ]) {
        assert.match(source, new RegExp(`${method}:`));
    }
    assert.match(
        source,
        /uiCtx\.capabilities\.contribute\("ui:profileAvatarRenderer"/,
    );
});

test("UI callers use CTX without a profile abstraction in core reuse", () => {
    const sourceRoot = resolve(process.cwd(), "src");
    const canonicalSource = resolve(
        sourceRoot,
        "adapters/social/profile/ui/profile-avatar.js",
    );
    for (const path of sourceFiles(sourceRoot)) {
        const source = readFileSync(path, "utf8");
        assert.doesNotMatch(
            source,
            /avatar-utils\.js/,
            `profile avatar abstraction leaked outside its adapter: ${path}`,
        );
        if (
            path !== canonicalSource &&
            !path.endsWith("avatar-capability.test.js")
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
