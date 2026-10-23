import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

test("Flashcard locales provide one nonempty value per key and matching translation catalogs", () => {
    let english;
    for (const language of ["en", "de", "id", "ja"]) {
        const xml = readFileSync(
            new URL(`../ui/languages/${language}/strings.xml`, import.meta.url),
            "utf8",
        );
        const strings = [
            ...xml.matchAll(/<string name="([^"]+)">([^<]*)<\/string>/g),
        ];
        const keys = strings.map(([, key]) => key).sort();
        assert.equal(new Set(keys).size, keys.length, language);
        assert.ok(
            strings.every(([, , value]) => value.trim()),
            language,
        );
        if (language === "en") english = keys;
        else assert.deepEqual(keys, english, language);
    }
});
