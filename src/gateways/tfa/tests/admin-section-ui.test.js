import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(fileURLToPath(import.meta.url), "../../../../../");
const SOURCE = readFileSync(
    resolve(ROOT, "src/gateways/tfa/ui/admin-section.js"),
    "utf8",
);

test("tfa admin section uses existing localized keys", () => {
    assert.match(
        SOURCE,
        /ui\.app\.admin\.security\.tfa_enforce_all_users_label/,
    );
    assert.match(
        SOURCE,
        /ui\.app\.admin\.security\.tfa_enforce_all_users_hint/,
    );
    assert.match(SOURCE, /gateway\.tfa\.settings\.section_title/);
    assert.doesNotMatch(SOURCE, /gateway\.tfa\.admin\./);
});
