import test from "node:test";
import assert from "node:assert/strict";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { readFileSync } from "node:fs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");

test("page builder stylesheet defines the shared loading shade and wheel", () => {
    const source = readFileSync(
        resolve(ROOT, "src/ui/styles/page-builder.css"),
        "utf8",
    );

    assert.match(source, /body:not\(\[data-page-ready="true"\]\)::before/);
    assert.match(source, /body:not\(\[data-page-ready="true"\]\)::after/);
    assert.match(source, /\.page-loading-overlay\s*\{/);
    assert.match(source, /\.page-loading-overlay__spinner\s*\{/);
    assert.match(source, /\.page-loading-overlay__message\s*\{/);
    assert.match(source, /body\[data-theme="light"\] \.page-loading-overlay\s*\{/);
    assert.match(
        source,
        /body\[data-theme="light"\] \.page-loading-overlay__spinner\s*\{/,
    );
    assert.match(source, /@keyframes page-loading-wheel/);
    assert.match(source, /prefers-reduced-motion: reduce/);
});

test("loading overlay joke strings exist in all supported core locales", () => {
    const locales = ["en", "de", "id", "ja"];
    const keys = [
        "ui.reuse.loading_joke_1",
        "ui.reuse.loading_joke_2",
        "ui.reuse.loading_joke_3",
        "ui.reuse.loading_joke_4",
    ];

    for (const locale of locales) {
        const stringsSource = readFileSync(
            resolve(ROOT, `src/ui/languages/${locale}/strings.xml`),
            "utf8",
        );
        for (const key of keys) {
            assert.match(
                stringsSource,
                new RegExp(`<string name="${key}">[^<]+<\\/string>`),
                `${locale} strings must define ${key}`,
            );
        }
    }
});

test("page-entry registers refresh lifecycle listeners for loading fallback", () => {
    const source = readFileSync(
        resolve(ROOT, "src/ui/reuse/page-entry.js"),
        "utf8",
    );
    assert.match(source, /window\.addEventListener\(["']beforeunload["']/);
    assert.match(source, /window\.addEventListener\(["']pagehide["']/);
});
