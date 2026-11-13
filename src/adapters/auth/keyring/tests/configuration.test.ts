import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import { createAdapter } from "../index.js";

test("Keyring configuration declares localized labels in its own browser resources", async () => {
    const adapter = createAdapter();
    assert.equal(
        adapter.stringsBaseUrl,
        "/static/adapters/auth/keyring/languages",
    );
    const fields = adapter.getConfigSchema();
    assert.deepEqual(
        fields.map(({ key, type, required }) => ({ key, type, required })),
        [
            { key: "maxVaultMiB", type: "number", required: true },
            { key: "derivationIterations", type: "number", required: true },
        ],
    );
    for (const locale of ["de", "en", "id", "ja"]) {
        const xml = await readFile(
            new URL(`../ui/languages/${locale}/strings.xml`, import.meta.url),
            "utf8",
        );
        for (const field of fields) {
            assert.ok(xml.includes(`name="${field.label}"`));
        }
    }
});
