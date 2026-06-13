import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const ROOT = process.cwd();

test("nextcloud whiteboard module exposes admin config popup script", () => {
    const manifest = JSON.parse(
        readFileSync(
            resolve(ROOT, "src/modules/nextcloud-whiteboard/manifest.json"),
            "utf8",
        ),
    );
    assert.equal(
        manifest?.ui?.componentConfig?.scriptUrl,
        "/static/modules/nextcloud-whiteboard/admin-config-popup.js",
    );
});

test("nextcloud whiteboard module registers admin config API routes", () => {
    const source = readFileSync(
        resolve(ROOT, "src/modules/nextcloud-whiteboard/api/index.js"),
        "utf8",
    );
    assert.match(source, /\/api\/v1\/modules\/nextcloud-whiteboard\/config/);
    assert.match(source, /allowWhenDisabled:\s*true/);
    assert.match(source, /nextcloud_whiteboard_module_config/);
});
