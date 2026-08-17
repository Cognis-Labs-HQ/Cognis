import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");

test("module marketplace passes root and options to the page composer", () => {
    const source = readFileSync(
        resolve(ROOT, "src/ui/app/modules/index.js"),
        "utf8",
    );
    assert.match(source, /createPageComposer\(root, \{/);
    assert.match(source, /allowCustomization: false/);
    assert.match(source, /i18n,/);
    assert.match(source, /signal,/);
    assert.match(source, /max: "full"/);
});

test("module marketplace does not resolve repository-relative avatars against the page URL", () => {
    const source = readFileSync(
        resolve(ROOT, "src/ui/app/modules/index.js"),
        "utf8",
    );
    assert.match(source, /const avatarUrl = resolveModuleAssetUrl/);
    assert.match(
        source,
        /if \(candidate\.startsWith\("\/"\)\) return candidate/,
    );
    assert.match(source, /parsed\.protocol === "https:"/);
});

test("module marketplace opens repository readmes in a full detail view", () => {
    const source = readFileSync(
        resolve(ROOT, "src/ui/app/modules/index.js"),
        "utf8",
    );
    assert.match(source, /data-module-uuid/);
    assert.match(source, /renderMarkdown\(module\.readme/);
    assert.match(source, /module-detail-screenshots/);
    assert.match(source, /data-module-back/);
    assert.match(source, /selectedModule = null/);
    assert.match(source, /target\.classList\.contains\("module-store-card"\)/);
    assert.match(source, /data-module-install/);
    assert.match(source, /data-module-enable/);
    assert.match(source, /data-module-disable/);
    assert.match(source, /data-module-uninstall/);
});
