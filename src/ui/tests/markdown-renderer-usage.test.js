import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = process.cwd();

function source(path) {
    return readFileSync(join(ROOT, path), "utf8");
}

test("broadcast topbar keeps its stylesheet across SPA navigation", () => {
    const pluginSource = source(
        "src/gateways/notify/ui/broadcast-navbar-plugin.js",
    );

    assert.match(
        pluginSource,
        /ensurePersistentStylesheet\(CSS_HREF\)/,
        "the shell-level broadcast topbar stylesheet must be persistent",
    );
});

test("user and admin generated rich-text surfaces use the shared markdown renderer", () => {
    const surfaces = [
        {
            label: "messages",
            path: "src/adapters/social/messages/ui/message-render.js",
            patterns: [
                /import \{ renderMarkdown \}/,
                /renderMarkdown\(normalizedText/,
            ],
        },
        {
            label: "profile bios and posts",
            path: "src/adapters/social/profile/ui/profile-render.js",
            patterns: [
                /import \{ renderMarkdown \}/,
                /renderMarkdown\(profile\.bio/,
                /renderMarkdown\(post\.content/,
            ],
        },
        {
            label: "profile preview bios",
            path: "src/adapters/social/profile/ui/profile-preview.js",
            patterns: [
                /import \{ renderMarkdown \}/,
                /renderMarkdown\(profile\.bio/,
            ],
        },
        {
            label: "broadcast bars and popups",
            path: "src/gateways/notify/ui/broadcast-navbar-plugin.js",
            patterns: [
                /import \{ renderMarkdown \}/,
                /renderMarkdown\(broadcast\.message\)/,
            ],
        },
        {
            label: "broadcast administration",
            path: "src/gateways/notify/ui/broadcast-admin-section.js",
            patterns: [
                /import \{ renderMarkdown \}/,
                /renderMarkdown\(broadcast\.message \?\? ""\)/,
            ],
        },
        {
            label: "docs and changelog pages",
            path: "src/ui/reuse/markdown-document.js",
            patterns: [
                /import \{ renderMarkdown \}/,
                /renderMarkdown\(transformedMarkdown\)/,
            ],
        },
        {
            label: "release changelog popup",
            path: "src/ui/layouts/release-changelog/popup.js",
            patterns: [
                /import \{ renderMarkdown \}/,
                /renderMarkdown\(linkShortCommitRefs\(changeHeading\)\)/,
            ],
        },
    ];

    for (const surface of surfaces) {
        const fileSource = source(surface.path);
        for (const pattern of surface.patterns) {
            assert.match(
                fileSource,
                pattern,
                `${surface.label} should render generated content through renderMarkdown`,
            );
        }
    }
});
