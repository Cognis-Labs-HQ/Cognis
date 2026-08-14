import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { getLanguageFlagUrl } from "../language-flag.js";

const UI_LANGUAGES = ["de", "en", "id", "ja"];

test("language flags use canonical locale asset URLs", () => {
    assert.equal(getLanguageFlagUrl("DE"), "/static/languages/de/flag.svg");
    assert.equal(getLanguageFlagUrl("invalid/code"), "");
});

test("installed UI language manifests expose SVG flags", () => {
    for (const language of UI_LANGUAGES) {
        const languageDirectory = new URL(
            `../../languages/${language}/`,
            import.meta.url,
        );
        const manifest = readFileSync(
            new URL("manifest.yml", languageDirectory),
            "utf8",
        );
        const flag = readFileSync(
            new URL("flag.svg", languageDirectory),
            "utf8",
        );

        assert.match(
            manifest,
            new RegExp(`flag: /static/languages/${language}/flag\\.svg`),
        );
        assert.match(manifest, /^flag_source: https:\/\//m);
        assert.match(flag, /^<svg\b/);
    }
});
