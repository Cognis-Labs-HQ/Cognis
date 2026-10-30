import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const composerClasses = JSON.parse(
    readFileSync(
        new URL(
            "../../../../ui/styles/protected-classes.json",
            import.meta.url,
        ),
        "utf8",
    ),
);
const shellClasses = [
    "app-page__main",
    "site-header",
    "toolbar",
    "side-menu",
    "side-menu-link",
    "widget-card",
    "btn-confirm",
    "btn-neutral",
    "btn-cancel",
];
test("Study adapter styles do not override composer, shell, or reusable button classes", () => {
    for (const path of ["../ui/flashcards.css"]) {
        const source = readFileSync(new URL(path, import.meta.url), "utf8");
        for (const name of [...composerClasses, ...shellClasses])
            assert.doesNotMatch(
                source,
                new RegExp(`\\.${name}(?![\\w-])`),
                `${path} must not override ${name}`,
            );
    }
});

test("Flashcards loads the same composer stylesheets as Explore and Requests", () => {
    const source = readFileSync(
        new URL("../index.ts", import.meta.url),
        "utf8",
    );
    const stylesheets = source.match(/stylesheets:\s*\[([^\]]+)\]/)?.[1];
    for (const path of [
        "/static/styles/page-builder.css",
        "/static/styles/reuse/page-sections.css",
        "/static/gateways/study/study.css",
    ])
        assert.ok(
            stylesheets?.includes(path),
            `Missing shared page stylesheet: ${path}`,
        );
});
