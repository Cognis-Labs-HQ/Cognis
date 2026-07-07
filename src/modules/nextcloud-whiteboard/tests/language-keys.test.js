import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

const KEY_PATTERN = /^[a-z0-9._-]+$/;
const LOCALES = ["de", "en", "id", "ja"];

test("nextcloud whiteboard module string keys are lowercase ASCII", async () => {
    for (const locale of LOCALES) {
        const filePath = path.join(
            import.meta.dirname,
            "..",
            "ui",
            "languages",
            locale,
            "strings.xml",
        );
        const xml = await readFile(filePath, "utf8");
        const keys = [...xml.matchAll(/<string\s+name="([^"]+)"/g)].map(
            (match) => match[1],
        );
        assert.ok(keys.length > 0, `${locale} should define strings`);
        for (const key of keys) {
            assert.match(key, KEY_PATTERN, `${locale}: ${key}`);
        }
    }
});
