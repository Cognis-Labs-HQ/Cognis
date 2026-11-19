import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const repository = new URL("../../../", import.meta.url);
const surfaces = new Set([
    "toolbar",
    "content-panel",
    "content-grid",
    "content-section",
    "main-window",
    "composer-cell-content",
    "widget-card",
    "side-menu",
    "side-menu-link",
    "composer-sidebar-section",
]);
function violations(source) {
    const results = [];
    if (/@layer\s+composerSurfaces\b/.test(source))
        results.push("composerSurfaces layer");
    for (const [, selectors, declarations] of source.matchAll(
        /([^{}]+)\{([^{}]*)\}/g,
    )) {
        if (selectors.trim().startsWith("@")) continue;
        for (const selector of selectors.split(",")) {
            const subject = selector
                .trim()
                .split(/[\s>+~]+/)
                .at(-1);
            const classes = [...subject.matchAll(/\.([\w-]+)/g)].map(
                (match) => match[1],
            );
            if (
                classes.some((name) => surfaces.has(name)) &&
                /(?:^|;)\s*(?:background(?:-[\w-]+)?|border(?:-[\w-]+)?|outline(?:-[\w-]+)?|box-shadow|opacity|color|font(?:-[\w-]+)?|backdrop-filter)\s*:/.test(
                    declarations,
                )
            )
                results.push(selector.trim());
        }
        if (/(?:^|;)\s*--toolbar-bg\s*:/.test(declarations))
            results.push("--toolbar-bg");
    }
    return results;
}

test("Composer surface protection distinguishes owned controls from host overrides", () => {
    assert.deepEqual(
        violations(".toolbar .feature-control { color: red; }"),
        [],
    );
    assert.deepEqual(violations(".feature .toolbar { background: red; }"), [
        ".feature .toolbar",
    ]);
    assert.deepEqual(
        violations(
            "@media (width < 900px) { .feature .widget-card { background: red; } }",
        ),
        [".feature .widget-card"],
    );
    assert.deepEqual(violations(".feature { --toolbar-bg: red; }"), [
        "--toolbar-bg",
    ]);
    assert.deepEqual(
        violations("@layer composerSurfaces { .feature { color: red; } }"),
        ["composerSurfaces layer"],
    );
});

test("Core pages and optional components cannot override Composer surfaces", () => {
    const found = [];
    for (const root of ["src/adapters", "src/gateways", "src/ui/app"]) {
        const directory = new URL(root + "/", repository);
        for (const entry of readdirSync(directory, {
            recursive: true,
            withFileTypes: true,
        })) {
            const file = join(entry.parentPath, entry.name);
            if (
                !entry.isFile() ||
                !file.endsWith(".css") ||
                file.includes("/tests/")
            )
                continue;
            for (const selector of violations(readFileSync(file, "utf8")))
                found.push(`${file}: ${selector}`);
        }
    }
    const pages = new URL("src/ui/public/pages/", repository);
    const pageStyles = new Set();
    for (const entry of readdirSync(pages, { withFileTypes: true })) {
        if (!entry.isFile() || !entry.name.endsWith(".html")) continue;
        const html = readFileSync(new URL(entry.name, pages), "utf8");
        for (const [, stylesheet] of html.matchAll(
            /href=["'](\/static\/styles\/[^"']+\.css)["']/g,
        )) {
            if (
                stylesheet === "/static/styles/page-builder.css" ||
                stylesheet.includes("/reuse/")
            )
                continue;
            pageStyles.add(stylesheet);
        }
    }
    for (const stylesheet of pageStyles) {
        const file = new URL(
            "src/ui/" + stylesheet.slice("/static/".length),
            repository,
        );
        for (const selector of violations(readFileSync(file, "utf8")))
            found.push(`${stylesheet}: ${selector}`);
    }
    assert.deepEqual(
        found,
        [],
        "Surface colors and menu presentation belong to Page Composer.",
    );
});
