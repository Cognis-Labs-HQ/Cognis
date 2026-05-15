import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../../../..");

test("auth admin section surfaces managed callback URL metadata and prefills redirectUri", () => {
    const source = readFileSync(
        resolve(ROOT, "src/gateways/auth/ui/admin-section.js"),
        "utf8",
    );

    assert.match(source, /configPayload\.managedRedirectPath/);
    assert.match(
        source,
        /new URL\(managedRedirectPath,\s*window\.location\.origin\)/,
    );
    assert.match(source, /gateway\.auth\.managed_callback\.title/);
    assert.match(source, /gateway\.auth\.managed_callback\.body/);
    assert.match(source, /field\.key === "redirectUri"/);
    assert.match(source, /currentVal = managedRedirectUrl/);
});
