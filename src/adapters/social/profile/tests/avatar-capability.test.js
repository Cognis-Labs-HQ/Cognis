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
    assert.match(
        source,
        /ensurePageStylesheet\(\s*"\/static\/adapters\/social\/profile\/availability\.css"/,
    );
    assert.match(source, /await availabilityStylesReady;/);
    assert.match(source, /export async function ensureProfileAvatarStyles/);
    assert.match(source, /profile-capability-avatar-image/);
    assert.match(source, /availabilityIndicatorMarkup\(""\)/);
    const styles = readFileSync(
        resolve(
            process.cwd(),
            "src/adapters/social/profile/ui/availability.css",
        ),
        "utf8",
    );
    assert.match(styles, /\.profile-capability-avatar \{/);
    assert.match(styles, /object-fit: cover/);
});

test("Profile standalone provider waits for avatar styles and contributes its client", () => {
    const provider = readFileSync(
        resolve(process.cwd(), "src/adapters/social/profile/ui/provider.js"),
        "utf8",
    );
    assert.match(provider, /await ensureProfileAvatarStyles\(\)/);
    assert.match(
        provider,
        /capabilities\.contribute\("social:profileUiClient", profileUiClient\)/,
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
